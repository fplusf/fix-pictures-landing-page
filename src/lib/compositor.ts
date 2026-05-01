import { CANVAS_SIZE, TARGET_SCALE } from '@/src/lib/constants';
import type { Bounds, ProcessedPayload } from '@/src/workers/ai.worker';
import { embedProcessedMetadata } from '@/src/lib/exif-metadata';

export type ShadowMode = 'auto' | 'off';

export interface CompositorOptions {
  shadowMode: ShadowMode;
  shadowIntensity: number; // 0-100
  quality?: number; // 0-1
  wasEdgeEnhanced?: boolean; // Skip aggressive cleanup for white-on-white
}

export interface CompositorMetrics {
  scaleRatio: number;
  resolution: number;
  backgroundHex: string;
  grounded: boolean;
  shadowApplied: boolean;
  shadowOpacity: number;
  compliance: ComplianceDiagnostics;
}

export interface ComplianceDiagnostics {
  keptComponents: number;
  removedSecondaryComponents: number;
  removedHumanLikeRegions: number;
  removedOverlayRegions: number;
  productAreaRatio: number;
  suitableForMainListing: boolean;
  notices: string[];
}

export interface CompositorResult {
  outputFileName: string;
  previewDataUrl: string;
  blob: Blob;
  metrics: CompositorMetrics;
}

const BACKGROUND_HEX = '#FFFFFF';
const MAX_FRAME_WIDTH_RATIO = 0.92;
const MIN_MARGIN_RATIO = 0.04;
const TARGET_VERTICAL_OFFSET_RATIO = 0.03;
const FOREGROUND_ALPHA_THRESHOLD = 20;
const PRODUCT_DOMINANCE_THRESHOLD = 0.35;

