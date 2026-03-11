import { CANVAS_SIZE, TARGET_SCALE } from '@/src/lib/constants';
import type { Bounds, ProcessedPayload } from '@/src/workers/ai.worker';

export type ShadowMode = 'auto' | 'off';

export interface CompositorOptions {
  shadowMode: ShadowMode;
  shadowIntensity: number; // 0-100
  quality?: number; // 0-1
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
const MAX_FRAME_WIDTH_RATIO = 0.9;
const MIN_MARGIN_RATIO = 0.05;
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

    const sourceCenterX = (bbox.minX + bbox.maxX) / 2;
    const sourceCenterY = (bbox.minY + bbox.maxY) / 2;
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

    const shadowSignals = computeShadowSignals(sourceCanvas, image.width, image.height, bbox);
    const shouldApplyShadow =
      options.shadowMode === 'off' ? false : shadowSignals.grounded && !shadowSignals.transparent;

    let shadowOpacity = 0;
    if (shouldApplyShadow) {
      const intensityNorm = clamp(options.shadowIntensity, 0, 100) / 100;
      shadowOpacity = clamp(0.05 + intensityNorm * 0.1, 0.05, 0.15);
      drawContactShadow(context, {
        bbox,
        scale,
        left,
        floorY: bboxBottom,
        opacity: shadowOpacity,
      });
    }

    context.drawImage(sourceCanvas, left, top, image.width * scale, image.height * scale);

    const blob = await canvasToBlob(canvas, quality);
    const previewDataUrl = canvas.toDataURL('image/jpeg', quality);

