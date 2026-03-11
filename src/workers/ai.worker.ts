/// <reference lib="webworker" />

import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';

export type WorkerRequest = {
  id: string;
  type: 'process-image';
  fileName: string;
  mimeType?: string;
  file: ArrayBuffer;
};

export type WorkerProgress = {
  id: string;
  type: 'progress';
  message: string;
  stage: 'loading' | 'segmenting' | 'refining' | 'packaging';
};

export type WorkerError = {
  id: string;
  type: 'error';
  error: string;
};

export type WorkerResult = {
  id: string;
  type: 'result';
  payload: ProcessedPayload;
};

export type ProcessedPayload = {
  fileName: string;
  width: number;
  height: number;
  maskedImageBuffer: ArrayBuffer;
  bounds: Bounds;
  histogram: Histogram;
};

export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type Histogram = {
  average: [number, number, number];
};

type DedicatedContext = DedicatedWorkerGlobalScope & typeof globalThis;
const ctx = self as DedicatedContext;

const BOUNDS_ALPHA_THRESHOLD = 20;

ctx.addEventListener('error', (event) => {
  const payload = {
    type: 'fatal',
    id: '__system__',
    message: event.message,
    stack: event.error?.stack ?? null,
  };
  console.error('AI worker error', payload);
  ctx.postMessage(payload);
});

ctx.addEventListener('unhandledrejection', (event) => {
  const payload = {
    type: 'fatal',
    id: '__system__',
    message: event.reason?.message ?? String(event.reason),
    stack: event.reason?.stack ?? null,
  };
  console.error('AI worker unhandled rejection', payload);
  ctx.postMessage(payload);
});

ctx.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const { data } = event;
  if (data.type !== 'process-image') return;

  try {
    postProgress(data.id, 'loading', 'Preparing background processing runtime');
    const result = await processFile(data);
    postMessage({ id: data.id, type: 'result', payload: result } satisfies WorkerResult, [result.maskedImageBuffer]);
  } catch (error) {
    const err = error as Error;
    postMessage({ id: data.id, type: 'error', error: err.message } satisfies WorkerError);
  }
});

const processFile = async (request: WorkerRequest): Promise<ProcessedPayload> => {
  const sourceBlob = new Blob([request.file], {
    type: normalizeMimeType(request.mimeType, request.fileName),
  });

  const outputBlob = await imglyRemoveBackground(sourceBlob, {
    progress: (key: string, current: number, total: number) => {
      const normalized = total > 0 ? Math.round((current / total) * 100) : 0;
      const isDownload = key.startsWith('fetch:');
      postProgress(
        request.id,
        isDownload ? 'loading' : 'segmenting',
        isDownload
          ? `Downloading model assets (${normalized}%)`
          : `Running segmentation (${normalized}%)`,
      );
    },
  });

  postProgress(request.id, 'refining', 'Finalizing cutout');

  const sourceFrame = await blobToImageData(sourceBlob);
  const cutoutFrame = await blobToImageData(outputBlob);

  if (sourceFrame.width !== cutoutFrame.width || sourceFrame.height !== cutoutFrame.height) {
    throw new Error('Unexpected output dimensions from background removal library.');
  }

  const alpha = extractAlpha(cutoutFrame);
  const bounds = computeRobustBounds(alpha, cutoutFrame.width, cutoutFrame.height, BOUNDS_ALPHA_THRESHOLD);

  postProgress(request.id, 'packaging', 'Packaging transparent cutout');
  const maskedImageBuffer = await outputBlob.arrayBuffer();

  return {
    fileName: request.fileName,
    width: cutoutFrame.width,
    height: cutoutFrame.height,
    maskedImageBuffer,
    bounds,
    histogram: computeHistogram(sourceFrame),
  };
};

const postProgress = (id: string, stage: WorkerProgress['stage'], message: string) => {
  const payload: WorkerProgress = { id, type: 'progress', stage, message };
  postMessage(payload);
};

const blobToImageData = async (blob: Blob): Promise<ImageData> => {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Unable to create 2D context for decoding image.');
    }

    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
};

const extractAlpha = (image: ImageData) => {
  const total = image.width * image.height;
  const alpha = new Uint8Array(total);
  for (let i = 0; i < total; i += 1) {
    alpha[i] = image.data[4 * i + 3];
  }
  return alpha;
};

const computeBoundsFromAlpha = (alpha: Uint8Array, width: number, height: number, threshold: number): Bounds => {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (alpha[idx] < threshold) continue;
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
};

const computeRobustBounds = (alpha: Uint8Array, width: number, height: number, threshold: number): Bounds => {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const components: Array<{ size: number; minX: number; minY: number; maxX: number; maxY: number }> = [];

  for (let i = 0; i < total; i += 1) {
    if (visited[i] === 1 || alpha[i] < threshold) continue;

    let head = 0;
    let tail = 0;
    queue[tail] = i;
    tail += 1;
    visited[i] = 1;

    let size = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    while (head < tail) {
      const idx = queue[head];
      head += 1;
      size += 1;

      const x = idx % width;
      const y = Math.floor(idx / width);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;

      if (x > 0) {
        const left = idx - 1;
        if (visited[left] === 0 && alpha[left] >= threshold) {
          visited[left] = 1;
          queue[tail] = left;
          tail += 1;
        }
      }

      if (x + 1 < width) {
        const right = idx + 1;
        if (visited[right] === 0 && alpha[right] >= threshold) {
          visited[right] = 1;
          queue[tail] = right;
          tail += 1;
        }
      }

      if (y > 0) {
        const up = idx - width;
        if (visited[up] === 0 && alpha[up] >= threshold) {
          visited[up] = 1;
          queue[tail] = up;
          tail += 1;
        }
      }

      if (y + 1 < height) {
        const down = idx + width;
        if (visited[down] === 0 && alpha[down] >= threshold) {
          visited[down] = 1;
          queue[tail] = down;
          tail += 1;
        }
      }
    }

    components.push({ size, minX, minY, maxX, maxY });
  }

  if (!components.length) {
    return computeBoundsFromAlpha(alpha, width, height, threshold);
  }

  let largest = components[0];
  for (let i = 1; i < components.length; i += 1) {
    if (components[i].size > largest.size) {
      largest = components[i];
    }
  }

  const keepFloor = Math.max(120, Math.floor(largest.size * 0.01));
  const kept = components.filter((component) => component.size >= keepFloor);
  if (!kept.length) {
    return computeBoundsFromAlpha(alpha, width, height, threshold);
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (const component of kept) {
    if (component.minX < minX) minX = component.minX;
    if (component.minY < minY) minY = component.minY;
    if (component.maxX > maxX) maxX = component.maxX;
    if (component.maxY > maxY) maxY = component.maxY;
  }

  return { minX, minY, maxX, maxY };
};

const computeHistogram = (image: ImageData): Histogram => {
  let r = 0;
  let g = 0;
  let b = 0;
  const total = Math.max(image.width * image.height, 1);
  for (let i = 0; i < image.data.length; i += 4) {
    r += image.data[i];
    g += image.data[i + 1];
    b += image.data[i + 2];
  }

  return {
    average: [Math.round(r / total), Math.round(g / total), Math.round(b / total)],
  };
};

const normalizeMimeType = (mimeType: string | undefined, fileName: string) => {
  const normalized = (mimeType ?? '').toLowerCase();
  if (normalized === 'image/jpeg' || normalized === 'image/jpg') return 'image/jpeg';
  if (normalized === 'image/png') return 'image/png';
  if (normalized === 'image/webp') return 'image/webp';

  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';

  return 'image/png';
};

export default null;
