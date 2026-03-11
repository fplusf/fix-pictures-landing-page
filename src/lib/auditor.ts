export type AuditSnapshot = {
  width: number;
  height: number;
  formatLabel: string;
  fileSizeBytes: number;
  fileSizeMb: number;
  backgroundPass: boolean;
  framingPass: boolean;
  coverageRatio: number;
  minPaddingRatio: number;
  nonWhiteBackgroundRatio: number;
  backgroundDiagnostics: {
    nonWhitePixelCount: number;
    belowForegroundRatio: number;
    aboveForegroundRatio: number;
    nearObjectBottomRatio: number;
    shadowLikely: boolean;
  };
  checks: AuditCheck[];
  summary: {
    passCount: number;
    totalCount: number;
    hasFailures: boolean;
  };
  foregroundBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null;
};

export type AuditCheck = {
  id: 'white-background' | 'product-fill' | 'dimensions' | 'file-format' | 'file-size';
  label: string;
  pass: boolean;
  valueLabel: string;
  detail: string;
};

export type AuditArtifacts = {
  sourceUrl: string;
  overlayUrl: string;
  snapshot: AuditSnapshot;
};

const WHITE_THRESHOLD = 250;
const BACKGROUND_TOLERANCE = 36;
const MIN_COVERAGE = 0.85;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MIN_DIMENSION = 1000;
const RECOMMENDED_DIMENSION = 2000;
const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/tiff']);