    return {
      outputFileName: buildOutputName(payload.fileName),
      previewDataUrl,
      blob,
      metrics: {
        scaleRatio: scaledBboxHeight / CANVAS_SIZE,
        resolution: CANVAS_SIZE,
        backgroundHex: BACKGROUND_HEX,
        grounded: shadowSignals.grounded,
        shadowApplied: shouldApplyShadow,
        shadowOpacity,
        compliance: complianceRefinement.diagnostics,
      },
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

interface ShadowDrawParams {
  bbox: Bounds;
  scale: number;
  left: number;
  floorY: number;
  opacity: number;
}

const drawContactShadow = (context: CanvasRenderingContext2D, params: ShadowDrawParams) => {
  const bboxWidth = Math.max(params.bbox.maxX - params.bbox.minX + 1, 1) * params.scale;
  const bboxHeight = Math.max(params.bbox.maxY - params.bbox.minY + 1, 1) * params.scale;
  const blurRadius = clamp(bboxHeight * 0.04, 14, 68);
  const offsetY = clamp(bboxHeight * 0.015, 5, 26);
  const radiusX = clamp(bboxWidth * 0.38, 32, 640);
  const radiusY = clamp(bboxHeight * 0.08, 10, 150);
  const centerX = params.left + ((params.bbox.minX + params.bbox.maxX + 1) / 2) * params.scale;
  const centerY = params.floorY + offsetY;

  context.save();
  context.globalAlpha = params.opacity;
  context.filter = `blur(${blurRadius}px)`;
  context.fillStyle = '#000000';
  context.beginPath();
  context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

const computeShadowSignals = (
  source: CanvasImageSource,
  width: number,
  height: number,
  bounds: Bounds,
) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return { grounded: true, transparent: false };
  }

  context.drawImage(source, 0, 0, width, height);

  const bbox = normalizeBounds(bounds, width, height);
  const bboxWidth = Math.max(bbox.maxX - bbox.minX + 1, 1);
  const bboxHeight = Math.max(bbox.maxY - bbox.minY + 1, 1);
  const sampleHeight = Math.max(2, Math.floor(bboxHeight * 0.05));
  const sampleTop = Math.max(bbox.minY, bbox.maxY - sampleHeight + 1);
  const sample = context.getImageData(bbox.minX, sampleTop, bboxWidth, sampleHeight).data;
  const boxPixels = context.getImageData(bbox.minX, bbox.minY, bboxWidth, bboxHeight).data;

  let bottomSolid = 0;
  for (let i = 3; i < sample.length; i += 4) {
    if (sample[i] >= 190) {
      bottomSolid += 1;
    }
  }
  const bottomCoverage = bottomSolid / Math.max((sample.length / 4), 1);

  let foreground = 0;
  let semiTransparent = 0;
  for (let i = 3; i < boxPixels.length; i += 4) {
    const alpha = boxPixels[i];
    if (alpha <= 16) continue;
    foreground += 1;
    if (alpha < 210) semiTransparent += 1;
  }

  const transparencyRatio = semiTransparent / Math.max(foreground, 1);
  return {
    grounded: bottomCoverage >= 0.08,
    transparent: transparencyRatio >= 0.58,
  };
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

interface PrimarySelectOptions {
  labels?: Int32Array;
  rgba?: Uint8ClampedArray;
}

interface ComponentVisualStats {
  skinRatio: number;
  nearWhiteRatio: number;
}

interface ForegroundRefinementResult {
  image: ImageData;
  bounds: Bounds;
  diagnostics: ComplianceDiagnostics;
}

const refineForegroundForCompliance = (source: ImageData): ForegroundRefinementResult => {
  const { width, height, data } = source;
  const total = width * height;
  const alphaMask = extractAlphaMask(data, total, FOREGROUND_ALPHA_THRESHOLD);
  const fallbackBounds = computeBoundsFromMask(alphaMask, width, height) ?? {
    minX: 0,
    minY: 0,
    maxX: width - 1,
    maxY: height - 1,
  };
  const initialAnalysis = collectComponents(alphaMask, width, height);
  const initialPrimary = selectPrimaryComponent(initialAnalysis.components, width, height, total, {
    labels: initialAnalysis.labels,
    rgba: data,
  });
  if (!initialPrimary) {
    return {
      image: source,
      bounds: fallbackBounds,
      diagnostics: {
        keptComponents: 0,
        removedSecondaryComponents: 0,
        removedHumanLikeRegions: 0,
        removedOverlayRegions: 0,
        productAreaRatio: 0,
        suitableForMainListing: false,
        notices: ['Tip: use a tighter single-product photo for cleaner automatic isolation.'],
      },
    };
  }

  const keepComponentIds = buildPrimaryKeepSet(initialAnalysis.components, initialPrimary, width, height);
  const keepMask = new Uint8Array(total);
  for (let i = 0; i < total; i += 1) {
    const componentId = initialAnalysis.labels[i];
    if (componentId >= 0 && keepComponentIds.has(componentId)) {
      keepMask[i] = 1;
    }
  }
  const baseKeepMask = new Uint8Array(keepMask);
  const baseForegroundPixels = countMaskPixels(baseKeepMask);

  let removedSecondaryComponents = Math.max(initialAnalysis.components.length - keepComponentIds.size, 0);
  const skinMask = detectSkinMask(data, keepMask, total);
  const skinAnalysis = collectComponents(skinMask, width, height);
  const removedSkinRegionIds = new Set<number>();
  for (const component of skinAnalysis.components) {
    if (shouldRemoveSkinComponent(component, initialPrimary, width, height)) {
      removedSkinRegionIds.add(component.id);
    }
  }
  if (removedSkinRegionIds.size > 0) {
    for (let i = 0; i < total; i += 1) {
      if (removedSkinRegionIds.has(skinAnalysis.labels[i])) {
        keepMask[i] = 0;
      }
    }
  }

  const separated = isolatePrimaryByErosion(keepMask, width, height, data);
  if (separated.applied) {
    if (separated.removedPixels > 0) {
      removedSecondaryComponents += 1;
    }
    keepMask.fill(0);
    keepMask.set(separated.mask);
  }

  const refinedAnalysis = collectComponents(keepMask, width, height);
  const refinedPrimary = selectPrimaryComponent(refinedAnalysis.components, width, height, total, {
    labels: refinedAnalysis.labels,
    rgba: data,
  });
  const finalKeepIds =
    refinedPrimary ? buildPrimaryKeepSet(refinedAnalysis.components, refinedPrimary, width, height) : new Set<number>();
  if (finalKeepIds.size > 0 && finalKeepIds.size < refinedAnalysis.components.length) {
    removedSecondaryComponents += refinedAnalysis.components.length - finalKeepIds.size;
    for (let i = 0; i < total; i += 1) {
      const componentId = refinedAnalysis.labels[i];
      if (componentId >= 0 && !finalKeepIds.has(componentId)) {
        keepMask[i] = 0;
      }
    }
  }

  const edgeCleanup = pruneFrameEdgeNoise({
    keepMask,
    rgba: data,
    width,
    height,
  });
  if (edgeCleanup.removedComponents > 0) {
    removedSecondaryComponents += edgeCleanup.removedComponents;
  }

  // Safety: if cleanup removed too much of the retained foreground, roll back to safer mask.
  if (baseForegroundPixels > 0) {
    const retainedRatio = countMaskPixels(keepMask) / baseForegroundPixels;
    if (retainedRatio < 0.58) {
      keepMask.fill(0);
      keepMask.set(baseKeepMask);
      removedSecondaryComponents = 0;
    }
  }

  const minForegroundPixels = Math.max(220, Math.floor(total * 0.012));
  if (countMaskPixels(keepMask) < minForegroundPixels) {
    if (countMaskPixels(baseKeepMask) >= minForegroundPixels) {
      keepMask.fill(0);
      keepMask.set(baseKeepMask);
    } else {
      keepMask.fill(0);
      keepMask.set(alphaMask);
    }
  }

  const output = new Uint8ClampedArray(data);
  for (let i = 0; i < total; i += 1) {
    const offset = i * 4;
    if (!keepMask[i]) {
      output[offset] = 0;
      output[offset + 1] = 0;
      output[offset + 2] = 0;
      output[offset + 3] = 0;
      continue;
    }

    const alpha = output[offset + 3];
    if (alpha <= 4) {
      keepMask[i] = 0;
      output[offset] = 0;
      output[offset + 1] = 0;
      output[offset + 2] = 0;
      output[offset + 3] = 0;
      continue;
    }
    if (alpha >= 250) {
      output[offset + 3] = 255;
    }
  }

  const finalAlphaMask = extractAlphaMask(output, total, FOREGROUND_ALPHA_THRESHOLD);
  const finalAnalysis = collectComponents(finalAlphaMask, width, height);
  const finalPrimary = selectPrimaryComponent(finalAnalysis.components, width, height, total, {
    labels: finalAnalysis.labels,
    rgba: output,
  });
  const productAreaRatio = finalPrimary ? finalPrimary.area / Math.max(total, 1) : 0;
  const suitableForMainListing = productAreaRatio >= PRODUCT_DOMINANCE_THRESHOLD;

  const notices: string[] = [];
  if (removedSkinRegionIds.size > 0) {
    notices.push('Human regions were removed automatically.');
  }

  const finalBounds = computeBoundsFromMask(finalAlphaMask, width, height) ?? fallbackBounds;
  return {
    image: new ImageData(output, width, height),
    bounds: finalBounds,
    diagnostics: {
      keptComponents: finalAnalysis.components.length,
      removedSecondaryComponents,
      removedHumanLikeRegions: removedSkinRegionIds.size,
      removedOverlayRegions: 0,
      productAreaRatio,
      suitableForMainListing,
      notices,
    },
  };
};

const extractAlphaMask = (
  rgba: Uint8ClampedArray,
  total: number,
  threshold: number,
): Uint8Array => {
  const mask = new Uint8Array(total);
  for (let i = 0; i < total; i += 1) {
    if (rgba[i * 4 + 3] >= threshold) {
      mask[i] = 1;
    }
  }
  return mask;
};

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

const selectPrimaryComponent = (
  components: ForegroundComponent[],
  width: number,
  height: number,
  totalPixels: number,
  options?: PrimarySelectOptions,
): ForegroundComponent | null => {
  if (!components.length) return null;
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const diagonal = Math.hypot(width, height) || 1;
  const visualStats = computeComponentVisualStats(
    components,
    options?.labels ?? null,
    options?.rgba ?? null,
  );

  let winner = components[0];
  let winnerScore = Number.NEGATIVE_INFINITY;
  for (const component of components) {
    const areaRatio = component.area / Math.max(totalPixels, 1);
    const bboxWidth = component.maxX - component.minX + 1;
    const bboxHeight = component.maxY - component.minY + 1;
    const bboxRatio = (bboxWidth * bboxHeight) / Math.max(totalPixels, 1);
    const fillRatio = component.area / Math.max(bboxWidth * bboxHeight, 1);
    const centerDistance = Math.hypot(component.centerX - centerX, component.centerY - centerY) / diagonal;
    const aspect = bboxWidth / Math.max(bboxHeight, 1);
    const elongatedPenalty = aspect > 3.4 || aspect < 0.3 ? 0.45 : aspect > 2.2 || aspect < 0.45 ? 0.2 : 0;
    const edgeSides =
      Number(component.touchesLeft) +
      Number(component.touchesRight) +
      Number(component.touchesTop) +
      Number(component.touchesBottom);
    const edgePenalty = edgeSides * 0.18;
    const centerBonus =
      component.minX <= centerX &&
      component.maxX >= centerX &&
      component.minY <= centerY &&
      component.maxY >= centerY
        ? 0.2
        : 0;
    const visual = visualStats?.[component.id];
    const skinPenalty = (visual?.skinRatio ?? 0) * 3.2;
    const humanLikePenalty = (visual?.skinRatio ?? 0) >= 0.06 ? 0.9 : 0;
    const paperLikePenalty =
      (visual?.nearWhiteRatio ?? 0) >= 0.86 && edgeSides >= 1 && (aspect > 1.8 || aspect < 0.55) ? 0.9 : 0;
    const lowDensityPenalty = fillRatio < 0.35 ? 0.22 : 0;
    const score =
      areaRatio * 2 +
      bboxRatio * 0.35 +
      fillRatio * 0.7 +
      (1 - clamp(centerDistance, 0, 1)) * 1.0 +
      centerBonus -
      skinPenalty -
      humanLikePenalty -
      paperLikePenalty -
      lowDensityPenalty -
      edgePenalty -
      elongatedPenalty;
    if (score > winnerScore) {
      winner = component;
      winnerScore = score;
    }
  }

  return winner;
};

const buildPrimaryKeepSet = (
  components: ForegroundComponent[],
  primary: ForegroundComponent,
  width: number,
  height: number,
): Set<number> => {
  const keep = new Set<number>([primary.id]);
  const gapThreshold = Math.max(8, Math.round(Math.min(width, height) * 0.03));
  const primaryArea = Math.max(primary.area, 1);
  const expandedPrimary = expandComponentBounds(primary, width, height, 0.08);
  const bboxWidth = Math.max(primary.maxX - primary.minX + 1, 1);
  const bboxHeight = Math.max(primary.maxY - primary.minY + 1, 1);
  const tinyAttachmentLimit = Math.max(70, Math.floor(primaryArea * 0.012));
  const mediumAttachmentLimit = Math.max(130, Math.floor(primaryArea * 0.08));
  const centerBand = expandComponentBounds(primary, width, height, 0.16);

  for (const component of components) {
    if (component.id === primary.id) continue;
    const nearPrimary = computeComponentGap(primary, component) <= gapThreshold;
    if (!nearPrimary) continue;

    const area = component.area;
    const overlapsPrimary = intersects(component, expandedPrimary);
    const inCenterBand = intersects(component, centerBand);
    const compWidth = Math.max(component.maxX - component.minX + 1, 1);
    const compHeight = Math.max(component.maxY - component.minY + 1, 1);
    const aspect = compWidth / compHeight;
    const elongated = aspect > 3.4 || aspect < 0.3;
    const tooLargeForAttachment = area > mediumAttachmentLimit;
    const veryTiny = area <= tinyAttachmentLimit;

    if (component.touchesEdge && !veryTiny) continue;
    if (tooLargeForAttachment) continue;

    if (veryTiny && (inCenterBand || overlapsPrimary)) {
      keep.add(component.id);
      continue;
    }

    if (
      area <= mediumAttachmentLimit &&
      overlapsPrimary &&
      !elongated &&
      compWidth <= bboxWidth * 0.45 &&
      compHeight <= bboxHeight * 0.45
    ) {
      keep.add(component.id);
    }
  }

  return keep;
};

const computeComponentVisualStats = (
  components: ForegroundComponent[],
  labels: Int32Array | null,
  rgba: Uint8ClampedArray | null,
) => {
  if (!labels || !rgba || !components.length) return null;
  const totals = new Float64Array(components.length);
  const skin = new Float64Array(components.length);
  const nearWhite = new Float64Array(components.length);

  const totalPixels = labels.length;
  for (let i = 0; i < totalPixels; i += 1) {
    const id = labels[i];
    if (id < 0) continue;
    const offset = i * 4;
    const alpha = rgba[offset + 3];
    if (alpha < FOREGROUND_ALPHA_THRESHOLD) continue;
    totals[id] += 1;

    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    if (isSkinPixel(r, g, b)) {
      skin[id] += 1;
    }
    if (r >= 236 && g >= 236 && b >= 236) {
      nearWhite[id] += 1;
    }
  }

  return components.map<ComponentVisualStats>((component) => {
    const count = Math.max(totals[component.id], 1);
    return {
      skinRatio: skin[component.id] / count,
      nearWhiteRatio: nearWhite[component.id] / count,
    };
  });
};

const isolatePrimaryByErosion = (
  mask: Uint8Array,
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
) => {
  const total = width * height;
  const originalCount = countMaskPixels(mask);
  if (originalCount <= 0) {
    return { mask, removedPixels: 0, applied: false };
  }

  const erosionSteps = clamp(Math.round(Math.min(width, height) * 0.004), 2, 5);
  let eroded = new Uint8Array(mask);
  for (let i = 0; i < erosionSteps; i += 1) {
    eroded = erodeBinaryMask(eroded, width, height);
  }

  const erodedCount = countMaskPixels(eroded);
  if (erodedCount < Math.max(120, Math.floor(originalCount * 0.04))) {
    return { mask, removedPixels: 0, applied: false };
  }

  const erodedAnalysis = collectComponents(eroded, width, height);
  const primary = selectPrimaryComponent(erodedAnalysis.components, width, height, total, {
    labels: erodedAnalysis.labels,
    rgba,
  });
  if (!primary) {
    return { mask, removedPixels: 0, applied: false };
  }

  let grown = new Uint8Array(total);
  for (let i = 0; i < total; i += 1) {
    if (erodedAnalysis.labels[i] === primary.id) {
      grown[i] = 1;
    }
  }

  const growSteps = erosionSteps + 2;
  for (let step = 0; step < growSteps; step += 1) {
    const dilated = dilateBinaryMask(grown, width, height);
    for (let i = 0; i < total; i += 1) {
      grown[i] = dilated[i] && mask[i] ? 1 : 0;
    }
  }

  const grownCount = countMaskPixels(grown);
  if (grownCount < Math.max(120, Math.floor(originalCount * 0.2))) {
    return { mask, removedPixels: 0, applied: false };
  }

  const removedPixels = Math.max(originalCount - grownCount, 0);
  return {
    mask: grown,
    removedPixels,
    applied: removedPixels > 0,
  };
};

const computeComponentGap = (a: ForegroundComponent, b: ForegroundComponent) => {
  const dx = Math.max(0, a.minX - b.maxX - 1, b.minX - a.maxX - 1);
  const dy = Math.max(0, a.minY - b.maxY - 1, b.minY - a.maxY - 1);
  return Math.hypot(dx, dy);
};

const erodeBinaryMask = (mask: Uint8Array, width: number, height: number) => {
  const output = new Uint8Array(mask.length);
  for (let y = 1; y < height - 1; y += 1) {
    const row = y * width;
    for (let x = 1; x < width - 1; x += 1) {
      const idx = row + x;
      if (
        mask[idx] &&
        mask[idx - 1] &&
        mask[idx + 1] &&
        mask[idx - width] &&
        mask[idx + width]
      ) {
        output[idx] = 1;
      }
    }
  }
  return output;
};

const dilateBinaryMask = (mask: Uint8Array, width: number, height: number) => {
  const output = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      const idx = row + x;
      if (!mask[idx]) continue;
      output[idx] = 1;
      if (x > 0) output[idx - 1] = 1;
      if (x + 1 < width) output[idx + 1] = 1;
      if (y > 0) output[idx - width] = 1;
      if (y + 1 < height) output[idx + width] = 1;
    }
  }
  return output;
};

