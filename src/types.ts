export type AspectRatioPreset = '9:16' | '1:1' | '16:9' | '4:5' | '2:3' | '21:9' | '4:3' | 'custom';

export interface AspectRatioOption {
  id: AspectRatioPreset;
  label: string;
  sublabel: string;
  ratioW: number;
  ratioH: number;
  defaultWidth: number;
  defaultHeight: number;
  platforms: string[];
}

export type VideoSourceType = 'youtube' | 'local' | 'sample';

export interface VideoInfo {
  type: VideoSourceType;
  id: string;
  title: string;
  authorName?: string;
  thumbnailUrl?: string;
  url: string;
  duration: number; // in seconds
  fileBlob?: Blob;
  localVideoUrl?: string;
}

export interface CaptionItem {
  id: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
  color?: string;
  highlightWordIndex?: number;
}

export type CaptionPreset = 'hormozi' | 'mrbeast' | 'tiktok' | 'neon' | 'classic' | 'minimal';

export type CaptionTransitionEffect = 'pop' | 'pop-in' | 'slide-in' | 'slide-up' | 'bounce' | 'fade' | 'zoom' | 'none';

export type AutoPositionPreset = 'top-third' | 'center' | 'bottom' | 'custom';

export interface CaptionStyle {
  preset: CaptionPreset;
  fontFamily: string;
  fontSize: number; // rem/px scale
  textColor: string;
  highlightColor: string;
  strokeColor: string;
  strokeWidth: number; // px
  backgroundColor: string;
  backgroundPadding: number;
  borderRadius: number;
  positionY: number; // 10 to 90 percentage from top
  autoPosition?: AutoPositionPreset;
  textTransform: 'uppercase' | 'none' | 'capitalize';
  animationStyle: 'pop' | 'bounce' | 'highlight' | 'none';
  entryTransition?: CaptionTransitionEffect;
  exitTransition?: CaptionTransitionEffect;
  transitionDuration?: number; // in seconds
  showBackgroundPill: boolean;
  boxShadow: boolean;
}

export interface SuggestedClip {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  viralityScore: number;
  hookText: string;
  reason: string;
}

export type MusicGenre = 'lofi' | 'phonk' | 'cinematic' | 'synthwave' | 'upbeat' | 'ambient' | 'custom';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  genre: MusicGenre;
  bpm: number;
  duration: number; // in seconds
  audioUrl?: string;
  isCustom?: boolean;
  mood: string;
  gradient: string;
}

export interface BackgroundMusicSettings {
  enabled: boolean;
  selectedTrackId: string;
  volume: number; // 0.0 to 1.0
  videoVolume: number; // 0.0 to 1.0
  audioDucking: boolean; // lower music during captions/speech
  duckingAmount: number; // duck multiplier e.g. 0.3
  loop: boolean;
  customTrack?: {
    id: string;
    name: string;
    url: string;
    size?: number;
    duration?: number;
  } | null;
}

export interface ClipSettings {
  startTime: number;
  endTime: number;
  aspectRatio: AspectRatioPreset;
  customWidth: number;
  customHeight: number;
  lockAspectRatio: boolean;
  fitMode: 'cover' | 'contain' | 'blurred-fit';
  blurBackground?: boolean;
  blurIntensity?: number;
  panX: number; // -50 to 50 percent
  panY: number; // -50 to 50 percent
  zoom: number; // 1.0 to 2.5
  volume: number; // 0 to 1
  loop: boolean;
  topBannerText: string;
  showTopBanner: boolean;
  musicSettings?: BackgroundMusicSettings;
}
