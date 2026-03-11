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
          const pending = this.pending.get(message.id);
          pending?.onProgress?.(message);
          this.listeners.forEach((listener) => listener(message));
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

  public async process(file: File, options?: { onProgress?: RequestProgressCallback }) {
    const worker = this.ensureWorker();
    const id = crypto.randomUUID();
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
}

export const smartWorkerClient = new SmartWorkerClient();