const countMaskPixels = (mask: Uint8Array) => {
  let count = 0;
  for (let i = 0; i < mask.length; i += 1) {
    count += mask[i];
  }
  return count;
};

const detectSkinMask = (
  rgba: Uint8ClampedArray,
  keepMask: Uint8Array,
  total: number,
): Uint8Array => {
  const mask = new Uint8Array(total);
  for (let i = 0; i < total; i += 1) {
    if (!keepMask[i]) continue;
    const offset = i * 4;
    const alpha = rgba[offset + 3];
    if (alpha < FOREGROUND_ALPHA_THRESHOLD) continue;

    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    if (!isSkinPixel(r, g, b)) continue;
    mask[i] = 1;
  }
  return mask;
};

const shouldRemoveSkinComponent = (
  component: ForegroundComponent,
  primary: ForegroundComponent,
  width: number,
  height: number,
) => {
  const areaCap = primary.area * 0.45;
  if (component.area > areaCap) return false;
  const expandedPrimary = expandComponentBounds(primary, width, height, 0.12);
  const overlapsExpandedPrimary = intersects(component, expandedPrimary);
  const boxWidth = component.maxX - component.minX + 1;
  const boxHeight = component.maxY - component.minY + 1;
  const aspect = boxWidth / Math.max(boxHeight, 1);
  const elongated = aspect > 2.6 || aspect < 0.38;
  const smallRelative = component.area <= primary.area * 0.22;
  return (component.touchesEdge && (elongated || smallRelative)) || (!overlapsExpandedPrimary && elongated);
};

