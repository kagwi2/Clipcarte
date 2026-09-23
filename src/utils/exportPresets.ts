import { AspectRatioPreset, CaptionPreset, ClipSettings } from '../types';

export interface ExportPresetConfig {
  id: string;
  name: string;
  platform: 'tiktok' | 'reels' | 'shorts' | 'feed' | 'twitter' | 'square' | 'custom';
  badge: string;
  description: string;
  aspectRatio: AspectRatioPreset;
  customWidth: number;
  customHeight: number;
  fitMode: 'cover' | 'contain' | 'blurred-fit';
  showTopBanner: boolean;
  captionPresetKey?: CaptionPreset;
  format?: 'mp4' | 'webm';
  isCustom?: boolean;
  createdAt?: number;
}

export const DEFAULT_EXPORT_PRESETS: ExportPresetConfig[] = [
  {
    id: 'preset-tiktok',
    name: 'TikTok Standard',
    platform: 'tiktok',
    badge: '9:16 • 1080×1920',
    description: 'High-retention 9:16 vertical crop with safe-zone headline and punchy dynamic captions',
    aspectRatio: '9:16',
    customWidth: 1080,
    customHeight: 1920,
    fitMode: 'cover',
    showTopBanner: true,
    captionPresetKey: 'hormozi',
    format: 'mp4',
  },
  {
    id: 'preset-reels',
    name: 'Instagram Reels',
    platform: 'reels',
    badge: '9:16 • 1080×1920',
    description: 'Full-bleed 9:16 vertical framing with clean typography optimized for Instagram viewer margins',
    aspectRatio: '9:16',
    customWidth: 1080,
    customHeight: 1920,
    fitMode: 'cover',
    showTopBanner: true,
    captionPresetKey: 'tiktok',
    format: 'mp4',
  },
  {
    id: 'preset-shorts',
    name: 'YouTube Shorts',
    platform: 'shorts',
    badge: '9:16 • 1080×1920',
    description: 'Fast-paced Shorts preset with high-contrast MrBeast captions and top viral hook banner',
    aspectRatio: '9:16',
    customWidth: 1080,
    customHeight: 1920,
    fitMode: 'cover',
    showTopBanner: true,
    captionPresetKey: 'mrbeast',
    format: 'mp4',
  },
  {
    id: 'preset-feed',
    name: 'Instagram Feed (Portrait)',
    platform: 'feed',
    badge: '4:5 • 1080×1350',
    description: '4:5 vertical portrait format designed to capture maximum vertical feed real-estate',
    aspectRatio: '4:5',
    customWidth: 1080,
    customHeight: 1350,
    fitMode: 'cover',
    showTopBanner: false,
    captionPresetKey: 'minimal',
  },
  {
    id: 'preset-square',
    name: 'Square Carousel / Post',
    platform: 'square',
    badge: '1:1 • 1080×1080',
    description: '1:1 square canvas with ambient blurred backdrop for letterboxed landscape videos',
    aspectRatio: '1:1',
    customWidth: 1080,
    customHeight: 1080,
    fitMode: 'blurred-fit',
    showTopBanner: false,
    captionPresetKey: 'classic',
  },
  {
    id: 'preset-twitter',
    name: 'Twitter / LinkedIn (16:9)',
    platform: 'twitter',
    badge: '16:9 • 1920×1080',
    description: 'Crisp 16:9 widescreen presentation with subtle subtitles for desktop and social feeds',
    aspectRatio: '16:9',
    customWidth: 1920,
    customHeight: 1080,
    fitMode: 'cover',
    showTopBanner: false,
    captionPresetKey: 'classic',
  },
];

const STORAGE_KEY = 'clipcraft_custom_export_presets_v1';

export function getCustomPresets(): ExportPresetConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomPreset(preset: Omit<ExportPresetConfig, 'id' | 'isCustom' | 'createdAt'>): ExportPresetConfig {
  const customPresets = getCustomPresets();
  const newPreset: ExportPresetConfig = {
    ...preset,
    id: `custom-preset-${Date.now()}`,
    isCustom: true,
    createdAt: Date.now(),
  };

  const updated = [newPreset, ...customPresets];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to persist custom preset to localStorage', e);
  }

  return newPreset;
}

export function deleteCustomPreset(presetId: string): void {
  const customPresets = getCustomPresets();
  const updated = customPresets.filter((p) => p.id !== presetId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to delete custom preset from localStorage', e);
  }
}

export function matchesPreset(preset: ExportPresetConfig, settings: ClipSettings): boolean {
  return (
    preset.aspectRatio === settings.aspectRatio &&
    preset.customWidth === settings.customWidth &&
    preset.customHeight === settings.customHeight &&
    preset.fitMode === settings.fitMode &&
    Boolean(preset.showTopBanner) === Boolean(settings.showTopBanner)
  );
}