export const analyzeImageFile = async (file: File): Promise<AuditArtifacts> => {
  const sourceUrl = URL.createObjectURL(file);
  const image = await loadImage(sourceUrl);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    URL.revokeObjectURL(sourceUrl);
    throw new Error('Unable to create 2D context for analyzer');
  }

  context.drawImage(image, 0, 0, width, height);
  const frame = context.getImageData(0, 0, width, height);
  const analysis = analyzePixels(frame);

  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = width;
  overlayCanvas.height = height;
  const overlayContext = overlayCanvas.getContext('2d');
  if (!overlayContext) {
    URL.revokeObjectURL(sourceUrl);
    throw new Error('Unable to create overlay context for analyzer');
  }
  overlayContext.putImageData(analysis.overlay, 0, 0);

  const overlayBlob = await new Promise<Blob>((resolve, reject) => {
    overlayCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to create analyzer overlay'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });

  return {
    sourceUrl,
    overlayUrl: URL.createObjectURL(overlayBlob),
    snapshot: buildSnapshot(file, width, height, analysis),
  };
};

type PixelAnalysis = {
  nonWhiteBackgroundRatio: number;
  backgroundDiagnostics: AuditSnapshot['backgroundDiagnostics'];
  coverageRatio: number;
  minPaddingRatio: number;
  bounds: AuditSnapshot['foregroundBounds'];
  overlay: ImageData;
};

const buildSnapshot = (file: File, width: number, height: number, analysis: PixelAnalysis): AuditSnapshot => {
  const formatLabel = detectFormatLabel(file);
  const backgroundPass = analysis.nonWhiteBackgroundRatio <= 0.01;
  const framingPass = analysis.coverageRatio >= MIN_COVERAGE;
  const dimensionsPass = Math.max(width, height) >= MIN_DIMENSION;
  const formatPass = ACCEPTED_MIME_TYPES.has(file.type.toLowerCase());
  const fileSizePass = file.size <= MAX_FILE_BYTES;

  const checks: AuditCheck[] = [
    {
      id: 'white-background',
      label: 'White Background',
      pass: backgroundPass,
      valueLabel: backgroundPass ? 'PASS' : 'FAIL',
      detail: `${(analysis.nonWhiteBackgroundRatio * 100).toFixed(2)}% off-white background detected (target: <=1.00%).`,
    },
    {
      id: 'product-fill',
      label: 'Product Fill (85%+)',
      pass: framingPass,
      valueLabel: framingPass ? 'PASS' : 'FAIL',
      detail: `Subject fills ${(analysis.coverageRatio * 100).toFixed(1)}% of frame. Minimum required is 85.0%.`,
    },
    {
      id: 'dimensions',
      label: 'Dimensions',
      pass: dimensionsPass,
      valueLabel: dimensionsPass ? 'PASS' : 'FAIL',
      detail: `${width}x${height}px. Minimum ${MIN_DIMENSION}px, ${RECOMMENDED_DIMENSION}px recommended.`,
    },
    {
      id: 'file-format',
      label: 'File Format',
      pass: formatPass,
      valueLabel: formatPass ? 'PASS' : 'FAIL',
      detail: `${formatLabel} ${formatPass ? 'is accepted.' : 'is not accepted. Use JPEG, PNG, GIF, or TIFF.'}`,
    },
    {
      id: 'file-size',
      label: 'File Size',
      pass: fileSizePass,
      valueLabel: fileSizePass ? 'PASS' : 'FAIL',
      detail: `${formatFileSizeMb(file.size)} MB (max 10.00 MB).`,
    },
  ];

  const passCount = checks.filter((check) => check.pass).length;

  return {
    width,
    height,
    formatLabel,
    fileSizeBytes: file.size,
    fileSizeMb: Number(formatFileSizeMb(file.size)),
    backgroundPass,
    framingPass,
    coverageRatio: analysis.coverageRatio,
    minPaddingRatio: analysis.minPaddingRatio,
    nonWhiteBackgroundRatio: analysis.nonWhiteBackgroundRatio,
    backgroundDiagnostics: analysis.backgroundDiagnostics,
    checks,
    summary: {
      passCount,
      totalCount: checks.length,
      hasFailures: passCount !== checks.length,
    },
    foregroundBounds: analysis.bounds,
  };
};

const analyzePixels = (image: ImageData): PixelAnalysis => {
  const { width, height, data } = image;
  const total = width * height;
  const bgMask = new Uint8Array(total);
  const reachable = new Uint8Array(total);
  const queue = new Int32Array(total);
  const overlay = new Uint8ClampedArray(data.length);

  const cornerColor = sampleCornerMean(data, width, height);

  for (let i = 0; i < total; i += 1) {
    const index = i * 4;
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    if (isBackgroundLike(r, g, b, cornerColor)) {
      bgMask[i] = 1;
    }
  }

  let head = 0;
  let tail = 0;
  const enqueue = (x: number, y: number) => {
    const idx = y * width + x;
    if (!bgMask[idx] || reachable[idx]) return;
    reachable[idx] = 1;
    queue[tail] = idx;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < tail) {
    const idx = queue[head];
    head += 1;
    const x = idx % width;
    const y = Math.floor(idx / width);
    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < width) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < height) enqueue(x, y + 1);
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let backgroundCount = 0;
  let nonWhiteBackgroundCount = 0;

  for (let i = 0; i < total; i += 1) {
    const index = i * 4;
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];

    if (reachable[i]) {
      backgroundCount += 1;
      if (!isPureWhite(r, g, b)) {
        nonWhiteBackgroundCount += 1;
        overlay[index] = 255;
        overlay[index + 1] = isNearWhite(r, g, b) ? 196 : 40;
        overlay[index + 2] = isNearWhite(r, g, b) ? 0 : 40;
        overlay[index + 3] = isNearWhite(r, g, b) ? 110 : 130;
      }
      continue;
    }

    const x = i % width;
    const y = Math.floor(i / width);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const hasForeground = maxX >= minX && maxY >= minY;
  const bounds = hasForeground ? { minX, minY, maxX, maxY } : null;
  const longestEdge = Math.max(width, height);
  const coverageRatio = hasForeground ? Math.max(maxX - minX + 1, maxY - minY + 1) / longestEdge : 0;

  const minPaddingRatio = hasForeground
    ? Math.min(minX, minY, width - 1 - maxX, height - 1 - maxY) / longestEdge
    : 0;

  let belowForegroundCount = 0;
  let aboveForegroundCount = 0;
  let nearObjectBottomCount = 0;
  if (hasForeground && nonWhiteBackgroundCount > 0 && bounds) {
    const yPad = Math.max(2, Math.floor(height * 0.01));
    const xPad = Math.max(8, Math.floor(width * 0.1));
    const xLeft = Math.max(0, bounds.minX - xPad);
    const xRight = Math.min(width - 1, bounds.maxX + xPad);

    for (let i = 0; i < total; i += 1) {
      if (!reachable[i]) continue;
      const index = i * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      if (isPureWhite(r, g, b)) continue;

      const x = i % width;
      const y = Math.floor(i / width);
      if (y >= bounds.maxY + yPad) {
        belowForegroundCount += 1;
        if (x >= xLeft && x <= xRight) {
          nearObjectBottomCount += 1;
        }
      } else if (y <= bounds.minY - yPad) {
        aboveForegroundCount += 1;
      }
    }
  }

  const belowForegroundRatio =
    nonWhiteBackgroundCount > 0 ? belowForegroundCount / nonWhiteBackgroundCount : 0;
  const aboveForegroundRatio =
    nonWhiteBackgroundCount > 0 ? aboveForegroundCount / nonWhiteBackgroundCount : 0;
  const nearObjectBottomRatio =
    nonWhiteBackgroundCount > 0 ? nearObjectBottomCount / nonWhiteBackgroundCount : 0;
  const shadowLikely =
    hasForeground &&
    nonWhiteBackgroundCount > 0 &&
    belowForegroundRatio >= 0.7 &&
    nearObjectBottomRatio >= 0.65 &&
    aboveForegroundRatio <= 0.1 &&
    nonWhiteBackgroundCount / Math.max(backgroundCount, 1) <= 0.25;

  return {
    nonWhiteBackgroundRatio: backgroundCount > 0 ? nonWhiteBackgroundCount / backgroundCount : 1,
    backgroundDiagnostics: {
      nonWhitePixelCount: nonWhiteBackgroundCount,
      belowForegroundRatio,
      aboveForegroundRatio,
      nearObjectBottomRatio,
      shadowLikely,
    },
    coverageRatio,
    minPaddingRatio,
    bounds,
    overlay: new ImageData(overlay, width, height),
  };
};