const pruneFrameEdgeNoise = (params: {
  keepMask: Uint8Array;
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
}) => {
  const { keepMask, rgba, width, height } = params;
  const total = width * height;
  const analysis = collectComponents(keepMask, width, height);
  const primary = selectPrimaryComponent(analysis.components, width, height, total, {
    labels: analysis.labels,
    rgba,
  });
  if (!primary) {
    return { removedComponents: 0 };
  }

  const expandedPrimary = expandComponentBounds(primary, width, height, 0.2);
  const maxNoiseArea = Math.max(140, Math.floor(primary.area * 0.02));
  const removeIds = new Set<number>();

  const alphaSums = new Float64Array(analysis.components.length);
  const pixelCounts = new Float64Array(analysis.components.length);
  for (let i = 0; i < total; i += 1) {
    const id = analysis.labels[i];
    if (id < 0) continue;
    alphaSums[id] += rgba[i * 4 + 3];
    pixelCounts[id] += 1;
  }

  for (const component of analysis.components) {
    if (component.id === primary.id) continue;
    if (!component.touchesEdge) continue;

    const compWidth = Math.max(component.maxX - component.minX + 1, 1);
    const compHeight = Math.max(component.maxY - component.minY + 1, 1);
    const aspect = compWidth / compHeight;
    const isThinHorizontal = compHeight <= Math.max(4, Math.floor(height * 0.01)) && aspect >= 6;
    const isThinVertical = compWidth <= Math.max(4, Math.floor(width * 0.01)) && aspect <= 1 / 6;
    const isSmallEdge = component.area <= maxNoiseArea;
    const farFromPrimary = computeComponentGap(component, primary) > Math.max(12, Math.floor(Math.min(width, height) * 0.05));
    const nearTopBand = component.maxY <= Math.floor(height * 0.2);
    const overlapsPrimaryEnvelope = intersects(component, expandedPrimary);
    const meanAlpha = alphaSums[component.id] / Math.max(pixelCounts[component.id], 1);
    const lowAlpha = meanAlpha < 170;

    if (overlapsPrimaryEnvelope) continue;
    if (farFromPrimary && (isThinHorizontal || isThinVertical || (isSmallEdge && (nearTopBand || lowAlpha)))) {
      removeIds.add(component.id);
    }
  }

  if (removeIds.size === 0) {
    return { removedComponents: 0 };
  }

  for (let i = 0; i < total; i += 1) {
    if (removeIds.has(analysis.labels[i])) {
      keepMask[i] = 0;
    }
  }

  const refreshed = collectComponents(keepMask, width, height);
  const refreshedPrimary = selectPrimaryComponent(refreshed.components, width, height, total, {
    labels: refreshed.labels,
    rgba,
  });
  if (refreshedPrimary) {
    const tightenedPrimary = expandComponentBounds(refreshedPrimary, width, height, 0.22);
    for (let i = 0; i < total; i += 1) {
      if (!keepMask[i]) continue;
      const x = i % width;
      const y = Math.floor(i / width);
      const offset = i * 4;
      const alpha = rgba[offset + 3];
      const r = rgba[offset];
      const g = rgba[offset + 1];
      const b = rgba[offset + 2];
      const nearWhite = r >= 242 && g >= 242 && b >= 242;
      const outsideEnvelope =
        x < tightenedPrimary.minX ||
        x > tightenedPrimary.maxX ||
        y < tightenedPrimary.minY ||
        y > tightenedPrimary.maxY;
      if (outsideEnvelope && nearWhite && alpha <= 36) {
        keepMask[i] = 0;
      }
    }
  }

  return { removedComponents: removeIds.size };
};

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

