/// <reference lib="webworker" />

import { removeBackground } from '@imgly/background-removal';
import { needsEdgeEnhancement, applyEdgeEnhancement, imageDataToBlob } from '../lib/preprocessing';

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

export type ModelId = 'rmbg-1.4' | 'rmbg-2.0';

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
// MODEL ROUTING STRATEGY
// ─────────────────────────────────────────────────────────────────────────────
//
// RMBG-1.4  (@imgly/background-removal) — fast, ~40 MB one-time download
//   ✅ Products on white / very light backgrounds
//   ✅ Clean, studio-style shots
//   ✅ Batch-processing many images quickly
//   ✅ White-on-white products (edge enhancement kicks in)
//
// RMBG-2.0  (@huggingface/transformers) — accurate, ~200 MB one-time download
//   ✅ Complex, colourful, or dark backgrounds
//   ✅ Gradient / lifestyle / lifestyle-on-set backgrounds
//   ✅ Products with fine detail: jewellery, fabric weave, watch straps
//   ✅ Transparent / reflective surfaces: glass bottles, acrylic, crystal
//   ✅ Products where RMBG-1.4 leaves visible halos or edge artefacts
//
// DETECTION: We sample the four corner regions (proxy for background) and
// compute three signals:
//   • saturation  — colourful bg → harder for RMBG-1.4
//   • rms-variance — busy / textured bg → harder for RMBG-1.4
//   • darkness    — dark bg → harder for RMBG-1.4
// A weighted score above COMPLEXITY_THRESHOLD routes to RMBG-2.0.
// ─────────────────────────────────────────────────────────────────────────────

const COMPLEXITY_THRESHOLD = 0.18; // bias toward quality for ambiguous cases

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

  if (score > COMPLEXITY_THRESHOLD) {
    return {
      model: 'rmbg-2.0',
      score,
      label: `complex bg — sat:${avgSat.toFixed(2)} var:${rmsVar.toFixed(2)} dark:${darkness.toFixed(2)}`,
    };
  }

  return {
    model: 'rmbg-1.4',
    score,
    label: `simple bg — bright:${avgBrightness.toFixed(0)} sat:${avgSat.toFixed(2)}`,
  };
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
// RMBG-2.0  (@huggingface/transformers)
// High-quality model — loaded lazily and cached for the worker's lifetime.
// Model weights are downloaded once from HuggingFace Hub (~200 MB) then
// stored in the browser cache permanently.
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _hfModel: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _hfProcessor: any = null;

const ensureRmbg20Model = async (id: string) => {
  if (_hfModel) return;

  // Lazy-load transformers.js
  const { AutoModel, AutoProcessor, env } = await import('@huggingface/transformers');

  // Already in a dedicated worker — disable the WASM proxy thread
  (env as any).backends.onnx.wasm.proxy = false;

  postProgress(id, 'loading', 'Setting up local AI engine (first use, cached for speed)…');

  // fp16 keeps the download size manageable while preserving quality
  _hfModel = await AutoModel.from_pretrained('briaai/RMBG-2.0', {
    dtype: 'fp16',
    progress_callback: (p: any) => {
      if (p.status === 'progress' && p.total > 0) {
        const pct = Math.round((p.loaded / p.total) * 100);
        postProgress(id, 'loading', `Preparing local AI engine… ${pct}%`);
      }
    },
  });
  _hfProcessor = await AutoProcessor.from_pretrained('briaai/RMBG-2.0');
}

