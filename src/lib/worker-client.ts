import { removeBackground } from '@imgly/background-removal';
import aiWorkerUrl from '@/src/workers/ai.worker?worker&url';
import type {
  ProcessedPayload,
  WorkerError,
  WorkerProgress,
  WorkerRequest,
  WorkerResult,
} from '@/src/workers/ai.worker';

export type ProgressCallback = (progress: WorkerProgress) => void;
type RequestProgressCallback = (progress: WorkerProgress) => void;
type WorkerFatal = {
  id: string;
  type: 'fatal';
  message?: string;
  stack?: string | null;
};
type WorkerMessage = WorkerProgress | WorkerResult | WorkerError | WorkerFatal;

class SmartWorkerClient {
  private worker: Worker | null = null;

  private pending = new Map<
    string,
    {
      resolve: (value: ProcessedPayload) => void;
      reject: (error: Error) => void;
      onProgress?: RequestProgressCallback;
    }
  >();

  private listeners = new Set<ProgressCallback>();

  private emitProgress(progress: WorkerProgress) {
    const pending = this.pending.get(progress.id);
    pending?.onProgress?.(progress);
    this.listeners.forEach((listener) => listener(progress));
  }

  private isFatalMessage(message: unknown): message is WorkerFatal {
    return (
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      (message as { type?: string }).type === 'fatal'
    );
  }