const expandComponentBounds = (
  component: ForegroundComponent,
  width: number,
  height: number,
  ratio: number,
) => {
  const padX = Math.round((component.maxX - component.minX + 1) * ratio);
  const padY = Math.round((component.maxY - component.minY + 1) * ratio);
  return {
    minX: clamp(component.minX - padX, 0, width - 1),
    minY: clamp(component.minY - padY, 0, height - 1),
    maxX: clamp(component.maxX + padX, 0, width - 1),
    maxY: clamp(component.maxY + padY, 0, height - 1),
  };
};

const intersects = (
  component: ForegroundComponent,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
) =>
  !(
    component.maxX < bounds.minX ||
    component.minX > bounds.maxX ||
    component.maxY < bounds.minY ||
    component.minY > bounds.maxY
  );

const isSkinPixel = (r: number, g: number, b: number) => {
  const maxChannel = Math.max(r, g, b);
  const minChannel = Math.min(r, g, b);
  const rgbRule =
    r > 95 &&
    g > 40 &&
    b > 20 &&
    maxChannel - minChannel > 15 &&
    Math.abs(r - g) > 15 &&
    r > g &&
    r > b;
  if (!rgbRule) return false;

  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  if (!(cr >= 135 && cr <= 180 && cb >= 85 && cb <= 135)) return false;

  const { hue, saturation, value } = rgbToHsv(r, g, b);
  return hue >= 0.02 && hue <= 0.14 && saturation >= 0.18 && saturation <= 0.7 && value >= 0.28;
};

const rgbToHsv = (r: number, g: number, b: number) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let hue = 0;
  if (delta > 0) {
    if (max === rn) hue = ((gn - bn) / delta) % 6;
    else if (max === gn) hue = (bn - rn) / delta + 2;
    else hue = (rn - gn) / delta + 4;
    hue /= 6;
    if (hue < 0) hue += 1;
  }

  const saturation = max === 0 ? 0 : delta / max;
  return { hue, saturation, value: max };
};

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
