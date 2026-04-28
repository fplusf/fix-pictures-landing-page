/// <reference lib="webworker" />

import { removeBackground } from '@imgly/background-removal';
// import { imageDataToBlob } from '../lib/preprocessing'; // No longer used in worker pipeline

// ─────────────────────────────────────────────────────────────────────────────
// Public types (consumed by worker-client and ImageFixerApp)
// ─────────────────────────────────────────────────────────────────────────────

export type WorkerRequest = {
  id: string;
} & (
  | {
      type: 'process-image';
      fileName: string;
      mimeType?: string;
      file: ArrayBuffer;
    }
  | {
      type: 'warmup';
    }
);

export type ModelId = 'rmbg-1.4' | 'gpt-image-1' | 'gpt-image-2';

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
  wasEdgeEnhanced: boolean;
  modelUsed: ModelId;
  /** True when the Edge Function already inserted the usage row server-side. Client must skip its own insert. */
  usageTrackedByServer?: boolean;
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

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND COMPLEXITY ANALYSIS (diagnostic / logging only)
//
// Corner-pixel analysis is kept for debug logging — it no longer routes
// between models since we run a single pipeline.
// ─────────────────────────────────────────────────────────────────────────────

const COMPLEXITY_THRESHOLD = 0.18;

interface RoutingDecision {
  model: ModelId;
  score: number;
  label: string;
}

const routeModel = (frame: ImageData): RoutingDecision => {
  const { data, width, height } = frame;
  const cornerFrac = 0.12;
  const cSize = Math.round(Math.min(width, height) * cornerFrac);
  const step = 2;

  const samples: [number, number, number][] = [];

  const corners: [number, number][] = [
    [0, 0],
    [width - cSize, 0],
    [0, height - cSize],
    [width - cSize, height - cSize],
  ];

  for (const [ox, oy] of corners) {
    for (let y = oy; y < Math.min(oy + cSize, height); y += step) {
      for (let x = ox; x < Math.min(ox + cSize, width); x += step) {
        const i = (y * width + x) * 4;
        samples.push([data[i], data[i + 1], data[i + 2]]);
      }
    }
  }

  if (samples.length < 20) {
    return { model: 'rmbg-1.4', score: 0, label: 'tiny image → fast model' };
  }

  // Average RGB
  let sumR = 0, sumG = 0, sumB = 0;
  for (const [r, g, b] of samples) { sumR += r; sumG += g; sumB += b; }
  const avgR = sumR / samples.length;
  const avgG = sumG / samples.length;
  const avgB = sumB / samples.length;
  const avgBrightness = (avgR + avgG + avgB) / 3;

  // HSV saturation per sample
  let sumSat = 0;
  for (const [r, g, b] of samples) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    sumSat += max === 0 ? 0 : (max - min) / max;
  }
  const avgSat = sumSat / samples.length;

  // RMS colour variance (how busy/textured the background is)
  let sumVar = 0;
  for (const [r, g, b] of samples) {
    const dr = r - avgR, dg = g - avgG, db = b - avgB;
    sumVar += (dr * dr + dg * dg + db * db) / 3;
  }
  const rmsVar = Math.sqrt(sumVar / samples.length) / 255;

  // Darkness  (dark backgrounds confuse RMBG-1.4)
  const darkness = 1 - avgBrightness / 255;

  // Weighted complexity score
  const score = avgSat * 0.45 + rmsVar * 0.35 + darkness * 0.20;

  const label = score > COMPLEXITY_THRESHOLD
    ? `complex bg — sat:${avgSat.toFixed(2)} var:${rmsVar.toFixed(2)} dark:${darkness.toFixed(2)}`
    : `simple bg — bright:${avgBrightness.toFixed(0)} sat:${avgSat.toFixed(2)}`;

  return { model: 'rmbg-1.4' as ModelId, score, label };
};

// ─────────────────────────────────────────────────────────────────────────────
// RMBG-1.4  (@imgly/background-removal)
// Fast model — model weights loaded from the @imgly CDN, cached by browser.
// ─────────────────────────────────────────────────────────────────────────────