  private resetWorker() {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch (error) {
        console.warn('fix.pictures: unable to terminate worker cleanly', error);
      }
    }
    this.worker = null;
  }

  private rejectAll(error: Error) {
    this.pending.forEach(({ reject }) => reject(error));
    this.pending.clear();
  }

  private hasPending() {
    return this.pending.size > 0;
  }

  private ensureWorker() {
    if (this.worker) return this.worker;
    try {
      this.worker = new Worker(aiWorkerUrl, { type: 'module', name: 'fix-pictures-ai' });
      this.worker.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
        const message = event.data;
        if (this.isFatalMessage(message)) {
          console.error('fix.pictures worker fatal error', message);
          this.rejectAll(new Error(message.message ?? 'AI worker fatal error'));
          this.resetWorker();
          return;
        }
        if (message.type === 'progress') {
          this.emitProgress(message);
          return;
        }

        if (message.type === 'error') {
          const pending = this.pending.get(message.id);
          if (pending) {
            pending.reject(new Error(message.error));
            this.pending.delete(message.id);
          }
          return;
        }

        if (message.type === 'result') {
          const pending = this.pending.get(message.id);
          if (pending) {
            pending.resolve(message.payload);
            this.pending.delete(message.id);
          }
        }
      });
      this.worker.addEventListener('error', (event) => {
        const detail =
          event instanceof ErrorEvent
            ? `${event.message} ${event.filename}:${event.lineno}:${event.colno}`
            : 'type=error';
        console.error('fix.pictures worker crashed', detail, event.error ?? event);
        this.rejectAll(new Error('AI worker crashed'));
        this.resetWorker();
      });
      this.worker.addEventListener('messageerror', (event) => {
        console.error('fix.pictures worker message error', event.data);
        this.rejectAll(new Error('AI worker message error'));
        this.resetWorker();
      });
    } catch (error) {
      console.error('fix.pictures worker bootstrap failed', error);
      throw error;
    }
    return this.worker;
  }

  constructor() {
    // Lazy init
  }

  private async blobToImageData(blob: Blob): Promise<ImageData> {
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Unable to decode processed image.');
      context.drawImage(bitmap, 0, 0);
      return context.getImageData(0, 0, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  }

  private extractAlpha(image: ImageData) {
    const total = image.width * image.height;
    const alpha = new Uint8Array(total);
    for (let i = 0; i < total; i += 1) {
      alpha[i] = image.data[4 * i + 3];
    }
    return alpha;
  }

  private computeBoundsFromAlpha(alpha: Uint8Array, width: number, height: number, threshold: number) {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (alpha[y * width + x] < threshold) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < 0 || maxY < 0) {
      return { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 };
    }
    return { minX, minY, maxX, maxY };
  }

  private computeHistogram(image: ImageData) {
    let r = 0;
    let g = 0;
    let b = 0;
    const total = Math.max(image.width * image.height, 1);
    for (let i = 0; i < image.data.length; i += 4) {
      r += image.data[i];
      g += image.data[i + 1];
      b += image.data[i + 2];
    }
    return { average: [Math.round(r / total), Math.round(g / total), Math.round(b / total)] as [number, number, number] };
  }

  private async buildPayload(file: File, outputBlob: Blob): Promise<ProcessedPayload> {
    const sourceFrame = await this.blobToImageData(file);
    const cutoutFrame = await this.blobToImageData(outputBlob);
    const alpha = this.extractAlpha(cutoutFrame);
    const maskedImageBuffer = await outputBlob.arrayBuffer();

    return {
      fileName: file.name,
      width: cutoutFrame.width,
      height: cutoutFrame.height,
      maskedImageBuffer,
      bounds: this.computeBoundsFromAlpha(alpha, cutoutFrame.width, cutoutFrame.height, 20),
      histogram: this.computeHistogram(sourceFrame),
      wasEdgeEnhanced: false,
      modelUsed: 'gemini-2.0-flash',
    };
  }

  private async tryRemoteImageEdit(file: File, id: string, options?: { onProgress?: RequestProgressCallback }) {
    const progress = (stage: WorkerProgress['stage'], message: string) => {
      const event: WorkerProgress = { id, type: 'progress', stage, message };
      options?.onProgress?.(event);
      this.listeners.forEach((listener) => listener(event));
    };

    progress('loading', 'Uploading source image…');
    const formData = new FormData();
    formData.append('image', file, file.name);

    // Always call the deployed Supabase edge function — dev and prod are identical.
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const url = `${supabaseUrl}/functions/v1/process-image`;

    const { supabase } = await import('@/src/lib/supabase');
    // refreshSession() exchanges the refresh token for a fresh access token,
    // avoiding 401s from stale/expired JWTs. Falls back to the cached session
    // if the user is not logged in (returns null session → throws below).
    const { data: refreshed } = await supabase.auth.refreshSession();
    const userJwt = refreshed.session?.access_token
      ?? (await supabase.auth.getSession()).data.session?.access_token;
    if (!userJwt) throw new Error('Not authenticated');
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${userJwt}`,
      'apikey': anonKey,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[process-image] ${response.status}:`, text);
      if (response.status === 401) throw new Error(`AUTH_ERROR: ${text}`);
      if (response.status === 402) throw new Error('QUOTA_EXCEEDED');
      if (response.status === 503) throw new Error('CAPACITY_REACHED');
      if (response.status >= 500) throw new Error(`SERVER_ERROR:${response.status}`);
      throw new Error(text || `Remote image processing failed (${response.status})`);
    }

    progress('segmenting', 'Running hosted image model…');
    // x-usage-tracked: true means the server already inserted the usage row —
    // the client must NOT insert again to avoid double-counting.
    const usageTrackedByServer = response.headers.get('x-usage-tracked') === 'true';
    const geminiBlob = await response.blob();

    // imgly final pass — Gemini returns a flat image (product on white).
    // Running background removal on it produces a clean transparent cutout,
    // eliminating any residual shadow, gradient, or dirty edge pixels.
    progress('refining', 'Cleaning up background…');
    let outputBlob: Blob;
    try {
      outputBlob = await removeBackground(geminiBlob, {
        progress: (_key: string, current: number, total: number) => {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0;
          progress('refining', `Cleaning up background… ${pct}%`);
        },
      });
    } catch (err) {
      console.warn('[fix.pictures] imgly cleanup failed — using raw Gemini output', err);
      outputBlob = geminiBlob;
    }

    const result = await this.buildPayload(file, outputBlob);
    return { ...result, usageTrackedByServer };
  }

  public async process(file: File, options?: { onProgress?: RequestProgressCallback }) {
    const id = crypto.randomUUID();
    try {
      const result = await this.tryRemoteImageEdit(file, id, options);
      return result;
    } catch (error) {
      const err = error as Error;
      // These errors must surface to the UI — never fall back to local worker
      if (err.message === 'QUOTA_EXCEEDED') throw err;
      if (err.message === 'CAPACITY_REACHED') throw err;
      if (err.message?.startsWith('SERVER_ERROR:')) throw err;
      console.warn('fix.pictures: remote image edit unavailable, falling back to local worker', error);
    }

    const worker = this.ensureWorker();
    const arrayBuffer = await file.arrayBuffer();
    const request: WorkerRequest = {
      id,
      type: 'process-image',
      fileName: file.name,
      mimeType: file.type,
      file: arrayBuffer,
    };

    const promise = new Promise<ProcessedPayload>((resolve, reject) => {
      this.pending.set(id, {
        resolve,
        reject,
        onProgress: options?.onProgress,
      });
    });

    worker.postMessage(request, [arrayBuffer]);
    return promise;
  }

  public subscribe(listener: ProgressCallback) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public cancelCurrent() {
    if (!this.hasPending()) return;
    const error = new Error('Processing cancelled');
    error.name = 'AbortError';
    this.rejectAll(error);
    this.resetWorker();
  }

  public warmup() {
    const worker = this.ensureWorker();
    worker.postMessage({
      id: crypto.randomUUID(),
      type: 'warmup',
    } satisfies WorkerRequest);
  }

  private _imglyWarmedUp = false;

  public warmupImgly() {
    if (this._imglyWarmedUp) return;
    this._imglyWarmedUp = true;
    // Trigger imgly model download by running it on a 1×1 transparent PNG.
    // The browser caches the WASM + model weights so the first real image is instant.
    const pixel = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,11,73,68,65,84,8,215,99,248,15,0,0,1,1,0,5,24,216,78,0,0,0,0,73,69,78,68,174,66,96,130]);
    const blob = new Blob([pixel], { type: 'image/png' });
    removeBackground(blob).catch(() => { /* ignore — warmup only */ });
  }
}

export const smartWorkerClient = new SmartWorkerClient();
