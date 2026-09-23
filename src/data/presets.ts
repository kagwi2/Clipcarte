import { CaptionStyle, CaptionPreset, VideoInfo } from '../types';

export const CAPTION_PRESETS: Record<CaptionPreset, CaptionStyle> = {
  hormozi: {
    preset: 'hormozi',
    fontFamily: "'Montserrat', 'Anton', sans-serif",
    fontSize: 34,
    textColor: '#FFFFFF',
    highlightColor: '#FFE600',
    strokeColor: '#000000',
    strokeWidth: 4,
    backgroundColor: 'transparent',
    backgroundPadding: 8,
    borderRadius: 8,
    positionY: 72,
    textTransform: 'uppercase',
    animationStyle: 'pop',
    entryTransition: 'pop',
    exitTransition: 'pop',
    transitionDuration: 0.22,
    showBackgroundPill: false,
    boxShadow: true,
  },
  mrbeast: {
    preset: 'mrbeast',
    fontFamily: "'Rubik', 'Montserrat', sans-serif",
    fontSize: 36,
    textColor: '#FFFFFF',
    highlightColor: '#00F0FF',
    strokeColor: '#000000',
    strokeWidth: 5,
    backgroundColor: '#000000cc',
    backgroundPadding: 10,
    borderRadius: 14,
    positionY: 70,
    textTransform: 'uppercase',
    animationStyle: 'bounce',
    entryTransition: 'bounce',
    exitTransition: 'bounce',
    transitionDuration: 0.28,
    showBackgroundPill: true,
    boxShadow: true,
  },
  tiktok: {
    preset: 'tiktok',
    fontFamily: "'Poppins', 'Inter', sans-serif",
    fontSize: 28,
    textColor: '#FFFFFF',
    highlightColor: '#FACC15',
    strokeColor: '#000000',
    strokeWidth: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    backgroundPadding: 8,
    borderRadius: 8,
    positionY: 75,
    textTransform: 'none',
    animationStyle: 'highlight',
    entryTransition: 'slide-in',
    exitTransition: 'slide-in',
    transitionDuration: 0.24,
    showBackgroundPill: true,
    boxShadow: false,
  },
  neon: {
    preset: 'neon',
    fontFamily: "'Anton', 'Montserrat', sans-serif",
    fontSize: 32,
    textColor: '#F43F5E',
    highlightColor: '#22D3EE',
    strokeColor: '#000000',
    strokeWidth: 3,
    backgroundColor: 'transparent',
    backgroundPadding: 6,
    borderRadius: 6,
    positionY: 70,
    textTransform: 'uppercase',
    animationStyle: 'pop',
    entryTransition: 'zoom',
    exitTransition: 'fade',
    transitionDuration: 0.2,
    showBackgroundPill: false,
    boxShadow: true,
  },
  classic: {
    preset: 'classic',
    fontFamily: "'Inter', sans-serif",
    fontSize: 26,
    textColor: '#FFFFFF',
    highlightColor: '#38BDF8',
    strokeColor: '#000000',
    strokeWidth: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    backgroundPadding: 8,
    borderRadius: 6,
    positionY: 82,
    textTransform: 'none',
    animationStyle: 'none',
    entryTransition: 'slide-up',
    exitTransition: 'fade',
    transitionDuration: 0.25,
    showBackgroundPill: true,
    boxShadow: false,
  },
  minimal: {
    preset: 'minimal',
    fontFamily: "'Inter', sans-serif",
    fontSize: 24,
    textColor: '#F8FAFC',
    highlightColor: '#F59E0B',
    strokeColor: '#000000',
    strokeWidth: 1,
    backgroundColor: 'transparent',
    backgroundPadding: 4,
    borderRadius: 4,
    positionY: 80,
    textTransform: 'none',
    animationStyle: 'none',
    entryTransition: 'fade',
    exitTransition: 'fade',
    transitionDuration: 0.25,
    showBackgroundPill: false,
    boxShadow: true,
  },
};

export interface SampleVideoItem {
  name: string;
  category: string;
  sourceType: 'youtube' | 'local';
  url: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: number;
  initialStartTime: number;
  initialEndTime: number;
  defaultCaptions: Array<{ id: string; startTime: number; endTime: number; text: string }>;
  suggestedHooks: string[];
}

