import { CaptionItem, CaptionStyle, ClipSettings } from '../types';
import { getTargetDimensions } from './aspectRatioUtils';
import { generateProceduralMusicTrack } from './proceduralMusic';

export type ExportVideoFormat = 'mp4' | 'webm';

export interface ExportProgress {
  progress: number; // 0 to 100
  currentSecond: number;
  totalSeconds: number;
  status: 'preparing' | 'rendering' | 'encoding' | 'completed' | 'error';
  error?: string;
}

export interface ExportVideoOptions {
  format?: ExportVideoFormat;
  quality?: 'ultra' | 'high' | 'medium';
  bitrate?: number;
  burnSubtitles?: boolean;
}

export interface ExportClipResult {
  blob: Blob;
  format: ExportVideoFormat;
  mimeType: string;
  isNativeMp4: boolean;
  duration: number;
}

/**
 * Checks whether the current browser natively supports recording into an MP4 container
 * via MediaRecorder (supported in Chrome 104+, Edge, Safari 14.1+, iOS Safari).
 */
export function checkBrowserMp4Support(): {
  isMp4Supported: boolean;
  mimeType: string;
} {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return { isMp4Supported: true, mimeType: 'video/mp4' };
  }

  const mp4Candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4;codecs=h264,aac',
    'video/mp4;codecs=h264',
    'video/mp4;codecs=vp9,opus',
    'video/mp4',
  ];

  for (const candidate of mp4Candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return { isMp4Supported: true, mimeType: candidate };
    }
  }

  return { isMp4Supported: false, mimeType: 'video/webm' };
}

/**
 * Resolves the optimal MediaRecorder MIME type based on requested format and browser support.
 */
export function resolveExportMimeType(preferredFormat: ExportVideoFormat = 'mp4'): {
  recordMimeType: string | undefined;
  finalMimeType: string;
  isNativeMp4: boolean;
  format: ExportVideoFormat;
} {
  const mp4Support = checkBrowserMp4Support();

  if (preferredFormat === 'mp4') {
    if (mp4Support.isMp4Supported) {
      return {
        recordMimeType: mp4Support.mimeType,
        finalMimeType: mp4Support.mimeType,
        isNativeMp4: true,
        format: 'mp4',
      };
    }

    // If native MP4 recording is not available (e.g. older Firefox),
    // record in supported WebM and output with MP4 compatibility envelope
    const webmFallbacks = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    let fallback = 'video/webm';
    for (const f of webmFallbacks) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(f)) {
        fallback = f;
        break;
      }
    }

    return {
      recordMimeType: fallback,
      finalMimeType: 'video/mp4',
      isNativeMp4: false,
      format: 'mp4',
    };
  }

  // WebM requested
  const webmCandidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  let webmMime = 'video/webm';
  for (const candidate of webmCandidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) {
      webmMime = candidate;
      break;
    }
  }

  return {
    recordMimeType: webmMime,
    finalMimeType: webmMime,
    isNativeMp4: false,
    format: 'webm',
  };
}

/**
 * Renders HTML5 video clip to canvas with custom aspect framing, top hook banner,
 * burned-in kinetic subtitles and exports to MP4 or WebM.
 */
