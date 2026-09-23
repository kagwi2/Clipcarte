import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Sparkles,
  Flame,
  Tag,
  Play,
  RotateCcw,
  Zap,
  MoveRight,
  ArrowUp,
  Maximize2,
  Minimize2,
  Repeat,
  Sliders,
  Layers,
  Check,
  Info,
  Crop,
  AlignVerticalJustifyStart,
  AlignCenterVertical,
  AlignVerticalJustifyEnd,
  Target,
  ShieldCheck,
  Smartphone,
  Monitor,
  MoveVertical,
} from 'lucide-react';
import { CaptionPreset, CaptionStyle, CaptionTransitionEffect, ClipSettings, AutoPositionPreset } from '../types';
import { CAPTION_PRESETS } from '../data/presets';
import { TRANSITION_PRESETS, getMotionVariants } from '../utils/captionTransitions';
import { getTargetDimensions } from '../utils/aspectRatioUtils';
import { AUTO_POSITIONS, getOptimalPositionY, detectMatchingPreset } from '../utils/autoPositionUtils';

interface CaptionStylingPanelProps {
  captionStyle: CaptionStyle;
  clipSettings: ClipSettings;
  onUpdateCaptionStyle: (newStyle: Partial<CaptionStyle>) => void;
  onUpdateClipSettings: (newSettings: Partial<ClipSettings>) => void;
}

const COLOR_PALETTE = [
  '#FFE600', // Hormozi Yellow
  '#22C55E', // Vivid Green
  '#00F0FF', // MrBeast Cyan
  '#FF007A', // Neon Pink
  '#F97316', // Bright Orange
  '#FFFFFF', // Crisp White
  '#A855F7', // Violet
];

const PREVIEW_PHRASES = [
  'THIS CHANGED EVERYTHING 🔥',
  'WAIT FOR THE END 🤯',
  'SECRET VIRAL TRICK ⚡',
  '10X YOUR VIEWS NOW 🚀',
];