const runRmbg20 = async (id: string, inputBlob: Blob): Promise<Blob> => {
  const { RawImage } = await import('@huggingface/transformers');
  await ensureRmbg20Model(id);

  postProgress(id, 'segmenting', 'Segmenting [high-quality model]…');

  const image = await RawImage.fromBlob(inputBlob);
  const inputs = await _hfProcessor(image);
  const { output } = await _hfModel(inputs);

  // ── Post-processing — matches HuggingFace reference implementation ─────────
  //
  // The model outputs raw logit-like values. The HF pipeline does two steps
  // that we must replicate to get the same sharp, clean masks:
  //
  //   1. Sigmoid  — squash any out-of-range logits into [0, 1]
  //   2. Normalize — (v - min) / (max - min)
  //      Raw outputs sit in a compressed range e.g. [0.12, 0.88].
  //      Without this step the mask is flat/grey and edges are mushy.
  //      Stretching to the full [0, 1] range makes background → 0 and
  //      foreground → 1 with maximum contrast at the boundary.
  //
  // Reference (Python): pred = (pred - pred.min()) / (pred.max() - pred.min())

  // output[0] shape: [1, 1, H_model, W_model]
  const rawTensor = output[0].squeeze(); // → [H_model, W_model]

  // Step 1 — sigmoid (safe even if model already applied it; idempotent near 0/1)
  const probTensor = rawTensor.sigmoid();

  // Step 2 — normalize: scan the float data, find min/max, stretch to [0, 1]
  const floatData = probTensor.data as Float32Array;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < floatData.length; i++) {
    if (floatData[i] < min) min = floatData[i];
    if (floatData[i] > max) max = floatData[i];
  }
  const range = max - min;

  // Step 3 — sigmoid sharpening curve (critical for compositing on white)
  //
  // Pure min/max normalization maps mid-confidence pixels (hands, skin tones
  // against complex backgrounds) to fractional alpha values like 0.6–0.8.
  // When composited on a white canvas those pixels appear washed out / ghosted.
  //
  // A sigmoid curve centred at 0.5 with steepness k pushes confident foreground
  // toward fully opaque and background toward fully transparent while preserving
  // soft transitions at genuine edges (fine hair, glass, fabric weave).
  //
  //   k = 10  →  0.3 ≈ 7%,  0.4 ≈ 27%,  0.5 = 50%,  0.6 ≈ 73%,  0.7 ≈ 93%
  //
  const SIGMOID_K = 10;
  const uint8 = new Uint8Array(floatData.length);
  if (range > 0) {
    for (let i = 0; i < floatData.length; i++) {
      const normalized = (floatData[i] - min) / range;           // [0, 1]
      const sharpened  = 1 / (1 + Math.exp(-SIGMOID_K * (normalized - 0.5))); // [0, 1]
      uint8[i] = Math.round(sharpened * 255);
    }
  }

  // Build a single-channel RawImage from the sharpened uint8 data,
  // then resize to the original image dimensions.
  const [H, W] = rawTensor.dims.slice(-2) as [number, number];
  const maskImage = new RawImage(uint8, W, H, 1);
  const resized = await maskImage.resize(image.width, image.height);

  // Apply alpha — soft values near edges are kept intact so genuine
  // semi-transparent surfaces (glass, mesh, crystals) stay natural.
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

ctx.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const { data } = event;

  if (data.type === 'warmup') {
    try {
      await ensureRmbg20Model(data.id);
      postProgress(data.id, 'loading', 'RMBG-2.0 model is ready.');
    } catch (error) {
      const err = error as Error;
      console.warn('[fix.pictures] Warm-up failed — model will load on demand', err);
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

  // ── Step 2: Preprocessing — edge enhancement for white-on-white products ───
  const needsEnhancement = needsEdgeEnhancement(sourceFrame);
  let aiInputBlob = sourceBlob;
  if (needsEnhancement) {
    postProgress(request.id, 'loading', 'Enhancing edges for white-on-white detection…');
    const enhanced = applyEdgeEnhancement(sourceFrame);
    aiInputBlob = await imageDataToBlob(enhanced);
  }

  // ── Step 3: Segmentation ───────────────────────────────────────────────────
  // RMBG-2.0 always runs first — it produces better results for all image types.
  // RMBG-1.4 (imgly) is the fallback if 2.0 fails (model load error, OOM, etc.)
  postProgress(request.id, 'segmenting', 'Running RMBG-2.0 (high quality)…');

  let outputBlob: Blob;
  let modelUsed: ModelId;

  try {
    outputBlob = await runRmbg20(request.id, aiInputBlob);
    modelUsed = 'rmbg-2.0';
  } catch (err) {
    console.warn('[fix.pictures] RMBG-2.0 failed — falling back to RMBG-1.4', err);
    postProgress(request.id, 'segmenting', 'Falling back to RMBG-1.4…');
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
    wasEdgeEnhanced: needsEnhancement,
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

  const keepFloor = Math.max(120, Math.floor(largest.size * 0.01));
  const kept = components.filter((c) => c.size >= keepFloor);
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