export const composeCompliantImage = async (
  payload: ProcessedPayload,
  options: CompositorOptions,
): Promise<CompositorResult> => {
  const quality = clamp(options.quality ?? 0.9, 0.1, 1);
  const objectUrl = URL.createObjectURL(new Blob([payload.maskedImageBuffer], { type: 'image/png' }));

  try {
    const image = await loadImage(objectUrl);
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = image.width;
    sourceCanvas.height = image.height;
    const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!sourceContext) {
      throw new Error('Unable to create source context for compliance cleanup.');
    }
    sourceContext.drawImage(image, 0, 0);
    const sourceFrame = sourceContext.getImageData(0, 0, image.width, image.height);
    const complianceRefinement = refineForegroundForCompliance(sourceFrame);
    sourceContext.putImageData(complianceRefinement.image, 0, 0);

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to create canvas context for compositing.');
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.fillStyle = BACKGROUND_HEX;
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const bbox = normalizeBounds(complianceRefinement.bounds, image.width, image.height);
    const bboxWidth = Math.max(bbox.maxX - bbox.minX + 1, 1);
    const bboxHeight = Math.max(bbox.maxY - bbox.minY + 1, 1);
    const targetHeight = CANVAS_SIZE * TARGET_SCALE;
    const maxWidth = CANVAS_SIZE * MAX_FRAME_WIDTH_RATIO;
    const scaleByHeight = targetHeight / bboxHeight;
    const scaleByWidth = maxWidth / bboxWidth;
    const scale = Math.min(scaleByHeight, scaleByWidth);

    // Use pixel centroid (center of mass) instead of bounding-box center.
    // For asymmetric products (mugs with handles, items with thin protrusions)
    // the bbox center drifts toward the sparse handle side, making the heavy
    // product body look off-center. Centroid anchors to the visual mass.
    const centroid = computeForegroundCentroid(complianceRefinement.image);
    const sourceCenterX = centroid.x;
    const sourceCenterY = centroid.y;
    const targetCenterX = CANVAS_SIZE / 2;
    const targetCenterY = CANVAS_SIZE / 2 + CANVAS_SIZE * TARGET_VERTICAL_OFFSET_RATIO;
    let left = targetCenterX - sourceCenterX * scale;
    let top = targetCenterY - sourceCenterY * scale;

    const minMargin = CANVAS_SIZE * MIN_MARGIN_RATIO;
    let bboxLeft = left + bbox.minX * scale;
    let bboxTop = top + bbox.minY * scale;
    let bboxRight = left + (bbox.maxX + 1) * scale;
    let bboxBottom = top + (bbox.maxY + 1) * scale;

    if (bboxLeft < minMargin) {
      const delta = minMargin - bboxLeft;
      left += delta;
      bboxLeft += delta;
      bboxRight += delta;
    }
    if (bboxRight > CANVAS_SIZE - minMargin) {
      const delta = bboxRight - (CANVAS_SIZE - minMargin);
      left -= delta;
      bboxLeft -= delta;
      bboxRight -= delta;
    }
    if (bboxTop < minMargin) {
      const delta = minMargin - bboxTop;
      top += delta;
      bboxTop += delta;
      bboxBottom += delta;
    }
    if (bboxBottom > CANVAS_SIZE - minMargin) {
      const delta = bboxBottom - (CANVAS_SIZE - minMargin);
      top -= delta;
      bboxTop -= delta;
      bboxBottom -= delta;
    }

    const scaledBboxHeight = bboxHeight * scale;

    // Shadow drawing disabled — fully rely on the AI model output.
    // gpt-image-2 handles background removal cleanly; our contact-shadow
    // logic was adding an unwanted fake shadow on flat-based products.
    // Kept for reference but not called.
    const shouldApplyShadow = false;
    const shadowOpacity = 0;
    void options.shadowMode; // suppress unused-var lint

    context.drawImage(sourceCanvas, left, top, image.width * scale, image.height * scale);

    // Pass 1 — Near-white → pure white.
    // Eliminates shadow gradients and off-white bleed without touching the product
    // (product pixels always have meaningful colour below the 245 threshold).
    const frame = context.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const px = frame.data;
    const W = CANVAS_SIZE;
    const NEAR_WHITE = 245;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i] >= NEAR_WHITE && px[i + 1] >= NEAR_WHITE && px[i + 2] >= NEAR_WHITE) {
        px[i] = 255; px[i + 1] = 255; px[i + 2] = 255;
      }
    }

    // Pass 2 — Isolated dark speck removal.
    // After whitening, any non-white pixel that has only white neighbours within a
    // 3-pixel radius is an isolated artifact dot (masking residue, JPEG halo).
    // We check the 8 immediate neighbours; if ≥ 7 of 8 are pure white, zap it.
    const total2 = W * W;
    const toWhite = new Uint8Array(total2); // marks pixels to clear
    for (let y = 1; y < W - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const idx = (y * W + x) * 4;
        if (px[idx] === 255 && px[idx + 1] === 255 && px[idx + 2] === 255) continue; // already white
        let whiteNeighbours = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ni = ((y + dy) * W + (x + dx)) * 4;
            if (px[ni] === 255 && px[ni + 1] === 255 && px[ni + 2] === 255) whiteNeighbours++;
          }
        }
        if (whiteNeighbours >= 7) toWhite[y * W + x] = 1;
      }
    }
    for (let i = 0; i < total2; i++) {
      if (toWhite[i]) {
        const idx = i * 4;
        px[idx] = 255; px[idx + 1] = 255; px[idx + 2] = 255;
      }
    }

    context.putImageData(frame, 0, 0);

    const rawBlob = await canvasToBlob(canvas, quality);
    const blob = await embedProcessedMetadata(rawBlob);
    const previewDataUrl = canvas.toDataURL('image/jpeg', quality);

    return {
      outputFileName: buildOutputName(payload.fileName),
      previewDataUrl,
      blob,
      metrics: {
        scaleRatio: scaledBboxHeight / CANVAS_SIZE,
        resolution: CANVAS_SIZE,
        backgroundHex: BACKGROUND_HEX,
        grounded: false,
        shadowApplied: shouldApplyShadow,
        shadowOpacity,
        compliance: complianceRefinement.diagnostics,
      },
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

interface ForegroundComponent {
  id: number;
  area: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
  touchesEdge: boolean;
  touchesLeft: boolean;
  touchesRight: boolean;
  touchesTop: boolean;
  touchesBottom: boolean;
}

interface ComponentAnalysis {
  labels: Int32Array;
  components: ForegroundComponent[];
}

// Unused visual stats types removed

interface ForegroundRefinementResult {
  image: ImageData;
  bounds: Bounds;
  diagnostics: ComplianceDiagnostics;
}

// Returns true when every pixel has alpha ≥ 200 (JPEG or opaque PNG — no real transparency).
const isImageFullyOpaque = (data: Uint8ClampedArray, total: number): boolean => {
  for (let i = 0; i < total; i++) {
    if (data[i * 4 + 3] < 200) return false;
  }
  return true;
};

// For opaque images (no alpha channel): flood-fill from white corners to mark background,
// then invert to get the foreground mask. Handles any white/near-white background image.
const buildForegroundMaskFromWhiteBackground = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array => {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0, tail = 0;

  const isBgCandidate = (i: number): boolean => {
    const off = i * 4;
    return data[off] >= 220 && data[off + 1] >= 220 && data[off + 2] >= 220;
  };

  const enqueue = (i: number) => {
    if (i < 0 || i >= total || visited[i] || !isBgCandidate(i)) return;
    visited[i] = 1;
    queue[tail++] = i;
  };

  for (let x = 0; x < width; x++) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const i = queue[head++];
    const x = i % width, y = Math.floor(i / width);
    if (x > 0) enqueue(i - 1);
    if (x < width - 1) enqueue(i + 1);
    if (y > 0) enqueue(i - width);
    if (y < height - 1) enqueue(i + width);
  }

  const mask = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    mask[i] = visited[i] ? 0 : 1;
  }
  return mask;
};