export const CaptionStylingPanel: React.FC<CaptionStylingPanelProps> = ({
  captionStyle,
  clipSettings,
  onUpdateCaptionStyle,
  onUpdateClipSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'transitions' | 'appearance' | 'layout' | 'background'>('transitions');
  const [linkEntryExit, setLinkEntryExit] = useState<boolean>(true);
  const [phraseIndex, setPhraseIndex] = useState<number>(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(true);
  const [autoLoopPreview, setAutoLoopPreview] = useState<boolean>(true);

  const entryEffect: CaptionTransitionEffect = captionStyle.entryTransition || 'pop';
  const exitEffect: CaptionTransitionEffect = captionStyle.exitTransition || 'pop';
  const transitionDuration: number = captionStyle.transitionDuration ?? 0.24;

  // Compute Framer Motion variants for active style
  const motionVariants = useMemo(() => {
    return getMotionVariants(entryEffect, exitEffect, transitionDuration);
  }, [entryEffect, exitEffect, transitionDuration]);

  // Aspect ratio awareness for auto-positioning
  const targetDim = useMemo(() => getTargetDimensions(clipSettings), [clipSettings]);

  const topThirdY = useMemo(
    () => getOptimalPositionY('top-third', clipSettings.aspectRatio, targetDim.isVertical),
    [clipSettings.aspectRatio, targetDim.isVertical]
  );
  const centerY = useMemo(
    () => getOptimalPositionY('center', clipSettings.aspectRatio, targetDim.isVertical),
    [clipSettings.aspectRatio, targetDim.isVertical]
  );
  const bottomY = useMemo(
    () => getOptimalPositionY('bottom', clipSettings.aspectRatio, targetDim.isVertical),
    [clipSettings.aspectRatio, targetDim.isVertical]
  );

  const activeAutoPositionPreset = useMemo(() => {
    return detectMatchingPreset(captionStyle.positionY, clipSettings.aspectRatio, targetDim.isVertical);
  }, [captionStyle.positionY, clipSettings.aspectRatio, targetDim.isVertical]);

  // Keep auto-position synchronized when switching aspect ratios if preset is chosen
  useEffect(() => {
    if (captionStyle.autoPosition && captionStyle.autoPosition !== 'custom') {
      const optimalY = getOptimalPositionY(
        captionStyle.autoPosition,
        clipSettings.aspectRatio,
        targetDim.isVertical
      );
      if (captionStyle.positionY !== optimalY) {
        onUpdateCaptionStyle({ positionY: optimalY });
      }
    }
  }, [clipSettings.aspectRatio, targetDim.isVertical]);

  const handleSelectAutoPosition = (preset: 'top-third' | 'center' | 'bottom') => {
    const newY = getOptimalPositionY(preset, clipSettings.aspectRatio, targetDim.isVertical);
    onUpdateCaptionStyle({
      autoPosition: preset,
      positionY: newY,
    });
  };

  const handleSliderPositionChange = (newY: number) => {
    const matching = detectMatchingPreset(newY, clipSettings.aspectRatio, targetDim.isVertical);
    onUpdateCaptionStyle({
      positionY: newY,
      autoPosition: matching,
    });
  };

  // Auto-looping animation player for the preview stage
  useEffect(() => {
    if (!autoLoopPreview) return;

    const interval = setInterval(() => {
      // Exit current caption
      setIsPreviewVisible(false);
      setTimeout(() => {
        // Cycle phrase and enter next caption
        setPhraseIndex((prev) => (prev + 1) % PREVIEW_PHRASES.length);
        setIsPreviewVisible(true);
      }, (transitionDuration * 1000) + 180);
    }, 2400);

    return () => clearInterval(interval);
  }, [autoLoopPreview, transitionDuration]);

  const handleManualReplay = () => {
    setIsPreviewVisible(false);
    setTimeout(() => {
      setPhraseIndex((prev) => (prev + 1) % PREVIEW_PHRASES.length);
      setIsPreviewVisible(true);
    }, 150);
  };

  const handleApplyPreset = (presetName: CaptionPreset) => {
    const preset = CAPTION_PRESETS[presetName];
    if (preset) {
      onUpdateCaptionStyle({ ...preset });
    }
  };

  const handleSelectEntryTransition = (effect: CaptionTransitionEffect) => {
    if (linkEntryExit) {
      onUpdateCaptionStyle({
        entryTransition: effect,
        exitTransition: effect,
      });
    } else {
      onUpdateCaptionStyle({ entryTransition: effect });
    }
    // Instant re-trigger animation to preview
    handleManualReplay();
  };

  const handleSelectExitTransition = (effect: CaptionTransitionEffect) => {
    onUpdateCaptionStyle({ exitTransition: effect });
    handleManualReplay();
  };

  const activeTextAnimationValue = useMemo(() => {
    if (entryEffect === 'fade') return 'fade';
    if (entryEffect === 'slide-in') return 'slide-in';
    if (entryEffect === 'pop' || entryEffect === 'pop-in') return 'pop';
    return entryEffect;
  }, [entryEffect]);

  const activeTextAnimationLabel = useMemo(() => {
    switch (activeTextAnimationValue) {
      case 'fade':
        return 'Fade';
      case 'slide-in':
        return 'Slide-in';
      case 'pop':
        return 'Pop-in';
      default:
        return activeTextAnimationValue;
    }
  }, [activeTextAnimationValue]);

  const handleTextAnimationChange = (val: string) => {
    let targetEffect: CaptionTransitionEffect = 'pop';
    if (val === 'fade') targetEffect = 'fade';
    else if (val === 'slide-in') targetEffect = 'slide-in';
    else if (val === 'pop' || val === 'pop-in') targetEffect = 'pop';
    else targetEffect = val as CaptionTransitionEffect;

    handleSelectEntryTransition(targetEffect);
  };

  const activePhrase = PREVIEW_PHRASES[phraseIndex];

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              Caption Styling & Motion
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                framer-motion
              </span>
            </h3>
            <p className="text-xs text-zinc-400">Cinematic transitions, typography & viral presets</p>
          </div>
        </div>
      </div>

      {/* Live Framer Motion Animation Stage */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-3.5 space-y-2.5 relative overflow-hidden shadow-inner">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Live Transition Stage</span>
            <span className="text-[10px] text-zinc-500 font-mono">
              ({entryEffect} → {exitEffect})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAutoLoopPreview(!autoLoopPreview)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                autoLoopPreview
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
              title="Toggle automatic replay loop"
            >
              <Repeat className={`w-2.5 h-2.5 ${autoLoopPreview ? 'text-amber-400' : ''}`} />
              <span>{autoLoopPreview ? 'Looping' : 'Paused'}</span>
            </button>

            <button
              type="button"
              onClick={handleManualReplay}
              className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              title="Replay transition now"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Animated Display Area */}
        <div className="h-24 sm:h-28 rounded-xl bg-gradient-to-b from-zinc-900/60 to-black/80 border border-white/5 flex items-center justify-center p-3 relative overflow-hidden">
          {/* Subtle background grid pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

          <AnimatePresence mode="wait">
            {isPreviewVisible && (
              <motion.div
                key={`${phraseIndex}-${entryEffect}-${exitEffect}`}
                initial={motionVariants.initial}
                animate={motionVariants.animate}
                exit={motionVariants.exit}
                className={`text-center max-w-[95%] select-none z-10 ${
                  captionStyle.showBackgroundPill
                    ? 'bg-black/85 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-md shadow-2xl'
                    : ''
                }`}
                style={{
                  fontFamily: captionStyle.fontFamily,
                  textTransform: captionStyle.textTransform,
                }}
              >
                <span
                  className="font-black leading-tight tracking-wide drop-shadow-md select-none inline-block text-base sm:text-lg"
                  style={{
                    color: captionStyle.textColor,
                    WebkitTextStroke: `${Math.min(captionStyle.strokeWidth, 2)}px ${captionStyle.strokeColor}`,
                    textShadow: captionStyle.boxShadow ? '0 4px 14px rgba(0,0,0,0.9)' : 'none',
                  }}
                >
                  {activePhrase.split(/\s+/).map((word, wIdx) => {
                    const isKeyWord = wIdx === 1 || wIdx === 2;
                    return (
                      <span
                        key={wIdx}
                        className="inline-block mr-1.5"
                        style={{
                          color: isKeyWord ? captionStyle.highlightColor : captionStyle.textColor,
                        }}
                      >
                        {word}
                      </span>
                    );
                  })}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Transition Quick Badges */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
          <span className="flex items-center gap-1 truncate">
            Entry: <strong className="text-amber-400 capitalize">{entryEffect}</strong> • Exit:{' '}
            <strong className="text-amber-400 capitalize">{exitEffect}</strong>
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            {transitionDuration.toFixed(2)}s spring
          </span>
        </div>
      </div>

      {/* Text Animation Primary Dropdown Bar */}
      <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800/90 space-y-2.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <label htmlFor="text-animation-dropdown" className="text-xs font-bold text-white flex items-center gap-1.5">
                Text Animation
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                  On-Screen Appearance
                </span>
              </label>
              <p className="text-[11px] text-zinc-400">
                Choose how captions animate onto the screen when they appear
              </p>
            </div>
          </div>

          <span className="text-[11px] font-mono px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300">
            Active: <strong className="text-amber-400">{activeTextAnimationLabel}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="sm:col-span-2">
            <select
              id="text-animation-dropdown"
              value={activeTextAnimationValue}
              onChange={(e) => handleTextAnimationChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-inner"
            >
              <option value="fade">Fade — Smooth cinematic opacity dissolve</option>
              <option value="slide-in">Slide-in — Lateral swipe spring entrance</option>
              <option value="pop">Pop-in — High-energy explosive scale bounce & snap</option>
              {!['fade', 'slide-in', 'pop', 'pop-in'].includes(entryEffect) && (
                <option value={entryEffect}>{entryEffect.toUpperCase()} — Custom effect</option>
              )}
            </select>
          </div>

          {/* Quick Click Switch Pills */}
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => handleTextAnimationChange('fade')}
              className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                activeTextAnimationValue === 'fade'
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-sm ring-1 ring-amber-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              Fade
            </button>
            <button
              type="button"
              onClick={() => handleTextAnimationChange('slide-in')}
              className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                activeTextAnimationValue === 'slide-in'
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-sm ring-1 ring-amber-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              Slide-in
            </button>
            <button
              type="button"
              onClick={() => handleTextAnimationChange('pop')}
              className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                activeTextAnimationValue === 'pop'
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-sm ring-1 ring-amber-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              Pop-in
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-800 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('transitions')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'transitions'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Zap className="w-3 h-3" />
          <span>Motion Transitions</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'appearance'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Palette className="w-3 h-3" />
          <span>Style & Fonts</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('layout')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'layout'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Target className="w-3 h-3" />
          <span>Auto-Position</span>
          {activeAutoPositionPreset !== 'custom' && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('background')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'background'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>Background</span>
        </button>
      </div>

      {/* TAB 1: Transitions Tab (framer-motion entry/exit effects) */}
      {activeTab === 'transitions' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Link Entry & Exit Toggle */}
          <div className="flex items-center justify-between bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
            <div>
              <span className="text-xs font-semibold text-zinc-200 block">
                Synchronize Entry & Exit
              </span>
              <span className="text-[10px] text-zinc-400">
                Apply symmetrical animation transitions on both appearance and exit
              </span>
            </div>
            <input
              type="checkbox"
              checked={linkEntryExit}
              onChange={(e) => setLinkEntryExit(e.target.checked)}
              className="accent-amber-500 rounded cursor-pointer w-4 h-4"
            />
          </div>

          {/* Text Animation Dropdown in Transitions Tab */}
          <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="text-animation-transitions-dropdown" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Text Animation
              </label>
              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                {activeTextAnimationLabel}
              </span>
            </div>
            <select
              id="text-animation-transitions-dropdown"
              value={activeTextAnimationValue}
              onChange={(e) => handleTextAnimationChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-inner"
            >
              <option value="fade">Fade (Cinematic opacity dissolve when captions appear)</option>
              <option value="slide-in">Slide-in (Lateral spring slide when captions appear)</option>
              <option value="pop">Pop-in (High-energy scale bounce & snap when captions appear)</option>
              {!['fade', 'slide-in', 'pop', 'pop-in'].includes(entryEffect) && (
                <option value={entryEffect}>{entryEffect} (Custom)</option>
              )}
            </select>
          </div>

          {/* Entry Transition Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <MoveRight className="w-3.5 h-3.5 text-amber-400" />
                {linkEntryExit ? 'Entry & Exit Animation' : 'Entry Transition'}
              </label>
              <span className="text-[10px] font-mono text-amber-400 uppercase">
                {entryEffect}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TRANSITION_PRESETS.map((preset) => {
                const isSelected = entryEffect === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectEntryTransition(preset.id)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400 shadow-lg shadow-amber-500/10'
                        : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{preset.label}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                    </div>
                    <span className="text-[9px] text-amber-400/80 font-mono block mb-0.5">
                      {preset.badge}
                    </span>
                    <p className="text-[10px] text-zinc-400 line-clamp-1">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Distinct Exit Transition Selector (if unlinked) */}
          {!linkEntryExit && (
            <div className="pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> Exit Transition
                </label>
                <span className="text-[10px] font-mono text-amber-400 uppercase">
                  {exitEffect}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TRANSITION_PRESETS.map((preset) => {
                  const isSelected = exitEffect === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectExitTransition(preset.id)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400'
                          : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{preset.label}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 line-clamp-1">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Speed & Spring Physics Slider */}
          <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-amber-400" /> Animation Duration & Snap
              </span>
              <span className="text-amber-400 font-mono">
                {transitionDuration.toFixed(2)}s
              </span>
            </div>
            <input
              type="range"
              min="0.12"
              max="0.55"
              step="0.02"
              value={transitionDuration}
              onChange={(e) => {
                onUpdateCaptionStyle({ transitionDuration: Number(e.target.value) });
                handleManualReplay();
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>Snappy (0.12s)</span>
              <span>Balanced (0.24s)</span>
              <span>Smooth (0.55s)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Appearance (Presets, Fonts, Colors, Toggles) */}
      {activeTab === 'appearance' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Preset Cards */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Viral Style Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'hormozi', name: 'Hormozi', desc: 'Bold Yellow', color: 'bg-yellow-400' },
                { id: 'mrbeast', name: 'MrBeast', desc: 'Cyan Bounce', color: 'bg-cyan-400' },
                { id: 'tiktok', name: 'TikTok', desc: 'Clean Slide', color: 'bg-zinc-600' },
                { id: 'neon', name: 'Neon Glow', desc: 'Cyberpunk', color: 'bg-rose-500' },
                { id: 'classic', name: 'Classic', desc: 'Subtitles', color: 'bg-zinc-500' },
                { id: 'minimal', name: 'Minimal', desc: 'Simple', color: 'bg-zinc-700' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleApplyPreset(item.id as CaptionPreset)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    captionStyle.preset === item.id
                      ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400'
                      : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{item.name}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  </div>
                  <p className="text-[10px] text-zinc-400">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Font Family & Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-300 mb-1.5 block">Font Family</label>
              <select
                value={captionStyle.fontFamily}
                onChange={(e) => onUpdateCaptionStyle({ fontFamily: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
              >
                <option value="'Montserrat', 'Anton', sans-serif">Montserrat (Ultra Bold)</option>
                <option value="'Anton', 'Montserrat', sans-serif">Anton (Impact Style)</option>
                <option value="'Rubik', 'Montserrat', sans-serif">Rubik (Bouncy Modern)</option>
                <option value="'Poppins', 'Inter', sans-serif">Poppins (Clean TikTok)</option>
                <option value="'Inter', sans-serif">Inter (Standard Subtitle)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-zinc-300 mb-1.5">
                <span>Font Size</span>
                <span className="text-amber-400 font-mono">{captionStyle.fontSize}px</span>
              </div>
              <input
                type="range"
                min="18"
                max="52"
                value={captionStyle.fontSize}
                onChange={(e) => onUpdateCaptionStyle({ fontSize: Number(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Text Animation Dropdown in Style & Fonts Tab */}
          <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="text-animation-appearance-dropdown" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Text Animation
              </label>
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                {activeTextAnimationLabel}
              </span>
            </div>
            <select
              id="text-animation-appearance-dropdown"
              value={activeTextAnimationValue}
              onChange={(e) => handleTextAnimationChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-inner"
            >
              <option value="fade">Fade — Smooth opacity dissolve when appearing</option>
              <option value="slide-in">Slide-in — Lateral spring entrance</option>
              <option value="pop">Pop-in — High-energy scale pop & snap</option>
              {!['fade', 'slide-in', 'pop', 'pop-in'].includes(entryEffect) && (
                <option value={entryEffect}>{entryEffect} — Custom effect</option>
              )}
            </select>
            <p className="text-[10.5px] text-zinc-400">
              Select entrance animation effect for captions when they appear on screen.
            </p>
          </div>

          {/* Highlight Color Quick Swatches */}
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-2 block">
              Keyword Highlight Color
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onUpdateCaptionStyle({ highlightColor: color })}
                  className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                    captionStyle.highlightColor.toLowerCase() === color.toLowerCase()
                      ? 'border-white scale-110 shadow-lg'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Color: ${color}`}
                />
              ))}
              <input
                type="color"
                value={captionStyle.highlightColor}
                onChange={(e) => onUpdateCaptionStyle({ highlightColor: e.target.value })}
                className="w-7 h-7 rounded-full bg-transparent border-0 cursor-pointer p-0"
                title="Custom color picker"
              />
            </div>
          </div>

          {/* Toggles: Uppercase, Stroke, Background Pill */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() =>
                onUpdateCaptionStyle({
                  textTransform: captionStyle.textTransform === 'uppercase' ? 'none' : 'uppercase',
                })
              }
              className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                captionStyle.textTransform === 'uppercase'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400'
              }`}
            >
              ALL CAPS
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateCaptionStyle({
                  strokeWidth: captionStyle.strokeWidth > 0 ? 0 : 3,
                })
              }
              className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                captionStyle.strokeWidth > 0
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400'
              }`}
            >
              Outline
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateCaptionStyle({
                  showBackgroundPill: !captionStyle.showBackgroundPill,
                })
              }
              className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                captionStyle.showBackgroundPill
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400'
              }`}
            >
              Backdrop Pill
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Layout & Position */}
      {activeTab === 'layout' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Auto-Positioning Main Card */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Auto-Positioning
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                      Aspect-Ratio Aware
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Snap captions to calibrated viral zones for {clipSettings.aspectRatio} ({targetDim.simplifiedRatio})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
                {targetDim.isVertical ? (
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Monitor className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span className="font-semibold text-white">{clipSettings.aspectRatio}</span>
                <span className="text-zinc-500 font-mono">({targetDim.width}×{targetDim.height})</span>
              </div>
            </div>

            {/* Auto-Position Presets Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 1. Top-Third */}
              <button
                type="button"
                onClick={() => handleSelectAutoPosition('top-third')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                  activeAutoPositionPreset === 'top-third'
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/40'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <AlignVerticalJustifyStart
                        className={`w-4 h-4 ${
                          activeAutoPositionPreset === 'top-third' ? 'text-amber-400' : 'text-zinc-400'
                        }`}
                      />
                      <span>Top-Third</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        activeAutoPositionPreset === 'top-third'
                          ? 'bg-amber-500/30 text-amber-300'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {topThirdY}%
                    </span>
                  </div>
                  <p className="text-[10.5px] text-zinc-400 leading-tight">
                    Upper third headroom. Leaves facial reactions and action clear while sitting below platform search bars.
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500">Unobstructed face</span>
                  {activeAutoPositionPreset === 'top-third' && (
                    <span className="text-amber-400 flex items-center gap-0.5 font-semibold">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
              </button>

              {/* 2. Center Vertically */}
              <button
                type="button"
                onClick={() => handleSelectAutoPosition('center')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                  activeAutoPositionPreset === 'center'
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/40'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <AlignCenterVertical
                        className={`w-4 h-4 ${
                          activeAutoPositionPreset === 'center' ? 'text-amber-400' : 'text-zinc-400'
                        }`}
                      />
                      <span>Center Vertically</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        activeAutoPositionPreset === 'center'
                          ? 'bg-amber-500/30 text-amber-300'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {centerY}%
                    </span>
                  </div>
                  <p className="text-[10.5px] text-zinc-400 leading-tight">
                    True optical center (50%). The go-to viral style for Hormozi and MrBeast rapid single-word punchlines.
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500">Max focal retention</span>
                  {activeAutoPositionPreset === 'center' && (
                    <span className="text-amber-400 flex items-center gap-0.5 font-semibold">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
              </button>

              {/* 3. Bottom Anchor */}
              <button
                type="button"
                onClick={() => handleSelectAutoPosition('bottom')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                  activeAutoPositionPreset === 'bottom'
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/40'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <AlignVerticalJustifyEnd
                        className={`w-4 h-4 ${
                          activeAutoPositionPreset === 'bottom' ? 'text-amber-400' : 'text-zinc-400'
                        }`}
                      />
                      <span>Bottom Anchor</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        activeAutoPositionPreset === 'bottom'
                          ? 'bg-emerald-500/30 text-emerald-300'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {bottomY}% Safe
                    </span>
                  </div>
                  <p className="text-[10.5px] text-zinc-400 leading-tight">
                    {targetDim.isVertical
                      ? 'Calibrated safe zone directly above TikTok & Reels usernames, descriptions, and audio tickers.'
                      : 'Broadcast lower-third placement positioned safely above YouTube player scrubber.'}
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500">Social safe zone</span>
                  {activeAutoPositionPreset === 'bottom' && (
                    <span className="text-emerald-400 flex items-center gap-0.5 font-semibold">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Interactive Visual Aspect-Ratio Framing Wireframe */}
            <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 flex flex-col sm:flex-row items-center gap-4">
              {/* Miniature frame preview with clickable vertical zones */}
              <div className="flex flex-col items-center shrink-0">
                <span className="text-[10px] font-bold text-zinc-400 mb-1.5 flex items-center gap-1">
                  <MoveVertical className="w-3 h-3 text-amber-400" /> Click to Snap Zone
                </span>
                <div
                  className="relative rounded-lg border-2 border-zinc-700 bg-zinc-950 overflow-hidden shadow-md flex items-center justify-center select-none"
                  style={{
                    width: targetDim.isVertical ? '76px' : clipSettings.aspectRatio === '1:1' ? '92px' : '128px',
                    height: targetDim.isVertical ? '135px' : clipSettings.aspectRatio === '1:1' ? '92px' : '72px',
                  }}
                >
                  {/* Top-Third zone target */}
                  <button
                    type="button"
                    onClick={() => handleSelectAutoPosition('top-third')}
                    title={`Snap to Top-Third (${topThirdY}%)`}
                    className="absolute inset-x-0 top-0 cursor-pointer group hover:bg-amber-500/15 transition-colors"
                    style={{ height: `${topThirdY + 8}%` }}
                  >
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-amber-300 transition-colors">
                      Top ⅓
                    </span>
                  </button>

                  {/* Top guideline */}
                  <div
                    className="absolute inset-x-0 border-t border-dashed border-zinc-800 pointer-events-none"
                    style={{ top: `${topThirdY}%` }}
                  />

                  {/* Center zone target */}
                  <button
                    type="button"
                    onClick={() => handleSelectAutoPosition('center')}
                    title={`Snap to Center (${centerY}%)`}
                    className="absolute inset-x-0 cursor-pointer group hover:bg-amber-500/15 transition-colors"
                    style={{
                      top: `${topThirdY + 9}%`,
                      bottom: `${100 - bottomY + 8}%`,
                    }}
                  >
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-amber-300 transition-colors">
                      Center
                    </span>
                  </button>

                  {/* Center guideline */}
                  <div
                    className="absolute inset-x-0 border-t border-dashed border-zinc-800 pointer-events-none"
                    style={{ top: '50%' }}
                  />

                  {/* Bottom zone target */}
                  <button
                    type="button"
                    onClick={() => handleSelectAutoPosition('bottom')}
                    title={`Snap to Bottom Anchor (${bottomY}%)`}
                    className="absolute inset-x-0 bottom-0 cursor-pointer group hover:bg-emerald-500/15 transition-colors"
                    style={{ height: `${100 - bottomY + 8}%` }}
                  >
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-emerald-300 transition-colors">
                      Bottom
                    </span>
                  </button>

                  {/* Bottom guideline */}
                  <div
                    className="absolute inset-x-0 border-t border-dashed border-zinc-800 pointer-events-none"
                    style={{ top: `${bottomY}%` }}
                  />

                  {/* 9:16 Social UI risk floor illustration */}
                  {targetDim.isVertical && (
                    <div
                      className="absolute inset-x-0 bottom-0 pointer-events-none bg-red-500/10 border-t border-red-500/30 flex items-center justify-center"
                      style={{ height: '22%' }}
                    >
                      <span className="text-[6.5px] text-red-300/80 font-mono tracking-tighter">
                        UI OVERLAYS
                      </span>
                    </div>
                  )}

                  {/* Live Caption Marker Pill */}
                  <div
                    className="absolute inset-x-1 pointer-events-none flex justify-center -translate-y-1/2 transition-all duration-200"
                    style={{ top: `${captionStyle.positionY}%` }}
                  >
                    <div className="px-1.5 py-0.5 rounded bg-amber-400 text-black text-[8px] font-black leading-none shadow-md whitespace-nowrap">
                      TEXT
                    </div>
                  </div>
                </div>
              </div>

              {/* Informative Safe-Zone Advisory Callout */}
              <div className="flex-1 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-zinc-200 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Platform Safe-Zone Guarantee</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {targetDim.isVertical ? (
                    <>
                      In vertical <strong className="text-zinc-200">9:16</strong> (TikTok, Reels, Shorts), the bottom 22% is occupied by creator profile tags, descriptions, sound tickers, and right-side action buttons. Selecting <strong className="text-amber-300">Bottom Anchor ({bottomY}%)</strong> guarantees your text never collides with social platform UI.
                    </>
                  ) : clipSettings.aspectRatio === '1:1' ? (
                    <>
                      In square <strong className="text-zinc-200">1:1</strong>, text remains balanced across feed cards. Subtitles at <strong className="text-amber-300">{bottomY}%</strong> clear standard Instagram and LinkedIn engagement buttons.
                    </>
                  ) : (
                    <>
                      In landscape <strong className="text-zinc-200">16:9</strong>, subtitles are anchored at <strong className="text-amber-300">{bottomY}%</strong> in the standard broadcast lower third, leaving the scrubber and control bar unobstructed.
                    </>
                  )}
                </p>
                <div className="flex items-center gap-2 pt-1 text-[10px] text-zinc-500 font-mono">
                  <span>Current Y: <strong className="text-amber-400">{captionStyle.positionY}%</strong></span>
                  <span>•</span>
                  <span>Preset: <strong className="text-zinc-300 capitalize">{activeAutoPositionPreset}</strong></span>
                </div>
              </div>
            </div>

            {/* Fine-Tune Slider with Quick-Snap Pills */}
            <div className="pt-2 border-t border-zinc-850">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 mb-1.5">
                <span>Fine-Tune Vertical Height</span>
                <span className="text-amber-400 font-mono font-bold bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                  {captionStyle.positionY}%
                </span>
              </div>

              <input
                type="range"
                min="18"
                max="88"
                step="1"
                value={captionStyle.positionY}
                onChange={(e) => handleSliderPositionChange(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />

              <div className="flex items-center justify-between gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => handleSelectAutoPosition('top-third')}
                  className={`text-[10.5px] px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                    activeAutoPositionPreset === 'top-third'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <AlignVerticalJustifyStart className="w-3 h-3" />
                  <span>Snap Top ⅓ ({topThirdY}%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectAutoPosition('center')}
                  className={`text-[10.5px] px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                    activeAutoPositionPreset === 'center'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <AlignCenterVertical className="w-3 h-3" />
                  <span>Snap Center (50%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectAutoPosition('bottom')}
                  className={`text-[10.5px] px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                    activeAutoPositionPreset === 'bottom'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <AlignVerticalJustifyEnd className="w-3 h-3" />
                  <span>Snap Bottom ({bottomY}%)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Text Animation Dropdown (Entrance Effect) */}
          <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="text-animation-layout-dropdown" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Text Animation (Entrance Effect)
              </label>
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                {activeTextAnimationLabel}
              </span>
            </div>
            <select
              id="text-animation-layout-dropdown"
              value={activeTextAnimationValue}
              onChange={(e) => handleTextAnimationChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="fade">Fade — Smooth opacity dissolve when appearing</option>
              <option value="slide-in">Slide-in — Lateral spring entrance</option>
              <option value="pop">Pop-in — High-energy scale pop & snap</option>
              {!['fade', 'slide-in', 'pop', 'pop-in'].includes(entryEffect) && (
                <option value={entryEffect}>{entryEffect} — Custom effect</option>
              )}
            </select>
          </div>

          {/* Word Animation Style */}
          <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 space-y-2">
            <label className="text-xs font-semibold text-zinc-300 block">
              In-Phrase Word Animation
            </label>
            <select
              value={captionStyle.animationStyle}
              onChange={(e) =>
                onUpdateCaptionStyle({
                  animationStyle: e.target.value as 'highlight' | 'bounce' | 'pop' | 'none',
                })
              }
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="highlight">Karaoke Active Word (Hormozi style)</option>
              <option value="bounce">Bouncy Pop-up</option>
              <option value="pop">High-Energy Pop</option>
              <option value="none">Static Smooth</option>
            </select>
          </div>

          {/* Viral Hook Top Banner */}
          <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" /> Viral Top Headline Hook
              </label>
              <input
                type="checkbox"
                checked={clipSettings.showTopBanner}
                onChange={(e) => onUpdateClipSettings({ showTopBanner: e.target.checked })}
                className="accent-amber-500 rounded cursor-pointer"
              />
            </div>
            {clipSettings.showTopBanner && (
              <input
                type="text"
                value={clipSettings.topBannerText}
                onChange={(e) => onUpdateClipSettings({ topBannerText: e.target.value })}
                placeholder="e.g., Wait for the twist 🤯 or Part 1"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Video Background Tab (Blurred Background Effect for non-16:9 aspect ratios) */}
      {activeTab === 'background' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Main Blurred Background Toggle Card */}
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Blurred Video Background
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      CSS backdrop-filter
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Fills non-16:9 letterbox areas with a duplicate video layer blurred with{' '}
                    <code className="text-amber-400 font-mono">backdrop-filter: blur(20px)</code>
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={
                    clipSettings.aspectRatio !== '16:9' &&
                    (clipSettings.fitMode === 'blurred-fit' || clipSettings.blurBackground === true)
                  }
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    onUpdateClipSettings({
                      blurBackground: isChecked,
                      fitMode: isChecked ? 'blurred-fit' : 'cover',
                      blurIntensity: clipSettings.blurIntensity || 20,
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Current Ratio Context Indicator */}
            {clipSettings.aspectRatio === '16:9' ? (
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Current ratio is <strong>16:9 Landscape</strong> (native widescreen). The blurred backdrop activates when creating non-16:9 clips (e.g. 9:16 Shorts, 1:1 Square, 4:5 Portrait).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateClipSettings({
                      aspectRatio: '9:16',
                      customWidth: 1080,
                      customHeight: 1920,
                      fitMode: 'blurred-fit',
                      blurBackground: true,
                    });
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                >
                  Switch to 9:16
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active on <strong>{clipSettings.aspectRatio}</strong> format
                </span>
                <span className="text-zinc-400 font-mono text-[10px]">
                  CSS blur({clipSettings.blurIntensity || 20}px)
                </span>
              </div>
            )}
          </div>

          {/* Aspect Ratio Framing Modes */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Crop className="w-3.5 h-3.5 text-amber-400" /> Non-16:9 Framing Method
            </label>

            <div className="grid grid-cols-2 gap-2">
              {/* Option 1: Blurred Fit */}
              <button
                type="button"
                onClick={() => {
                  onUpdateClipSettings({
                    fitMode: 'blurred-fit',
                    blurBackground: true,
                  });
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  clipSettings.fitMode === 'blurred-fit' || clipSettings.blurBackground
                    ? 'bg-amber-500/15 border-amber-500/40 text-white shadow-md shadow-amber-500/5'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-amber-400" /> Blurred Fit
                  </span>
                  {(clipSettings.fitMode === 'blurred-fit' || clipSettings.blurBackground) && (
                    <Check className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Letterbox filled by duplicate background video layer with 20px blur.
                </p>
              </button>

              {/* Option 2: Cover Zoom Crop */}
              <button
                type="button"
                onClick={() => {
                  onUpdateClipSettings({
                    fitMode: 'cover',
                    blurBackground: false,
                  });
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  clipSettings.fitMode === 'cover' && !clipSettings.blurBackground
                    ? 'bg-amber-500/15 border-amber-500/40 text-white shadow-md shadow-amber-500/5'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <Crop className="w-3.5 h-3.5 text-amber-400" /> Zoom Crop
                  </span>
                  {clipSettings.fitMode === 'cover' && !clipSettings.blurBackground && (
                    <Check className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Scales & crops 16:9 video to fill frame completely.
                </p>
              </button>
            </div>
          </div>

          {/* Blur Intensity Preset Buttons & Slider */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <span>Blur Intensity</span>
                <span className="text-[10px] font-mono text-amber-400 font-bold">
                  {clipSettings.blurIntensity || 20}px
                </span>
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">
                backdrop-filter: blur({clipSettings.blurIntensity || 20}px)
              </span>
            </div>

            {/* Quick Blur Intensity Pills */}
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {[
                { label: 'Subtle', val: 10 },
                { label: '20px (Default)', val: 20 },
                { label: 'Deep', val: 32 },
                { label: 'Dreamy', val: 48 },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => onUpdateClipSettings({ blurIntensity: item.val })}
                  className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer text-center truncate ${
                    (clipSettings.blurIntensity || 20) === item.val
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                      : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Slider */}
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={clipSettings.blurIntensity || 20}
              onChange={(e) => onUpdateClipSettings({ blurIntensity: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Quick Aspect Ratio Switcher */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-semibold text-zinc-400">
              Preview on Non-16:9 Formats:
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: '9:16', label: '9:16', desc: 'Shorts/TikTok', w: 1080, h: 1920 },
                { id: '1:1', label: '1:1', desc: 'Instagram', w: 1080, h: 1080 },
                { id: '4:5', label: '4:5', desc: 'Portrait', w: 1080, h: 1350 },
                { id: '16:9', label: '16:9', desc: 'Landscape', w: 1920, h: 1080 },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onUpdateClipSettings({
                      aspectRatio: r.id as any,
                      customWidth: r.w,
                      customHeight: r.h,
                      fitMode: r.id === '16:9' ? 'cover' : 'blurred-fit',
                      blurBackground: r.id !== '16:9',
                    });
                  }}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    clipSettings.aspectRatio === r.id
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                      : 'bg-zinc-950/70 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <span className="block text-xs font-bold">{r.label}</span>
                  <span className="block text-[9px] text-zinc-500 truncate">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
