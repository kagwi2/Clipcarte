import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Move, Sparkles } from 'lucide-react';
import { CaptionItem, CaptionStyle, ClipSettings, VideoInfo } from '../types';
import { formatSeconds } from '../utils/subtitleUtils';
import { getTargetDimensions } from '../utils/aspectRatioUtils';
import { getMotionVariants } from '../utils/captionTransitions';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VideoPlayerPreviewProps {
  video: VideoInfo;
  clipSettings: ClipSettings;
  captionStyle: CaptionStyle;
  captions: CaptionItem[];
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onUpdateClipSettings: (newSettings: Partial<ClipSettings>) => void;
  onUpdateCaptionStyle: (newStyle: Partial<CaptionStyle>) => void;
  videoElementRef: React.RefObject<HTMLVideoElement | null>;
}

export const VideoPlayerPreview: React.FC<VideoPlayerPreviewProps> = ({
  video,
  clipSettings,
  captionStyle,
  captions,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onPlayPause,
  onSeek,
  onUpdateClipSettings,
  onUpdateCaptionStyle,
  videoElementRef,
}) => {
  const [activeWordIdx, setActiveWordIdx] = useState<number>(0);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const isYtReady = useRef(false);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  const targetDim = getTargetDimensions(clipSettings);
  const isNon16x9 = clipSettings.aspectRatio !== '16:9';
  const showBlurredBg =
    isNon16x9 &&
    (clipSettings.fitMode === 'blurred-fit' || clipSettings.blurBackground === true);

  const motionVariants = useMemo(() => {
    return getMotionVariants(
      captionStyle.entryTransition || 'pop',
      captionStyle.exitTransition || 'pop',
      captionStyle.transitionDuration ?? 0.24
    );
  }, [captionStyle.entryTransition, captionStyle.exitTransition, captionStyle.transitionDuration]);

  // Load YouTube Iframe API if video is YouTube
  useEffect(() => {
    if (video.type !== 'youtube') return;

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!ytContainerRef.current) return;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
      }

      ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
        videoId: video.id,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          start: Math.floor(clipSettings.startTime),
        },
        events: {
          onReady: (event: any) => {
            isYtReady.current = true;
            event.target.seekTo(clipSettings.startTime, true);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    }

    return () => {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
      }
    };
  }, [video.id, video.type]);

  // Sync YouTube play/pause
  useEffect(() => {
    if (video.type === 'youtube' && isYtReady.current && ytPlayerRef.current) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.playVideo();
        } else {
          ytPlayerRef.current.pauseVideo();
        }
      } catch {}
    }
  }, [isPlaying, video.type]);

  // YouTube polling timer for playback tracking
  useEffect(() => {
    if (video.type !== 'youtube') return;

    const interval = setInterval(() => {
      if (isYtReady.current && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const t = ytPlayerRef.current.getCurrentTime();
          if (typeof t === 'number' && !isNaN(t)) {
            onTimeUpdate(t);

            if (t >= clipSettings.endTime) {
              if (clipSettings.loop) {
                ytPlayerRef.current.seekTo(clipSettings.startTime, true);
                onTimeUpdate(clipSettings.startTime);
              } else {
                ytPlayerRef.current.pauseVideo();
                onPlayPause();
              }
            }
          }
        } catch {}
      }
    }, 100);

    return () => clearInterval(interval);
  }, [video.type, clipSettings.startTime, clipSettings.endTime, clipSettings.loop, isPlaying]);

  // Sync HTML5 video play/pause
  useEffect(() => {
    const el = videoElementRef.current;
    if (!el || video.type === 'youtube') return;

    if (isPlaying) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isPlaying, video.type]);

  // Sync background video layer play/pause
  useEffect(() => {
    const bgEl = bgVideoRef.current;
    if (!bgEl || video.type === 'youtube' || !showBlurredBg) return;

    if (isPlaying) {
      bgEl.play().catch(() => {});
    } else {
      bgEl.pause();
    }
  }, [isPlaying, video.type, showBlurredBg]);

  // Sync background video layer time
  useEffect(() => {
    const bgEl = bgVideoRef.current;
    if (!bgEl || video.type === 'youtube' || !showBlurredBg) return;

    if (Math.abs(bgEl.currentTime - currentTime) > 0.4) {
      bgEl.currentTime = currentTime;
    }
  }, [currentTime, video.type, showBlurredBg]);

  // Handle HTML5 video time updates
  const handleHtml5TimeUpdate = () => {
    const el = videoElementRef.current;
    if (!el) return;
    const t = el.currentTime;
    onTimeUpdate(t);

    if (t >= clipSettings.endTime) {
      if (clipSettings.loop) {
        el.currentTime = clipSettings.startTime;
        el.play().catch(() => {});
        if (bgVideoRef.current) {
          bgVideoRef.current.currentTime = clipSettings.startTime;
          bgVideoRef.current.play().catch(() => {});
        }
      } else {
        el.pause();
        if (bgVideoRef.current) bgVideoRef.current.pause();
        onPlayPause();
      }
    }
  };

  const handleReplayClip = () => {
    if (video.type === 'youtube' && ytPlayerRef.current && isYtReady.current) {
      ytPlayerRef.current.seekTo(clipSettings.startTime, true);
      ytPlayerRef.current.playVideo();
      if (!isPlaying) onPlayPause();
    } else if (videoElementRef.current) {
      videoElementRef.current.currentTime = clipSettings.startTime;
      videoElementRef.current.play().catch(() => {});
      if (bgVideoRef.current) {
        bgVideoRef.current.currentTime = clipSettings.startTime;
        bgVideoRef.current.play().catch(() => {});
      }
      if (!isPlaying) onPlayPause();
    }
    onSeek(clipSettings.startTime);
  };

  // Find active caption
  const activeCaption = captions.find(
    (c) => currentTime >= c.startTime && currentTime <= c.endTime
  );

  // Word highlight effect logic
  useEffect(() => {
    if (!activeCaption) return;
    const duration = activeCaption.endTime - activeCaption.startTime;
    const progress = Math.max(0, Math.min(1, (currentTime - activeCaption.startTime) / duration));
    const words = activeCaption.text.trim().split(/\s+/);
    const index = Math.min(words.length - 1, Math.floor(progress * words.length));
    setActiveWordIdx(index);
  }, [currentTime, activeCaption]);

  // Calculate dynamic responsive dimensions for container
  // Max container height: 500px, max width: 460px
  const maxH = 490;
  const maxW = 460;
  let containerW: number;
  let containerH: number;

  if (targetDim.isVertical) {
    // Taller than wide (e.g. 9:16, 4:5, 2:3)
    containerH = maxH;
    containerW = Math.round(maxH * targetDim.aspectRatioValue);
    if (containerW > maxW) {
      containerW = maxW;
      containerH = Math.round(maxW / targetDim.aspectRatioValue);
    }
  } else {
    // Wider than tall or square (e.g. 16:9, 21:9, 1:1, 4:3)
    containerW = maxW;
    containerH = Math.round(maxW / targetDim.aspectRatioValue);
    if (containerH > maxH) {
      containerH = maxH;
      containerW = Math.round(maxH * targetDim.aspectRatioValue);
    }
  }

  // Ensure reasonable minimum bounds
  containerW = Math.max(220, containerW);
  containerH = Math.max(160, containerH);

  // Compute YouTube scale factor for Zoom Crop mode
  const ytNativeRatio = 16 / 9; // 1.777
  const r = targetDim.aspectRatioValue;
  const ytScale = Math.max(ytNativeRatio / r, r / ytNativeRatio) * (clipSettings.zoom || 1);

  // Compute responsive caption font scale factor
  const fontScaleFactor = Math.min(1.15, Math.max(0.68, containerW / 360));
  const effectiveFontSize = Math.round(captionStyle.fontSize * fontScaleFactor);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Main Viewport Container */}
      <div className="relative group flex items-center justify-center p-2">
        <div
          className="relative overflow-hidden rounded-3xl bg-black border-2 border-zinc-800 shadow-2xl transition-all duration-300"
          style={{
            width: `${containerW}px`,
            height: `${containerH}px`,
            aspectRatio: targetDim.cssAspectRatio,
          }}
        >
          {/* Duplicate Video Layer with CSS backdrop-filter: blur(20px) for non-16:9 aspect ratios */}
          {showBlurredBg && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              {video.type === 'local' || video.type === 'sample' ? (
                <video
                  ref={bgVideoRef}
                  src={video.localVideoUrl || video.url}
                  className="w-full h-full object-cover scale-125 select-none"
                  muted
                  playsInline
                  autoPlay={isPlaying}
                  loop
                />
              ) : (
                <img
                  src={video.thumbnailUrl}
                  alt="Backdrop blur"
                  className="w-full h-full object-cover scale-125 select-none"
                />
              )}
              {/* CSS backdrop-filter: blur(20px) overlay effect */}
              <div
                className="absolute inset-0"
                style={{
                  backdropFilter: `blur(${clipSettings.blurIntensity || 20}px)`,
                  WebkitBackdropFilter: `blur(${clipSettings.blurIntensity || 20}px)`,
                  backgroundColor: 'rgba(0, 0, 0, 0.28)',
                }}
              />
            </div>
          )}

          {/* Actual Video Frame */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden z-10">
            {video.type === 'youtube' ? (
              <div
                className="w-full h-full relative"
                style={{
                  transform:
                    !showBlurredBg && clipSettings.fitMode === 'cover'
                      ? `scale(${ytScale}) translate(${clipSettings.panX}%, ${clipSettings.panY || 0}%)`
                      : 'none',
                  transition: 'transform 0.15s ease-out',
                }}
              >
                <div ref={ytContainerRef} className="w-full h-full pointer-events-none" />
              </div>
            ) : (
              <video
                ref={videoElementRef}
                src={video.localVideoUrl || video.url}
                className={`w-full h-full transition-transform duration-150 ${
                  showBlurredBg
                    ? 'object-contain z-10'
                    : clipSettings.fitMode === 'cover'
                    ? 'object-cover'
                    : 'object-contain z-10'
                }`}
                style={{
                  transform:
                    !showBlurredBg && clipSettings.fitMode === 'cover'
                      ? `translate(${clipSettings.panX}%, ${clipSettings.panY || 0}%) scale(${clipSettings.zoom || 1})`
                      : 'none',
                }}
                onTimeUpdate={handleHtml5TimeUpdate}
                playsInline
                crossOrigin="anonymous"
              />
            )}
          </div>

          {/* Top Hook Banner */}
          {clipSettings.showTopBanner && clipSettings.topBannerText && (
            <div className="absolute top-3.5 inset-x-2 z-30 pointer-events-none flex justify-center">
              <div className="bg-black/85 backdrop-blur-md px-3 py-1 rounded-xl border border-amber-500/40 shadow-xl text-center max-w-[92%]">
                <span className="text-[11px] sm:text-xs font-extrabold text-amber-300 tracking-wide uppercase drop-shadow line-clamp-1">
                  {clipSettings.topBannerText}
                </span>
              </div>
            </div>
          )}

          {/* Real-time Subtitles / Captions Overlay with Framer Motion transitions */}
          <div
            className="absolute inset-x-3 z-30 pointer-events-none flex justify-center"
            style={{ top: `${captionStyle.positionY}%` }}
          >
            <AnimatePresence mode="wait">
              {activeCaption && activeCaption.text && (
                <motion.div
                  key={activeCaption.id || `${activeCaption.startTime}-${activeCaption.text}`}
                  initial={motionVariants.initial}
                  animate={motionVariants.animate}
                  exit={motionVariants.exit}
                  className={`text-center max-w-[92%] -translate-y-1/2 ${
                    captionStyle.showBackgroundPill ? 'bg-black/80 px-2.5 py-1 rounded-xl backdrop-blur-xs' : ''
                  }`}
                  style={{
                    fontFamily: captionStyle.fontFamily,
                    textTransform: captionStyle.textTransform,
                  }}
                >
                  <span
                    className="font-black leading-tight tracking-wide drop-shadow-md select-none inline-block"
                    style={{
                      fontSize: `${effectiveFontSize}px`,
                      color: captionStyle.textColor,
                      WebkitTextStroke: `${captionStyle.strokeWidth}px ${captionStyle.strokeColor}`,
                      textShadow: captionStyle.boxShadow ? '0 4px 12px rgba(0,0,0,0.8)' : 'none',
                    }}
                  >
                    {captionStyle.animationStyle === 'highlight' || captionStyle.animationStyle === 'bounce' ? (
                      activeCaption.text.split(/\s+/).map((word, wIdx) => {
                        const isHighlighted = wIdx === activeWordIdx;
                        return (
                          <span
                            key={wIdx}
                            className={`inline-block mr-1 transition-transform duration-100 ${
                              isHighlighted && captionStyle.animationStyle === 'bounce'
                                ? 'scale-115 -translate-y-0.5'
                                : ''
                            }`}
                            style={{
                              color: isHighlighted
                                ? captionStyle.highlightColor
                                : captionStyle.textColor,
                            }}
                          >
                            {word}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ color: captionStyle.highlightColor || captionStyle.textColor }}>
                        {activeCaption.text}
                      </span>
                    )}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Resolution & Time watermark */}
          <div className="absolute bottom-2.5 left-2.5 z-30 pointer-events-none flex items-center gap-1.5">
            <span className="bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono text-amber-300 border border-amber-500/20">
              {targetDim.simplifiedRatio}
            </span>
            <span className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-300 border border-white/10">
              {formatSeconds(currentTime)} / {formatSeconds(clipSettings.endTime)}
            </span>
          </div>
        </div>

        {/* Quick Click-to-Play overlay on video */}
        <button
          type="button"
          onClick={onPlayPause}
          className="absolute inset-2 z-20 w-[calc(100%-1rem)] h-[calc(100%-1rem)] opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center bg-black/20 rounded-3xl cursor-pointer"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <div className="w-14 h-14 rounded-full bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl">
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-white translate-x-0.5" />}
          </div>
        </button>
      </div>

      {/* Floating Control Bar below preview */}
      <div className="mt-2 flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-2xl shadow-xl">
        <button
          type="button"
          onClick={handleReplayClip}
          className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
          title="Replay from clip start"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onPlayPause}
          className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center transition-all cursor-pointer shadow-md shadow-amber-500/20"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-black translate-x-0.5" />}
        </button>

        <div className="text-xs font-mono text-zinc-300 font-semibold px-1">
          {formatSeconds(currentTime)} <span className="text-zinc-500">/</span> {formatSeconds(clipSettings.endTime - clipSettings.startTime)}s
        </div>

        <div className="h-4 w-[1px] bg-zinc-800" />

        <button
          type="button"
          onClick={() => onUpdateClipSettings({ loop: !clipSettings.loop })}
          className={`px-2 py-0.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            clipSettings.loop ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title="Toggle clip looping"
        >
          Loop
        </button>
      </div>
    </div>
  );
};
