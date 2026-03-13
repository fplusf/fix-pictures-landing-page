import piexif from 'piexifjs';
import exifr from 'exifr';

const APP_VERSION = '1.0';
const METADATA_MARKER = `ProcessedByFixPicturesApp:${APP_VERSION}`;

/**
 * Embeds metadata into a JPEG blob to mark it as processed by this app.
 * Uses EXIF UserComment field for reliable detection across re-encodes.
 */
export const embedProcessedMetadata = async (blob: Blob): Promise<Blob> => {
  try {
    // Convert blob to data URL for piexifjs
    const dataUrl = await blobToDataURL(blob);

    // Create EXIF data with our marker
    const exifObj = {
      '0th': {
        [piexif.ImageIFD.ImageDescription]: METADATA_MARKER,
        [piexif.ImageIFD.Software]: 'FixPicturesApp',
      },
      'Exif': {
        [piexif.ExifIFD.UserComment]: METADATA_MARKER,
      },
    };

    const exifBytes = piexif.dump(exifObj);
    const newDataUrl = piexif.insert(exifBytes, dataUrl);

    // Convert back to blob
    return dataURLToBlob(newDataUrl);
  } catch (error) {
    console.warn('Failed to embed EXIF metadata, returning original blob:', error);
    return blob;
  }
};

/**
 * Checks if an image file was previously processed by this app.
 * Returns true if the app's metadata marker is detected.
 */
export const hasProcessedMetadata = async (file: File): Promise<boolean> => {
  try {
    const metadata = await exifr.parse(file, {
      pick: ['ImageDescription', 'UserComment', 'Software'],
    });

    if (!metadata) return false;

    // Check multiple fields for robustness
    const imageDesc = metadata.ImageDescription as string | undefined;
    const userComment = metadata.UserComment as string | undefined;
    const software = metadata.Software as string | undefined;

    return (
      imageDesc?.includes('ProcessedByFixPicturesApp') ||
      userComment?.includes('ProcessedByFixPicturesApp') ||
      software === 'FixPicturesApp'
    );
  } catch (error) {
    console.warn('Failed to read EXIF metadata:', error);
    return false;
  }
};

/**
 * Safety audit: checks if image appears to be our own output based on dimensions
 * and background uniformity, even without EXIF metadata.
 */
export const looksLikeOurOutput = async (file: File): Promise<boolean> => {
  try {
    const image = await loadImageFromFile(file);

    // Check 1: Is it exactly our output size?
    const is2000x2000 = image.width === 2000 && image.height === 2000;

    if (!is2000x2000) return false;

    // Check 2: Does it have a uniform white background?
    const hasUniformWhiteBackground = await checkUniformWhiteBackground(image);

    return hasUniformWhiteBackground;
  } catch (error) {
    console.warn('Failed to analyze image characteristics:', error);
    return false;
  }
};

// Helper: Load image from file
const loadImageFromFile = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    image.src = url;
  });

// Helper: Check if background is uniformly white
const checkUniformWhiteBackground = async (image: HTMLImageElement): Promise<boolean> => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) return false;

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, image.width, image.height);
  const { data, width, height } = imageData;

  // Sample edge pixels (background should be reachable from edges)
  const edgeSamples: Array<[number, number]> = [];
  const step = 50; // Sample every 50 pixels along edges

  // Top and bottom edges
  for (let x = 0; x < width; x += step) {
    edgeSamples.push([x, 0]);
    edgeSamples.push([x, height - 1]);
  }

  // Left and right edges
  for (let y = 0; y < height; y += step) {
    edgeSamples.push([0, y]);
    edgeSamples.push([width - 1, y]);
  }

  let whiteCount = 0;
  let nearWhiteCount = 0;

  for (const [x, y] of edgeSamples) {
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    if (r >= 250 && g >= 250 && b >= 250) {
      whiteCount += 1;
    } else if (r >= 240 && g >= 240 && b >= 240) {
      nearWhiteCount += 1;
    }
  }

  const totalSamples = edgeSamples.length;
  const whiteRatio = whiteCount / totalSamples;
  const nearWhiteRatio = (whiteCount + nearWhiteCount) / totalSamples;

  // Background is uniform white if 90%+ of edge samples are white/near-white
  return nearWhiteRatio >= 0.9 && whiteRatio >= 0.7;
};

// Helper: Convert blob to data URL
const blobToDataURL = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });

// Helper: Convert data URL to blob
const dataURLToBlob = (dataUrl: string): Blob => {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(parts[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);

  for (let i = 0; i < n; i += 1) {
    u8arr[i] = bstr.charCodeAt(i);
  }

  return new Blob([u8arr], { type: mime });
};
