import { AspectRatioOption, AspectRatioPreset, ClipSettings } from '../types';

export const PREDEFINED_ASPECT_RATIOS: AspectRatioOption[] = [
  {
    id: '9:16',
    label: '9:16',
    sublabel: 'Shorts & Reels',
    ratioW: 9,
    ratioH: 16,
    defaultWidth: 1080,
    defaultHeight: 1920,
    platforms: ['TikTok', 'YouTube Shorts', 'Instagram Reels'],
  },
  {
    id: '1:1',
    label: '1:1',
    sublabel: 'Square Post',
    ratioW: 1,
    ratioH: 1,
    defaultWidth: 1080,
    defaultHeight: 1080,
    platforms: ['Instagram Post', 'LinkedIn', 'Facebook'],
  },
  {
    id: '4:5',
    label: '4:5',
    sublabel: 'IG Portrait',
    ratioW: 4,
    ratioH: 5,
    defaultWidth: 1080,
    defaultHeight: 1350,
    platforms: ['Instagram Feed', 'Facebook'],
  },
  {
    id: '16:9',
    label: '16:9',
    sublabel: 'Landscape Wide',
    ratioW: 16,
    ratioH: 9,
    defaultWidth: 1920,
    defaultHeight: 1080,
    platforms: ['YouTube', 'Twitter/X', 'Desktop'],
  },
  {
    id: '2:3',
    label: '2:3',
    sublabel: 'Social Portrait',
    ratioW: 2,
    ratioH: 3,
    defaultWidth: 1080,
    defaultHeight: 1620,
    platforms: ['Pinterest', 'Facebook Stories'],
  },
  {
    id: '21:9',
    label: '21:9',
    sublabel: 'Cinematic Ultrawide',
    ratioW: 21,
    ratioH: 9,
    defaultWidth: 2560,
    defaultHeight: 1080,
    platforms: ['Cinematic', 'Monitor'],
  },
  {
    id: '4:3',
    label: '4:3',
    sublabel: 'Classic Tablet',
    ratioW: 4,
    ratioH: 3,
    defaultWidth: 1440,
    defaultHeight: 1080,
    platforms: ['iPad', 'Classic TV'],
  },
  {
    id: 'custom',
    label: 'Custom',
    sublabel: 'Exact Dimensions',
    ratioW: 1,
    ratioH: 1,
    defaultWidth: 1080,
    defaultHeight: 1080,
    platforms: ['Any Size', 'Display Ads'],
  },
];

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

export function getSimplifiedRatio(width: number, height: number): string {
  if (!width || !height) return '1:1';
  const divisor = gcd(width, height);
  const w = Math.round(width / divisor);
  const h = Math.round(height / divisor);

  // If numbers are clean integers under 50
  if (w <= 32 && h <= 32) {
    return `${w}:${h}`;
  }

  // Otherwise decimal representation
  const dec = (width / height).toFixed(2);
  return `${dec}:1`;
}

export function getTargetDimensions(settings: ClipSettings): {
  width: number;
  height: number;
  aspectRatioValue: number; // width / height
  cssAspectRatio: string;
  isVertical: boolean;
  simplifiedRatio: string;
} {
  let w = settings.customWidth || 1080;
  let h = settings.customHeight || 1920;

  if (settings.aspectRatio !== 'custom') {
    const option = PREDEFINED_ASPECT_RATIOS.find((opt) => opt.id === settings.aspectRatio);
    if (option) {
      w = option.defaultWidth;
      h = option.defaultHeight;
    }
  }

  // Ensure even pixel numbers for video codec compatibility
  w = Math.max(120, Math.round(w / 2) * 2);
  h = Math.max(120, Math.round(h / 2) * 2);

  const aspectRatioValue = w / h;
  const isVertical = h > w;
  const simplifiedRatio = getSimplifiedRatio(w, h);

  return {
    width: w,
    height: h,
    aspectRatioValue,
    cssAspectRatio: `${w} / ${h}`,
    isVertical,
    simplifiedRatio,
  };
}
