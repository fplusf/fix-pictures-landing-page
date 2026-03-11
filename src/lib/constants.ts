export const CANVAS_SIZE = 2000;
export const TARGET_SCALE = 0.85; // 85%

export type MarketplacePreset = 'amazon' | 'ebay' | 'etsy';
export interface QueuedImage {
  dataUrl: string;
  fileName?: string;
}

export const MARKETPLACE_PRESETS: Record<MarketplacePreset, {
  label: string;
  description: string;
  minResolution: number;
  strictWhite: boolean;
}> = {
  amazon: {
    label: 'Amazon',
    description: 'AI cutout + 85% framing + 2000px square',
    minResolution: 2000,
    strictWhite: true,
  },
  ebay: {
    label: 'eBay',
    description: 'White or light background, 1600px min',
    minResolution: 1600,
    strictWhite: true,
  },
  etsy: {
    label: 'Etsy',
    description: 'Lifestyle-friendly, 2000px recommended',
    minResolution: 2000,
    strictWhite: false,
  },
};