const refineForegroundForCompliance = (source: ImageData): ForegroundRefinementResult => {
  const { width, height, data } = source;
  const total = width * height;

  // Step 1: Initial Alpha Cleanup & Mask Extraction
  const output = new Uint8ClampedArray(data);

  // Detect whether the image has real transparency (imgly transparent PNG)
  // or is fully opaque (JPEG, or imgly failed to remove background).
  // For opaque images we flood-fill from the white corners to find the product.
  let alphaMask: Uint8Array;
  const isOpaque = isImageFullyOpaque(data, total);
  if (isOpaque) {
    alphaMask = buildForegroundMaskFromWhiteBackground(data, width, height);
  } else {
    alphaMask = new Uint8Array(total);
    for (let i = 0; i < total; i += 1) {
      if (data[i * 4 + 3] >= FOREGROUND_ALPHA_THRESHOLD) {
        alphaMask[i] = 1;
      }
    }
  }

  // Step 2: Component Analysis to identify "Intentional" objects
  const analysis = collectComponents(alphaMask, width, height);
  if (analysis.components.length === 0) {
    return {
      image: source,
      bounds: { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 },
      diagnostics: {
        keptComponents: 0,
        removedSecondaryComponents: 0,
        removedHumanLikeRegions: 0,
        removedOverlayRegions: 0,
        productAreaRatio: 0,
        suitableForMainListing: false,
        notices: [],
      },
    };
  }

  // Find the primary product candidate
  let primary = analysis.components[0];
  for (const c of analysis.components) {
    if (c.area > primary.area) primary = c;
  }

  // Remove isolated artifact dots: any component that is both small in absolute
  // terms AND is not the primary component is almost certainly a masking artifact,
  // JPEG halo, or background speck — not an intentional product detail.
  // Intentional product parts (logos, small features) are physically connected to
  // the main body so they merge into the primary component; they are not isolated.
  // Threshold: 500px² ≈ a 25px-diameter circle — large enough to catch real dots.
  const MIN_COMPONENT_AREA = 500;
  const keepIds = new Set<number>();
  let removedSecondaryComponents = 0;

  for (const component of analysis.components) {
    if (component === primary || component.area >= MIN_COMPONENT_AREA) {
      keepIds.add(component.id);
    } else {
      removedSecondaryComponents += 1;
    }
  }

  // Step 3: Apply the refined mask to output
  const finalMask = new Uint8Array(total);
  for (let i = 0; i < total; i += 1) {
    const componentId = analysis.labels[i];
    const offset = i * 4;

    if (componentId >= 0 && keepIds.has(componentId)) {
      finalMask[i] = 1;
      // Normalise high alpha for clean edges
      if (output[offset + 3] >= 250) {
        output[offset + 3] = 255;
      }
    } else {
      // Remove noise/background
      output[offset] = 0;
      output[offset + 1] = 0;
      output[offset + 2] = 0;
      output[offset + 3] = 0;
    }
  }

  // Step 4: Defringe — remove dark border artifacts caused by JPEG compression halos.
  //
  // Only targets pixels that are BOTH semi-transparent AND significantly darker than
  // their nearest opaque neighbour. This fixes dark JPEG edge halos without touching
  // natural soft edges, shading gradients, or object highlights (which would look shiny
  // if their colour were replaced with the brighter interior colour).
  //
  // IMPORTANT: Only fire when the opaque neighbour is near-white (R,G,B ≥ 200).
  // Coloured neighbours (e.g. orange packaging, blue labels) mean the semi-transparent
  // pixel is a legitimate product edge — not a dark halo — so we must leave it alone.
  const DEFRINGE_MAX_ALPHA = 160;    // only thin edge pixels — not natural shading
  const DEFRINGE_MIN_NEIGHBOR = 220; // neighbour must be nearly opaque
  const DEFRINGE_LUM_DELTA = 50;     // neighbour must be this much brighter (lum 0-255)
  const DEFRINGE_NEAR_WHITE = 200;   // neighbour must be near-white on all channels
  for (let i = 0; i < total; i += 1) {
    const offset = i * 4;
    const alpha = output[offset + 3];
    if (alpha === 0 || alpha >= DEFRINGE_MAX_ALPHA) continue;

    const x = i % width;
    const y = Math.floor(i / width);

    let bestAlpha = 0;
    let bestOffset = -1;
    if (x > 0)           { const ni = (i - 1) * 4;     if (output[ni + 3] > bestAlpha) { bestAlpha = output[ni + 3]; bestOffset = ni; } }
    if (x < width - 1)   { const ni = (i + 1) * 4;     if (output[ni + 3] > bestAlpha) { bestAlpha = output[ni + 3]; bestOffset = ni; } }
    if (y > 0)           { const ni = (i - width) * 4;  if (output[ni + 3] > bestAlpha) { bestAlpha = output[ni + 3]; bestOffset = ni; } }
    if (y < height - 1)  { const ni = (i + width) * 4;  if (output[ni + 3] > bestAlpha) { bestAlpha = output[ni + 3]; bestOffset = ni; } }

    if (bestOffset < 0 || bestAlpha < DEFRINGE_MIN_NEIGHBOR) continue;

    // Skip defringe if the opaque neighbour is a saturated colour — that means the
    // semi-transparent pixel is a legitimate product edge, not a dark compression halo.
    const nR = output[bestOffset], nG = output[bestOffset + 1], nB = output[bestOffset + 2];
    if (nR < DEFRINGE_NEAR_WHITE || nG < DEFRINGE_NEAR_WHITE || nB < DEFRINGE_NEAR_WHITE) continue;

    // Only replace colour when the edge pixel is genuinely darker than the product interior.
    // Natural highlights / shading gradients have similar or higher luminance — leave them.
    const edgeLum = 0.299 * output[offset] + 0.587 * output[offset + 1] + 0.114 * output[offset + 2];
    const neighborLum = 0.299 * nR + 0.587 * nG + 0.114 * nB;
    if (neighborLum - edgeLum < DEFRINGE_LUM_DELTA) continue;

    output[offset]     = nR;
    output[offset + 1] = nG;
    output[offset + 2] = nB;
  }

  const finalBounds = computeBoundsFromMask(finalMask, width, height) ?? {
    minX: 0,
    minY: 0,
    maxX: width - 1,
    maxY: height - 1,
  };
  const productAreaRatio = countMaskPixels(finalMask) / Math.max(total, 1);

  return {
    image: new ImageData(output, width, height),
    bounds: finalBounds,
    diagnostics: {
      keptComponents: keepIds.size,
      removedSecondaryComponents,
      removedHumanLikeRegions: 0,
      removedOverlayRegions: 0,
      productAreaRatio,
      suitableForMainListing: productAreaRatio >= PRODUCT_DOMINANCE_THRESHOLD,
      notices: [],
    },
  };
};

