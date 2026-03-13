/**
 * Preprocessing utilities for AI background removal
 * Helps the AI model detect edges better, especially for white-on-white products
 */

/**
 * Detects if an image is predominantly light/white and needs edge enhancement
 */
export const needsEdgeEnhancement = (imageData: ImageData): boolean => {
  const { data, width, height } = imageData;
  const total = width * height;
  const sampleSize = Math.min(5000, Math.floor(total * 0.1)); // Sample 10% or 5000 pixels
  const step = Math.max(1, Math.floor(total / sampleSize));

  let lightPixelCount = 0;
  let totalBrightness = 0;

  for (let i = 0; i < total; i += step) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const brightness = (r + g + b) / 3;

    totalBrightness += brightness;

    // Consider pixel "light" if brightness >= 200
    if (brightness >= 200) {
      lightPixelCount += 1;
    }
  }

  const sampledPixels = Math.floor(total / step);
  const lightRatio = lightPixelCount / sampledPixels;
  const avgBrightness = totalBrightness / sampledPixels;

  // Needs enhancement if 60%+ pixels are light OR average brightness > 210
  return lightRatio >= 0.6 || avgBrightness >= 210;
};

/**
 * Applies edge enhancement to help AI detect white-on-white products
 * Uses a combination of contrast boost and edge sharpening
 */
export const applyEdgeEnhancement = (imageData: ImageData): ImageData => {
  const { width, height, data } = imageData;
  const enhanced = new Uint8ClampedArray(data);

  // Step 1: Increase contrast to make edges more visible
  const contrastFactor = 1.3; // 30% contrast boost
  const midpoint = 128;

  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast boost to RGB channels
    enhanced[i] = clamp(midpoint + (data[i] - midpoint) * contrastFactor);
    enhanced[i + 1] = clamp(midpoint + (data[i + 1] - midpoint) * contrastFactor);
    enhanced[i + 2] = clamp(midpoint + (data[i + 2] - midpoint) * contrastFactor);
    // Keep alpha unchanged
    enhanced[i + 3] = data[i + 3];
  }

  // Step 2: Apply subtle edge sharpening (unsharp mask)
  const sharpened = applyUnsharpMask(
    new ImageData(enhanced, width, height),
    1.5, // Amount
    1.0, // Radius
  );

  return sharpened;
};

/**
 * Applies unsharp mask for edge sharpening
 * Classic technique: sharpen = original + (original - blurred) * amount
 */
const applyUnsharpMask = (imageData: ImageData, amount: number, radius: number): ImageData => {
  const { width, height, data } = imageData;
  const blurred = gaussianBlur(imageData, radius);
  const output = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    // Apply unsharp mask to RGB channels
    for (let channel = 0; channel < 3; channel++) {
      const idx = i + channel;
      const original = data[idx];
      const blur = blurred.data[idx];
      const diff = original - blur;
      output[idx] = clamp(original + diff * amount);
    }
    // Keep alpha unchanged
    output[i + 3] = data[i + 3];
  }

  return new ImageData(output, width, height);
};

/**
 * Simple Gaussian blur for unsharp mask
 */
const gaussianBlur = (imageData: ImageData, radius: number): ImageData => {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data);

  // Simple box blur approximation (3-pass for Gaussian-like result)
  const kernelSize = Math.max(3, Math.floor(radius * 2) + 1);
  const halfKernel = Math.floor(kernelSize / 2);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const targetIdx = (y * width + x) * 4;

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let count = 0;

      for (let kx = -halfKernel; kx <= halfKernel; kx++) {
        const sampleX = Math.min(width - 1, Math.max(0, x + kx));
        const sampleIdx = (y * width + sampleX) * 4;

        sumR += data[sampleIdx];
        sumG += data[sampleIdx + 1];
        sumB += data[sampleIdx + 2];
        count += 1;
      }

      output[targetIdx] = sumR / count;
      output[targetIdx + 1] = sumG / count;
      output[targetIdx + 2] = sumB / count;
      output[targetIdx + 3] = data[targetIdx + 3]; // Keep alpha
    }
  }

  // Vertical pass
  const temp = new Uint8ClampedArray(output);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const targetIdx = (y * width + x) * 4;

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let count = 0;

      for (let ky = -halfKernel; ky <= halfKernel; ky++) {
        const sampleY = Math.min(height - 1, Math.max(0, y + ky));
        const sampleIdx = (sampleY * width + x) * 4;

        sumR += temp[sampleIdx];
        sumG += temp[sampleIdx + 1];
        sumB += temp[sampleIdx + 2];
        count += 1;
      }

      output[targetIdx] = sumR / count;
      output[targetIdx + 1] = sumG / count;
      output[targetIdx + 2] = sumB / count;
      output[targetIdx + 3] = temp[targetIdx + 3]; // Keep alpha
    }
  }

  return new ImageData(output, width, height);
};

/**
 * Clamps a value between 0 and 255
 */
const clamp = (value: number): number => Math.min(255, Math.max(0, Math.round(value)));

/**
 * Converts ImageData to Blob for AI processing
 * Uses OffscreenCanvas for Web Worker compatibility
 */
export const imageDataToBlob = async (imageData: ImageData): Promise<Blob> => {
  // Use OffscreenCanvas which works in both main thread and workers
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas context');

  ctx.putImageData(imageData, 0, 0);

  // OffscreenCanvas.convertToBlob() instead of canvas.toBlob()
  return canvas.convertToBlob({
    type: 'image/png',
    quality: 1.0,
  });
};

/**
 * Loads Blob as ImageData
 * Uses createImageBitmap for Web Worker compatibility
 */
export const blobToImageData = async (blob: Blob): Promise<ImageData> => {
  // createImageBitmap works in both main thread and workers
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Failed to create canvas context');

    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
};