export const SAMPLE_VIDEOS: SampleVideoItem[] = [
  {
    name: 'Podcast Interview (High-Fi MP4)',
    category: 'Full Canvas MP4 Export',
    sourceType: 'local',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    title: 'High Performance Mindset & Focus',
    author: 'Creator Studio Lab',
    thumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80',
    duration: 60,
    initialStartTime: 0,
    initialEndTime: 22,
    defaultCaptions: [
      { id: 'c-1', startTime: 0.5, endTime: 3.8, text: 'Most people never realize this key secret.' },
      { id: 'c-2', startTime: 4.0, endTime: 7.6, text: 'Consistency beats talent every single day.' },
      { id: 'c-3', startTime: 8.0, endTime: 12.2, text: 'When you wake up with total clarity and zero distractions,' },
      { id: 'c-4', startTime: 12.5, endTime: 16.8, text: 'you accomplish in 2 hours what takes others 2 weeks.' },
      { id: 'c-5', startTime: 17.0, endTime: 21.5, text: 'Share this with someone who needs to hear it!' }
    ],
    suggestedHooks: ['The 2-Hour Productivity Rule ⚡', 'Why Talent Is Overrated', 'The Morning Habit That Changed Everything']
  },
  {
    name: 'MKBHD Tech Talk (YouTube)',
    category: 'YouTube Showcase',
    sourceType: 'youtube',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // fallback or sample
    title: 'The Future of AI Hardware & Devices',
    author: 'Marques Brownlee',
    thumbnail: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
    duration: 180,
    initialStartTime: 12,
    initialEndTime: 42,
    defaultCaptions: [
      { id: 'c-1', startTime: 12.0, endTime: 16.0, text: 'So I have been testing this for three weeks.' },
      { id: 'c-2', startTime: 16.5, endTime: 21.0, text: 'And the difference is genuinely night and day.' },
      { id: 'c-3', startTime: 21.5, endTime: 26.2, text: 'Look at the speed comparison right here.' },
      { id: 'c-4', startTime: 26.8, endTime: 33.0, text: 'It renders 4K timeline in under 12 seconds flat.' },
      { id: 'c-5', startTime: 33.5, endTime: 41.5, text: 'Would you actually upgrade for this? Let me know below!' }
    ],
    suggestedHooks: ['Is This The End of Laptops?! 🤯', '3 Weeks Testing This AI Device', 'Do NOT Buy Before Watching This']
  },
  {
    name: 'Big Buck Bunny (Direct Video)',
    category: 'Full Canvas MP4 Export',
    sourceType: 'local',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    title: 'Cinematic Animation Clip',
    author: 'Blender Open Movie',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    duration: 60,
    initialStartTime: 5,
    initialEndTime: 25,
    defaultCaptions: [
      { id: 'c-1', startTime: 5.2, endTime: 8.8, text: 'Peaceful morning in the enchanted forest.' },
      { id: 'c-2', startTime: 9.2, endTime: 13.5, text: 'Notice how every detail comes alive.' },
      { id: 'c-3', startTime: 14.0, endTime: 18.2, text: 'Crafted entirely with open-source 3D tools.' },
      { id: 'c-4', startTime: 18.8, endTime: 24.5, text: 'Vertical 9:16 Shorts export with live burned captions!' }
    ],
    suggestedHooks: ['How 3D Creators Make Viral Shorts 🎨', 'Animation Secrets Revealed', 'From 16:9 to 9:16 In Seconds']
  },
  {
    name: 'For Bigger Blazes (Direct Video)',
    category: 'Full Canvas MP4 Export',
    sourceType: 'local',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'Action & Chromecast Adventure',
    author: 'Google Media Sample',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    duration: 15,
    initialStartTime: 0,
    initialEndTime: 15,
    defaultCaptions: [
      { id: 'c-1', startTime: 0.5, endTime: 4.2, text: 'Stream everything anywhere in pure HD.' },
      { id: 'c-2', startTime: 4.5, endTime: 9.0, text: 'Instant casting with zero lag on all devices.' },
      { id: 'c-3', startTime: 9.5, endTime: 14.5, text: 'Transform your short-form video workflow now!' }
    ],
    suggestedHooks: ['Top 3 Gadget Hacks 📱', 'Never Watch Videos The Same Way', 'Instant Vertical Crop Magic']
  }
];