// Dead code removed: extractAlphaMask, collectComponents (retained for diagnostics), selectPrimaryComponent (moved or removed), etc.

const collectComponents = (mask: Uint8Array, width: number, height: number): ComponentAnalysis => {
  const total = width * height;
  const labels = new Int32Array(total);
  labels.fill(-1);
  const queue = new Int32Array(total);
  const components: ForegroundComponent[] = [];

  for (let index = 0; index < total; index += 1) {
    if (!mask[index] || labels[index] !== -1) continue;
    const id = components.length;
    let head = 0;
    let tail = 0;
    queue[tail] = index;
    tail += 1;
    labels[index] = id;

    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let sumX = 0;
    let sumY = 0;
    let touchesEdge = false;
    let touchesLeft = false;
    let touchesRight = false;
    let touchesTop = false;
    let touchesBottom = false;

    while (head < tail) {
      const current = queue[head];
      head += 1;
      area += 1;

      const x = current % width;
      const y = Math.floor(current / width);
      sumX += x;
      sumY += y;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (x === 0) touchesLeft = true;
      if (x === width - 1) touchesRight = true;
      if (y === 0) touchesTop = true;
      if (y === height - 1) touchesBottom = true;
      if (touchesLeft || touchesRight || touchesTop || touchesBottom) touchesEdge = true;

      if (x > 0) {
        const left = current - 1;
        if (mask[left] && labels[left] === -1) {
          labels[left] = id;
          queue[tail] = left;
          tail += 1;
        }
      }
      if (x + 1 < width) {
        const right = current + 1;
        if (mask[right] && labels[right] === -1) {
          labels[right] = id;
          queue[tail] = right;
          tail += 1;
        }
      }
      if (y > 0) {
        const up = current - width;
        if (mask[up] && labels[up] === -1) {
          labels[up] = id;
          queue[tail] = up;
          tail += 1;
        }
      }
      if (y + 1 < height) {
        const down = current + width;
        if (mask[down] && labels[down] === -1) {
          labels[down] = id;
          queue[tail] = down;
          tail += 1;
        }
      }
    }

    components.push({
      id,
      area,
      minX,
      minY,
      maxX,
      maxY,
      centerX: sumX / Math.max(area, 1),
      centerY: sumY / Math.max(area, 1),
      touchesEdge,
      touchesLeft,
      touchesRight,
      touchesTop,
      touchesBottom,
    });
  }

  return { labels, components };
};