const runRmbg14 = async (id: string, inputBlob: Blob): Promise<Blob> => {
  return removeBackground(inputBlob, {
    progress: (_key: string, current: number, total: number) => {
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      postProgress(id, 'segmenting', `Segmenting [fast model]… ${pct}%`);
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// RMBG-1.4 via @huggingface/transformers (primary high-quality path)
//
// Uses briaai/RMBG-1.4 directly — the same model as @imgly/background-removal
// but with our own post-processing pipeline (sigmoid → min-max normalise →
// sigmoid sharpening). This gives us full control over mask quality.
//
// Why not RMBG-2.0?
//   All available RMBG-2.0 ONNX exports are 350–977 MB, which OOMs in every
//   browser WASM runtime (confirmed across webgpu + wasm). There is no public,
//   auth-free, browser-compatible RMBG-2.0 export at this time.
//
// Model: briaai/RMBG-1.4  (public, no auth required)
//   onnx/model_quantized.onnx  42 MB   ← default (fast, great quality)
//   onnx/model_fp16.onnx       84 MB   ← fp16 fallback
//   onnx/model.onnx           168 MB   ← fp32 last resort
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _hfModel: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _hfProcessor: any = null;
// Singleton promise — prevents concurrent load attempts
let _hfModelLoading: Promise<void> | null = null;

const MODEL_ID = 'briaai/RMBG-1.4';

const ensureHfModel = async (id: string) => {
  if (_hfModel) return;
  if (_hfModelLoading) return _hfModelLoading;

  _hfModelLoading = (async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { AutoModel, AutoProcessor, env } = await import('@huggingface/transformers') as any;

    // Dedicated worker — no WASM proxy thread needed
    env.backends.onnx.wasm.proxy = false;
    env.backends.onnx.wasm.numThreads = 1;

    postProgress(id, 'loading', 'Setting up local AI engine…');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const progressCb = (p: any) => {
      if (p.status === 'progress' && p.total > 0) {
        const pct = Math.round((p.loaded / p.total) * 100);
        postProgress(id, 'loading', `Downloading AI model… ${pct}%`);
      }
    };

    // briaai/RMBG-1.4 ships: model_fp16.onnx (84MB) and model.onnx (168MB).
    // dtype:'fp16' → model_fp16.onnx (confirmed working in browser WASM).
    // dtype:'fp32' → model.onnx (168MB, last resort).
    // Note: 'quantized' is not a valid dtype key in transformers.js v3;
    //        the file model_quantized.onnx can't be addressed this way.
    const attempts = [
      { device: 'wasm', dtype: 'fp16' },
      { device: 'wasm', dtype: 'fp32' },
    ] as const;

    let lastErr: unknown;
    for (const { device, dtype } of attempts) {
      try {
        const [model, processor] = await Promise.all([
          AutoModel.from_pretrained(MODEL_ID, { device, dtype, progress_callback: progressCb }),
          AutoProcessor.from_pretrained(MODEL_ID),
        ]);
        _hfModel = model;
        _hfProcessor = processor;
        console.info(`[fix.pictures] HF model loaded (${MODEL_ID} device=${device} dtype=${dtype})`);
        return;
      } catch (err) {
        _hfModel = null;
        _hfProcessor = null;
        lastErr = err;
        const e = err as Error;
        console.warn(`[fix.pictures] HF model attempt (device=${device} dtype=${dtype}) failed:`, e?.message ?? String(err));
      }
    }

    throw lastErr;
  })().finally(() => {
    _hfModelLoading = null;
  });

  return _hfModelLoading;
};

const runHfModel = async (id: string, inputBlob: Blob): Promise<Blob> => {
  const { RawImage } = await import('@huggingface/transformers');
  await ensureHfModel(id);

  postProgress(id, 'segmenting', 'Segmenting [high-quality model]…');

  const image = await RawImage.fromBlob(inputBlob);
  const inputs = await _hfProcessor(image);
  const { output } = await _hfModel(inputs);

  // RMBG-1.4 outputs raw logits → sigmoid → min-max normalise → uint8 mask.
  // Without normalisation, low-confidence pixels produce washed-out alpha.
  const rawTensor = output[0].squeeze();
  const probTensor = rawTensor.sigmoid();
  const floatData = probTensor.data as Float32Array;

  let min = Infinity, max = -Infinity;
  for (let i = 0; i < floatData.length; i++) {
    if (floatData[i] < min) min = floatData[i];
    if (floatData[i] > max) max = floatData[i];
  }
  const range = max - min;

  const uint8 = new Uint8Array(floatData.length);
  if (range > 0) {
    const SIGMOID_K = 10;
    for (let i = 0; i < floatData.length; i++) {
      const normalized = (floatData[i] - min) / range;
      // Sigmoid sharpening — pushes mid-confidence pixels toward 0 or 1
      const sharpened = 1 / (1 + Math.exp(-SIGMOID_K * (normalized - 0.5)));
      uint8[i] = Math.round(sharpened * 255);
    }
  }

  const [H, W] = rawTensor.dims.slice(-2) as [number, number];
  const maskImage = new RawImage(uint8, W, H, 1);
  const resized = await maskImage.resize(image.width, image.height);

  const canvas = new OffscreenCanvas(image.width, image.height);
  const canvasCtx = canvas.getContext('2d', { willReadFrequently: true });
  if (!canvasCtx) throw new Error('OffscreenCanvas 2D context unavailable');
  canvasCtx.drawImage(await createImageBitmap(inputBlob), 0, 0);
  const imageData = canvasCtx.getImageData(0, 0, image.width, image.height);
  const maskArr = resized.data as Uint8Array;
  for (let i = 0; i < maskArr.length; i++) {
    imageData.data[i * 4 + 3] = maskArr[i];
  }
  canvasCtx.putImageData(imageData, 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
};

// ─────────────────────────────────────────────────────────────────────────────
// Error handlers
// ─────────────────────────────────────────────────────────────────────────────

ctx.addEventListener('error', (event) => {
  const payload = { type: 'fatal', id: '__system__', message: event.message, stack: event.error?.stack ?? null };
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

// ─────────────────────────────────────────────────────────────────────────────
// Message handler
// ─────────────────────────────────────────────────────────────────────────────

let _warmupStarted = false;

ctx.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const { data } = event;

  if (data.type === 'warmup') {
    // Deduplicate: React StrictMode (and any other double-invoke) sends warmup twice.
    // The singleton promise in ensureRmbg20Model handles concurrent loads, but both
    // callers would still catch and log the same failure. Guard here so only the
    // first warmup message proceeds; subsequent ones are silent no-ops.
    if (_warmupStarted) return;
    _warmupStarted = true;
    try {
      await ensureHfModel(data.id);
      postProgress(data.id, 'loading', 'AI model ready.');
    } catch (error) {
      // Warm-up failure is non-fatal — imgly fallback handles it on first image.
      console.debug('[fix.pictures] HF model warm-up failed — will fall back to imgly', error);
    }
    return;
  }

  if (data.type !== 'process-image') return;

  try {
    postProgress(data.id, 'loading', 'Analysing image…');
    const result = await processFile(data);
    postMessage(
      { id: data.id, type: 'result', payload: result } satisfies WorkerResult,
      [result.maskedImageBuffer],
    );
  } catch (error) {
    const err = error as Error;
    postMessage({ id: data.id, type: 'error', error: err.message } satisfies WorkerError);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Core processing pipeline
// ─────────────────────────────────────────────────────────────────────────────

const processFile = async (request: Extract<WorkerRequest, { type: 'process-image' }>): Promise<ProcessedPayload> => {
  const mimeType = normalizeMimeType(request.mimeType, request.fileName);
  const sourceBlob = new Blob([request.file], { type: mimeType });

  // Decode source for analysis
  const sourceFrame = await blobToImageData(sourceBlob);

  // ── Step 1: Log background complexity (diagnostic only) ───────────────────
  // routeModel analysis is kept for debugging — it no longer gates model choice.
  const bgAnalysis = routeModel(sourceFrame);
  console.debug(
    `[fix.pictures] bg analysis — score:${bgAnalysis.score.toFixed(3)} (${bgAnalysis.label})`,
  );

  const aiInputBlob = sourceBlob;

  // ── Step 3: Segmentation ───────────────────────────────────────────────────
  // Primary: briaai/RMBG-1.4 via transformers.js with our own post-processing.
  // Fallback: @imgly/background-removal (same model, different pipeline).
  postProgress(request.id, 'segmenting', 'Running background removal…');

  let outputBlob: Blob;
  let modelUsed: ModelId;

  try {
    outputBlob = await runHfModel(request.id, aiInputBlob);
    modelUsed = 'rmbg-1.4';
  } catch (err) {
    const e = err as Error;
    console.warn('[fix.pictures] HF model failed — falling back to imgly', e?.message ?? String(err));
    postProgress(request.id, 'segmenting', 'Switching to fallback engine…');
    outputBlob = await runRmbg14(request.id, aiInputBlob);
    modelUsed = 'rmbg-1.4';
  }

  // ── Step 4: Refine + package ────────────────────────────────────────────────
  postProgress(request.id, 'refining', 'Finalising cutout…');

  const cutoutFrame = await blobToImageData(outputBlob);
  const alpha = extractAlpha(cutoutFrame);
  const bounds = computeRobustBounds(alpha, cutoutFrame.width, cutoutFrame.height, BOUNDS_ALPHA_THRESHOLD);

  postProgress(request.id, 'packaging', 'Building compliance canvas…');
  const maskedImageBuffer = await outputBlob.arrayBuffer();

  return {
    fileName: request.fileName,
    width: cutoutFrame.width,
    height: cutoutFrame.height,
    maskedImageBuffer,
    bounds,
    histogram: computeHistogram(sourceFrame),
    wasEdgeEnhanced: false,
    modelUsed,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const postProgress = (id: string, stage: WorkerProgress['stage'], message: string) => {
  postMessage({ id, type: 'progress', stage, message } satisfies WorkerProgress);
};

const blobToImageData = async (blob: Blob): Promise<ImageData> => {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Unable to create 2D context for decoding image.');
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
};

const extractAlpha = (image: ImageData) => {
  const total = image.width * image.height;
  const alpha = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    alpha[i] = image.data[4 * i + 3];
  }
  return alpha;
};

const computeBoundsFromAlpha = (alpha: Uint8Array, width: number, height: number, threshold: number): Bounds => {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alpha[y * width + x] < threshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0 || maxY < 0) return { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 };
  return { minX, minY, maxX, maxY };
};

const computeRobustBounds = (alpha: Uint8Array, width: number, height: number, threshold: number): Bounds => {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const components: Array<{ size: number; minX: number; minY: number; maxX: number; maxY: number }> = [];

  for (let i = 0; i < total; i++) {
    if (visited[i] === 1 || alpha[i] < threshold) continue;

    let head = 0, tail = 0;
    queue[tail++] = i;
    visited[i] = 1;
    let size = 0, minX = width, minY = height, maxX = -1, maxY = -1;

    while (head < tail) {
      const idx = queue[head++];
      size++;
      const x = idx % width, y = Math.floor(idx / width);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      const neighbours = [
        x > 0 ? idx - 1 : -1,
        x + 1 < width ? idx + 1 : -1,
        y > 0 ? idx - width : -1,
        y + 1 < height ? idx + width : -1,
      ];
      for (const n of neighbours) {
        if (n >= 0 && visited[n] === 0 && alpha[n] >= threshold) {
          visited[n] = 1;
          queue[tail++] = n;
        }
      }
    }
    components.push({ size, minX, minY, maxX, maxY });
  }

  if (!components.length) return computeBoundsFromAlpha(alpha, width, height, threshold);

  let largest = components[0];
  for (let i = 1; i < components.length; i++) {
    if (components[i].size > largest.size) largest = components[i];
  }

  const mediumAttachmentLimit = Math.max(250, Math.floor(largest.size * 0.35));
  const kept = components.filter((c) => c.size >= mediumAttachmentLimit);
  if (!kept.length) return computeBoundsFromAlpha(alpha, width, height, threshold);

  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (const c of kept) {
    if (c.minX < minX) minX = c.minX;
    if (c.minY < minY) minY = c.minY;
    if (c.maxX > maxX) maxX = c.maxX;
    if (c.maxY > maxY) maxY = c.maxY;
  }
  return { minX, minY, maxX, maxY };
};

const computeHistogram = (image: ImageData): Histogram => {
  let r = 0, g = 0, b = 0;
  const total = Math.max(image.width * image.height, 1);
  for (let i = 0; i < image.data.length; i += 4) {
    r += image.data[i];
    g += image.data[i + 1];
    b += image.data[i + 2];
  }
  return { average: [Math.round(r / total), Math.round(g / total), Math.round(b / total)] };
};

const normalizeMimeType = (mimeType: string | undefined, fileName: string) => {
  const n = (mimeType ?? '').toLowerCase();
  if (n === 'image/jpeg' || n === 'image/jpg') return 'image/jpeg';
  if (n === 'image/png') return 'image/png';
  if (n === 'image/webp') return 'image/webp';
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/png';
};

export default null;
