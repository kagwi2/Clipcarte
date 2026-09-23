import { CaptionTransitionEffect } from '../types';

export interface TransitionOptionItem {
  id: CaptionTransitionEffect;
  label: string;
  badge: string;
  description: string;
  iconType: 'pop' | 'slide-in' | 'slide-up' | 'bounce' | 'zoom' | 'fade' | 'none';
}

export const TRANSITION_PRESETS: TransitionOptionItem[] = [
  {
    id: 'pop',
    label: 'Pop & Snap',
    badge: 'Hormozi / Viral',
    description: 'High-energy scale explosion with snap settling',
    iconType: 'pop',
  },
  {
    id: 'slide-in',
    label: 'Slide-In (Lateral)',
    badge: 'TikTok / Reels',
    description: 'Dynamic horizontal slide with soft spring damping',
    iconType: 'slide-in',
  },
  {
    id: 'slide-up',
    label: 'Slide-Up (Rising)',
    badge: 'Modern',
    description: 'Elevates smoothly from bottom for readable flow',
    iconType: 'slide-up',
  },
  {
    id: 'bounce',
    label: 'Elastic Bounce',
    badge: 'MrBeast',
    description: 'Playful overshoot bounce with energetic impact',
    iconType: 'bounce',
  },
  {
    id: 'zoom',
    label: 'Zoom Punch',
    badge: 'Aggressive',
    description: 'Punches inward from foreground to grab attention',
    iconType: 'zoom',
  },
  {
    id: 'fade',
    label: 'Smooth Dissolve',
    badge: 'Cinematic',
    description: 'Soft opacity dissolve for clean unobtrusive subtitles',
    iconType: 'fade',
  },
  {
    id: 'none',
    label: 'Instant Cut',
    badge: 'Direct',
    description: 'Zero transition delay, switches immediately',
    iconType: 'none',
  },
];

export function getMotionVariants(
  entryEffect: CaptionTransitionEffect = 'pop',
  exitEffect: CaptionTransitionEffect = 'pop',
  duration: number = 0.22
) {
  // Resolve Entry
  const getInitial = () => {
    switch (entryEffect) {
      case 'pop':
      case 'pop-in':
        return { opacity: 0, scale: 0.45, y: 0, x: 0 };
      case 'slide-in':
        return { opacity: 0, x: -50, scale: 1, y: 0 };
      case 'slide-up':
        return { opacity: 0, y: 35, scale: 1, x: 0 };
      case 'bounce':
        return { opacity: 0, y: -30, scale: 0.8, x: 0 };
      case 'zoom':
        return { opacity: 0, scale: 1.45, y: 0, x: 0 };
      case 'fade':
        return { opacity: 0, scale: 1, y: 0, x: 0 };
      case 'none':
      default:
        return { opacity: 1, scale: 1, y: 0, x: 0 };
    }
  };

  const getAnimate = () => {
    switch (entryEffect) {
      case 'pop':
      case 'pop-in':
        return {
          opacity: 1,
          scale: 1,
          x: 0,
          y: 0,
          transition: {
            type: 'spring' as const,
            damping: 14,
            stiffness: 380,
            mass: 0.7,
            duration,
          },
        };
      case 'slide-in':
        return {
          opacity: 1,
          x: 0,
          scale: 1,
          y: 0,
          transition: {
            type: 'spring' as const,
            damping: 18,
            stiffness: 320,
            duration,
          },
        };
      case 'slide-up':
        return {
          opacity: 1,
          y: 0,
          scale: 1,
          x: 0,
          transition: {
            type: 'spring' as const,
            damping: 16,
            stiffness: 340,
            duration,
          },
        };
      case 'bounce':
        return {
          opacity: 1,
          y: 0,
          scale: 1,
          x: 0,
          transition: {
            type: 'spring' as const,
            bounce: 0.55,
            damping: 11,
            stiffness: 320,
            duration: Math.max(duration, 0.3),
          },
        };
      case 'zoom':
        return {
          opacity: 1,
          scale: 1,
          y: 0,
          x: 0,
          transition: {
            type: 'spring' as const,
            damping: 15,
            stiffness: 360,
            duration,
          },
        };
      case 'fade':
        return {
          opacity: 1,
          scale: 1,
          y: 0,
          x: 0,
          transition: {
            duration,
            ease: 'easeOut' as const,
          },
        };
      case 'none':
      default:
        return {
          opacity: 1,
          scale: 1,
          y: 0,
          x: 0,
          transition: { duration: 0.01 },
        };
    }
  };

  const getExit = () => {
    const exitDuration = Math.max(0.12, duration * 0.75);
    switch (exitEffect) {
      case 'pop':
      case 'pop-in':
        return {
          opacity: 0,
          scale: 0.6,
          y: 0,
          x: 0,
          transition: { duration: exitDuration, ease: 'easeIn' as const },
        };
      case 'slide-in':
        return {
          opacity: 0,
          x: 45,
          scale: 1,
          y: 0,
          transition: { duration: exitDuration, ease: 'easeIn' as const },
        };
      case 'slide-up':
        return {
          opacity: 0,
          y: -25,
          scale: 1,
          x: 0,
          transition: { duration: exitDuration, ease: 'easeIn' as const },
        };
      case 'bounce':
        return {
          opacity: 0,
          y: 20,
          scale: 0.85,
          x: 0,
          transition: { duration: exitDuration, ease: 'easeIn' as const },
        };
      case 'zoom':
        return {
          opacity: 0,
          scale: 1.3,
          y: 0,
          x: 0,
          transition: { duration: exitDuration, ease: 'easeIn' as const },
        };
      case 'fade':
        return {
          opacity: 0,
          scale: 1,
          y: 0,
          x: 0,
          transition: { duration: exitDuration, ease: 'easeIn' as const },
        };
      case 'none':
      default:
        return {
          opacity: 0,
          transition: { duration: 0.01 },
        };
    }
  };

  return {
    initial: getInitial(),
    animate: getAnimate(),
    exit: getExit(),
  };
}