const sampleCornerMean = (data: Uint8ClampedArray, width: number, height: number): [number, number, number] => {
  const pad = Math.max(6, Math.floor(Math.min(width, height) * 0.03));
  const points: Array<[number, number]> = [
    [pad, pad],
    [width - 1 - pad, pad],
    [pad, height - 1 - pad],
    [width - 1 - pad, height - 1 - pad],
  ];

  let r = 0;
  let g = 0;
  let b = 0;
  for (const [x, y] of points) {
    const idx = (y * width + x) * 4;
    r += data[idx];
    g += data[idx + 1];
    b += data[idx + 2];
  }

  return [Math.round(r / points.length), Math.round(g / points.length), Math.round(b / points.length)];
};

const isBackgroundLike = (r: number, g: number, b: number, reference: [number, number, number]) =>
  Math.abs(r - reference[0]) <= BACKGROUND_TOLERANCE &&
  Math.abs(g - reference[1]) <= BACKGROUND_TOLERANCE &&
  Math.abs(b - reference[2]) <= BACKGROUND_TOLERANCE &&
  (r + g + b) / 3 >= 170;

const isPureWhite = (r: number, g: number, b: number) => r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;

const isNearWhite = (r: number, g: number, b: number) => r >= 236 && g >= 236 && b >= 236;

const detectFormatLabel = (file: File) => {
  const mime = file.type.toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'JPEG';
  if (mime === 'image/png') return 'PNG';
  if (mime === 'image/gif') return 'GIF';
  if (mime === 'image/tiff') return 'TIFF';
  if (mime === 'image/webp') return 'WEBP';
  const extension = file.name.split('.').pop()?.toUpperCase();
  return extension || 'UNKNOWN';
};

const formatFileSizeMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2);

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