// selectPrimaryComponent and its dependencies removed.

// Dead code removed: buildPrimaryKeepSet, computeComponentVisualStats, etc.

// Dead code removed: isolatePrimaryByErosion, erodeBinaryMask, dilateBinaryMask, countMaskPixels (retained if used)

const countMaskPixels = (mask: Uint8Array) => {
  let count = 0;
  for (let i = 0; i < mask.length; i += 1) {
    count += mask[i];
  }
  return count;
};

// Dead code removed: detectSkinMask, shouldRemoveSkinComponent

// Dead code removed: pruneFrameEdgeNoise

const computeBoundsFromMask = (
  mask: Uint8Array,
  width: number,
  height: number,
): Bounds | null => {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      if (!mask[row + x]) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0 || maxY < 0) return null;
  return { minX, minY, maxX, maxY };
};

// Geometric helper functions removed

// Skin detection functions removed

const normalizeBounds = (bounds: Bounds, width: number, height: number): Bounds => ({
  minX: clamp(Math.floor(bounds.minX), 0, Math.max(0, width - 1)),
  minY: clamp(Math.floor(bounds.minY), 0, Math.max(0, height - 1)),
  maxX: clamp(Math.ceil(bounds.maxX), 0, Math.max(0, width - 1)),
  maxY: clamp(Math.ceil(bounds.maxY), 0, Math.max(0, height - 1)),
});

const buildOutputName = (fileName: string) => {
  const normalized = fileName.trim() || 'image';
  const dotIndex = normalized.lastIndexOf('.');
  const base = dotIndex > 0 ? normalized.slice(0, dotIndex) : normalized;
  return `${base}-fix.jpg`;
};

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to decode image: ${url}`));
    image.src = url;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to export JPEG.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Returns the pixel centroid (center of mass) of all foreground (non-transparent) pixels.
// Falls back to the geometric center of the canvas if no foreground pixels are found.
const computeForegroundCentroid = (image: ImageData): { x: number; y: number } => {
  const { data, width, height } = image;
  let sumX = 0, sumY = 0, count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha >= FOREGROUND_ALPHA_THRESHOLD) {
        sumX += x;
        sumY += y;
        count++;
      }
    }
  }
  if (count === 0) return { x: width / 2, y: height / 2 };
  return { x: sumX / count, y: sumY / count };
};
