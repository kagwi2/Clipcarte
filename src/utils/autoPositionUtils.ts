import { AspectRatioPreset, AutoPositionPreset } from '../types';

export interface AutoPositionConfig {
  id: 'top-third' | 'center' | 'bottom';
  label: string;
  shortLabel: string;
  tagline: string;
  iconName: string;
  getYPercent: (aspectRatio: string, isVertical: boolean) => number;
  description: string;
  safeZoneNote: string;
}

export const AUTO_POSITIONS: AutoPositionConfig[] = [
  {
    id: 'top-third',
    label: 'Top-Third',
    shortLabel: 'Top ⅓',
    tagline: 'Upper Third Headroom',
    iconName: 'AlignVerticalJustifyStart',
    getYPercent: (aspectRatio: string, isVertical: boolean) => {
      switch (aspectRatio) {
        case '9:16':
          return 32;
        case '2:3':
          return 30;
        case '4:5':
          return 28;
        case '1:1':
          return 28;
        case '16:9':
          return 24;
        case '21:9':
          return 22;
        case '4:3':
          return 26;
        default:
          return isVertical ? 30 : 25;
      }
    },
    description: 'Placed in the upper third of the video, below top headers and status bars.',
    safeZoneNote: 'Ideal for clips with central subject movement or lower-body framing.',
  },
  {
    id: 'center',
    label: 'Center Vertically',
    shortLabel: 'Center',
    tagline: 'Dead Optical Center',
    iconName: 'AlignCenterVertical',
    getYPercent: () => 50,
    description: 'Exact 50% vertical center for maximum viewer focus and viral punchlines.',
    safeZoneNote: 'Best for Hormozi/MrBeast single-word punch captions and high-energy hooks.',
  },
  {
    id: 'bottom',
    label: 'Bottom Anchor',
    shortLabel: 'Bottom',
    tagline: 'Platform Safe Zone',
    iconName: 'AlignVerticalJustifyEnd',
    getYPercent: (aspectRatio: string, isVertical: boolean) => {
      switch (aspectRatio) {
        case '9:16':
          return 74; // Safe from TikTok/Reels bottom caption, sound ticker & buttons
        case '2:3':
          return 76;
        case '4:5':
          return 78;
        case '1:1':
          return 80;
        case '16:9':
          return 84; // Standard broadcast subtitle placement
        case '21:9':
          return 84;
        case '4:3':
          return 82;
        default:
          return isVertical ? 74 : 82;
      }
    },
    description: 'Positioned safely above platform UI overlays, usernames, and music tags.',
    safeZoneNote: 'Specially calibrated to prevent TikTok/Reels icons from covering your subtitles.',
  },
];

/**
 * Calculates optimal Y percentage based on position preset and aspect ratio
 */
export function getOptimalPositionY(
  preset: 'top-third' | 'center' | 'bottom',
  aspectRatio: string,
  isVertical: boolean
): number {
  const config = AUTO_POSITIONS.find((p) => p.id === preset);
  if (!config) return 50;
  return config.getYPercent(aspectRatio, isVertical);
}

/**
 * Identifies if the current position matches or is very close to an auto-position preset
 */
export function detectMatchingPreset(
  currentY: number,
  aspectRatio: string,
  isVertical: boolean
): 'top-third' | 'center' | 'bottom' | 'custom' {
  const topY = getOptimalPositionY('top-third', aspectRatio, isVertical);
  const centerY = getOptimalPositionY('center', aspectRatio, isVertical);
  const bottomY = getOptimalPositionY('bottom', aspectRatio, isVertical);

  if (Math.abs(currentY - topY) <= 2) return 'top-third';
  if (Math.abs(currentY - centerY) <= 2) return 'center';
  if (Math.abs(currentY - bottomY) <= 2) return 'bottom';

  return 'custom';
}