export async function exportHtml5VideoClip(
  sourceVideoEl: HTMLVideoElement,
  settings: ClipSettings,
  captionStyle: CaptionStyle,
  captions: CaptionItem[],
  onProgress?: (p: ExportProgress) => void,
  options?: ExportVideoOptions
): Promise<ExportClipResult> {
  return new Promise(async (resolve, reject) => {
    try {
      const requestedFormat = options?.format || 'mp4';
      const quality = options?.quality || 'high';
      const burnSubtitles = options?.burnSubtitles ?? true;

      // Determine bitrate
      let videoBitrate = 8_000_000; // 8 Mbps High
      if (options?.bitrate) {
        videoBitrate = options.bitrate;
      } else if (quality === 'ultra') {
        videoBitrate = 14_000_000; // 14 Mbps Ultra
      } else if (quality === 'medium') {
        videoBitrate = 4_000_000; // 4 Mbps Compact
      }

      const startTime = settings.startTime;
      const endTime = settings.endTime;
      const duration = Math.max(1, endTime - startTime);

      // Target canvas dimensions
      const targetDim = getTargetDimensions(settings);
      const targetWidth = targetDim.width;
      const targetHeight = targetDim.height;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        throw new Error('Could not obtain canvas 2D rendering context');
      }

      // Cloned offscreen video element for clean playback
      const renderVideo = document.createElement('video');
      renderVideo.crossOrigin = 'anonymous';
      renderVideo.src = sourceVideoEl.src;
      renderVideo.muted = false;
      renderVideo.volume = settings.volume ?? 1;
      renderVideo.playsInline = true;

      onProgress?.({
        progress: 0,
        currentSecond: 0,
        totalSeconds: duration,
        status: 'preparing',
      });

      await new Promise<void>((res, rej) => {
        renderVideo.onloadedmetadata = () => res();
        renderVideo.onerror = () => rej(new Error('Failed to load video source for rendering'));
      });

      renderVideo.currentTime = startTime;
      await new Promise<void>((res) => {
        renderVideo.onseeked = () => res();
      });

      // Capture canvas stream at 30 fps
      const canvasStream = canvas.captureStream(30);
      let combinedStream = canvasStream;

      // Prepare background music audio element if enabled
      let bgMusicAudio: HTMLAudioElement | null = null;
      let musicGainNode: GainNode | null = null;
      let audioCtx: AudioContext | null = null;

      if (settings.musicSettings?.enabled) {
        try {
          const trackId = settings.musicSettings.selectedTrackId || 'lofi-sunset';
          let audioUrl = settings.musicSettings.customTrack?.url;
          if (!audioUrl) {
            audioUrl = await generateProceduralMusicTrack(trackId);
          }
          if (audioUrl) {
            bgMusicAudio = new Audio();
            bgMusicAudio.crossOrigin = 'anonymous';
            bgMusicAudio.src = audioUrl;
            bgMusicAudio.loop = true;
            await new Promise<void>((r) => {
              if (!bgMusicAudio) return r();
              bgMusicAudio.onloadedmetadata = () => r();
              bgMusicAudio.onerror = () => r();
              setTimeout(r, 1000);
            });
          }
        } catch (mErr) {
          console.warn('Could not prepare background music for video export:', mErr);
        }
      }

      // Capture and mix audio stream (video audio + background music soundtrack)
      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const sourceNode = audioCtx.createMediaElementSource(renderVideo);
        const destNode = audioCtx.createMediaStreamDestination();
        sourceNode.connect(destNode);
        sourceNode.connect(audioCtx.destination);

        // Mix background music if prepared
        if (bgMusicAudio) {
          try {
            const musicSource = audioCtx.createMediaElementSource(bgMusicAudio);
            musicGainNode = audioCtx.createGain();
            const musicVol = settings.musicSettings?.volume ?? 0.25;
            musicGainNode.gain.setValueAtTime(musicVol, 0);
            musicSource.connect(musicGainNode);
            musicGainNode.connect(destNode);
            musicGainNode.connect(audioCtx.destination);
          } catch (e) {
            console.warn('Could not connect background music node:', e);
          }
        }

        const audioTracks = destNode.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            audioTracks[0],
          ]);
        }
      } catch {
        // Fallback: Proceed without audio track if CORS or audio context is constrained
      }

      // Determine recorder MIME type
      const { recordMimeType, finalMimeType, isNativeMp4, format } = resolveExportMimeType(requestedFormat);

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: recordMimeType,
        videoBitsPerSecond: videoBitrate,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      let animationFrameId: number;
      let isRecording = true;

      const drawFrame = () => {
        if (!isRecording) return;
        const curTime = renderVideo.currentTime;
        const elapsed = curTime - startTime;

        if (curTime >= endTime || renderVideo.ended) {
          isRecording = false;
          renderVideo.pause();
          onProgress?.({
            progress: 100,
            currentSecond: duration,
            totalSeconds: duration,
            status: 'encoding',
          });
          recorder.stop();
          return;
        }

        // 1. Draw Background
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const vW = renderVideo.videoWidth || 1920;
        const vH = renderVideo.videoHeight || 1080;
        const vAspect = vW / vH;
        const tAspect = targetWidth / targetHeight;

        if (
          settings.fitMode === 'contain' ||
          settings.fitMode === 'blurred-fit' ||
          (settings.blurBackground && settings.fitMode !== 'cover')
        ) {
          // Draw blurred backdrop
          ctx.save();
          const blurPx = settings.blurIntensity ?? 20;
          ctx.filter = `blur(${blurPx}px) brightness(0.4)`;
          ctx.drawImage(
            renderVideo,
            -targetWidth * 0.2,
            -targetHeight * 0.2,
            targetWidth * 1.4,
            targetHeight * 1.4
          );
          ctx.restore();

          // Draw centered video
          let drawW = targetWidth;
          let drawH = targetWidth / vAspect;
          if (drawH > targetHeight) {
            drawH = targetHeight;
            drawW = targetHeight * vAspect;
          }
          const drawX = (targetWidth - drawW) / 2;
          const drawY = (targetHeight - drawH) / 2;
          ctx.drawImage(renderVideo, drawX, drawY, drawW, drawH);
        } else {
          // 'cover' crop
          let sWidth = vW;
          let sHeight = vH;
          let sX = 0;
          let sY = 0;

          if (vAspect > tAspect) {
            sWidth = vH * tAspect;
            const maxShiftX = (vW - sWidth) / 2;
            const shiftX = ((settings.panX || 0) / 45) * maxShiftX;
            sX = Math.max(0, Math.min(vW - sWidth, (vW - sWidth) / 2 + shiftX));
          } else {
            sHeight = vW / tAspect;
            const maxShiftY = (vH - sHeight) / 2;
            const shiftY = ((settings.panY || 0) / 45) * maxShiftY;
            sY = Math.max(0, Math.min(vH - sHeight, (vH - sHeight) / 2 + shiftY));
          }
          ctx.drawImage(renderVideo, sX, sY, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
        }

        // 2. Draw Top Hook Banner if enabled
        if (settings.showTopBanner && settings.topBannerText.trim()) {
          ctx.save();
          const bannerScale = targetWidth / 720;
          const bannerFontSize = Math.round(28 * bannerScale);
          ctx.font = `bold ${bannerFontSize}px "Montserrat", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const bannerY = targetHeight * 0.10;
          const bannerText = settings.topBannerText.trim();
          const textMetrics = ctx.measureText(bannerText);
          const bannerW = Math.min(targetWidth - 40, textMetrics.width + 40 * bannerScale);
          const bannerH = 54 * bannerScale;

          // Banner background pill
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.beginPath();
          ctx.roundRect((targetWidth - bannerW) / 2, bannerY - bannerH / 2, bannerW, bannerH, 14 * bannerScale);
          ctx.fill();

          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 2.5 * bannerScale;
          ctx.stroke();

          // Banner text
          ctx.fillStyle = '#fde047';
          ctx.fillText(bannerText, targetWidth / 2, bannerY + 1);
          ctx.restore();
        }

        // 3. Draw Active Captions with Transition Animations
        if (burnSubtitles) {
          const activeCaption = captions.find((c) => curTime >= c.startTime && curTime <= c.endTime);
          if (activeCaption && activeCaption.text.trim()) {
            ctx.save();

            let text = activeCaption.text.trim();
            if (captionStyle.textTransform === 'uppercase') {
              text = text.toUpperCase();
            }

            const scale = targetWidth / 420;
            const scaledFontSize = Math.round(captionStyle.fontSize * scale);
            ctx.font = `900 ${scaledFontSize}px ${captionStyle.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const textMetrics = ctx.measureText(text);
            const captionY = (targetHeight * captionStyle.positionY) / 100;
            const pad = captionStyle.backgroundPadding * scale;

            // Transition interpolation
            const entryType = captionStyle.entryTransition || 'pop';
            const transitionDur = captionStyle.transitionDuration || 0.24;
            const timeSinceStart = curTime - activeCaption.startTime;
            const timeUntilEnd = activeCaption.endTime - curTime;

            let animScale = 1;
            let animOffsetY = 0;
            let animOffsetX = 0;
            let animAlpha = 1;

            // Entrance phase
            if (timeSinceStart < transitionDur && entryType !== 'none') {
              const p = Math.min(1, Math.max(0, timeSinceStart / transitionDur));
              if (entryType === 'pop' || entryType === 'pop-in') {
                animScale = 0.5 + 0.5 * p;
                animAlpha = p;
              } else if (entryType === 'bounce') {
                // Overshoot bounce equation
                animScale = 0.7 + 0.35 * Math.sin(p * Math.PI * 0.75);
                animOffsetY = (1 - p) * -30 * scale;
                animAlpha = p;
              } else if (entryType === 'slide-in') {
                animOffsetX = (1 - p) * -45 * scale;
                animAlpha = p;
              } else if (entryType === 'slide-up') {
                animOffsetY = (1 - p) * 35 * scale;
                animAlpha = p;
              } else if (entryType === 'zoom') {
                animScale = 1.4 - 0.4 * p;
                animAlpha = p;
              } else if (entryType === 'fade') {
                animAlpha = p;
              }
            } else if (timeUntilEnd < transitionDur * 0.75 && captionStyle.exitTransition !== 'none') {
              // Exit phase
              const exitDur = transitionDur * 0.75;
              const exitP = Math.min(1, Math.max(0, timeUntilEnd / exitDur));
              const exitType = captionStyle.exitTransition || 'pop';

              if (exitType === 'pop' || exitType === 'pop-in') {
                animScale = 0.7 + 0.3 * exitP;
                animAlpha = exitP;
              } else if (exitType === 'slide-in') {
                animOffsetX = (1 - exitP) * 45 * scale;
                animAlpha = exitP;
              } else if (exitType === 'slide-up') {
                animOffsetY = (1 - exitP) * -25 * scale;
                animAlpha = exitP;
              } else if (exitType === 'fade') {
                animAlpha = exitP;
              }
            }

            ctx.globalAlpha = Math.max(0, Math.min(1, animAlpha));

            // Apply transform around center
            const centerX = targetWidth / 2;
            ctx.translate(centerX + animOffsetX, captionY + animOffsetY);
            if (animScale !== 1) {
              ctx.scale(animScale, animScale);
            }

            // Background pill
            if (captionStyle.showBackgroundPill) {
              ctx.fillStyle = captionStyle.backgroundColor || 'rgba(0, 0, 0, 0.8)';
              ctx.beginPath();
              ctx.roundRect(
                -(textMetrics.width + pad * 2) / 2,
                -(scaledFontSize + pad * 1.5) / 2,
                textMetrics.width + pad * 2,
                scaledFontSize + pad * 1.5,
                captionStyle.borderRadius * scale
              );
              ctx.fill();
            }

            // Text stroke / outline
            if (captionStyle.strokeWidth > 0) {
              ctx.strokeStyle = captionStyle.strokeColor || '#000000';
              ctx.lineWidth = captionStyle.strokeWidth * scale;
              ctx.lineJoin = 'round';
              ctx.miterLimit = 2;
              ctx.strokeText(text, 0, 0);
            }

            // Text fill
            ctx.fillStyle = captionStyle.highlightColor || captionStyle.textColor || '#FFE600';
            ctx.fillText(text, 0, 0);

            ctx.restore();
          }
        }

        // Audio Ducking for background music during spoken captions
        if (musicGainNode && audioCtx && settings.musicSettings?.audioDucking) {
          const hasActiveCaption = captions.some((c) => curTime >= c.startTime && curTime <= c.endTime);
          const baseVol = settings.musicSettings.volume ?? 0.25;
          const duckAmount = settings.musicSettings.duckingAmount ?? 0.3;
          const targetVol = hasActiveCaption ? baseVol * duckAmount : baseVol;
          musicGainNode.gain.setValueAtTime(targetVol, audioCtx.currentTime);
        }

        const pct = Math.min(99, Math.round((elapsed / duration) * 100));
        onProgress?.({
          progress: pct,
          currentSecond: Math.min(duration, elapsed),
          totalSeconds: duration,
          status: 'rendering',
        });

        animationFrameId = requestAnimationFrame(drawFrame);
      };

      recorder.onstop = () => {
        cancelAnimationFrame(animationFrameId);
        if (bgMusicAudio) bgMusicAudio.pause();
        const finalBlob = new Blob(chunks, { type: finalMimeType || 'video/mp4' });
        onProgress?.({
          progress: 100,
          currentSecond: duration,
          totalSeconds: duration,
          status: 'completed',
        });
        resolve({
          blob: finalBlob,
          format,
          mimeType: finalMimeType,
          isNativeMp4,
          duration,
        });
      };

      recorder.onerror = (e) => {
        cancelAnimationFrame(animationFrameId);
        if (bgMusicAudio) bgMusicAudio.pause();
        reject(e);
      };

      recorder.start(100);
      renderVideo.play();
      if (bgMusicAudio) bgMusicAudio.play().catch(() => {});
      drawFrame();
    } catch (err: any) {
      reject(err);
    }
  });
}
