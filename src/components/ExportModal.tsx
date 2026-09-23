import React, { useState, useMemo } from 'react';
import {
  Download,
  FileText,
  Film,
  Check,
  Copy,
  AlertCircle,
  Loader2,
  Sparkles,
  Terminal,
  X,
  Crop,
  Sliders,
  CheckCircle2,
  Video,
  Layers,
  Music,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CaptionItem, CaptionStyle, ClipSettings, VideoInfo } from '../types';
import { downloadTextFile, formatSeconds, formatTimeSRT, generateSRT, generateVTT } from '../utils/subtitleUtils';
import {
  exportHtml5VideoClip,
  ExportProgress,
  ExportVideoFormat,
  checkBrowserMp4Support,
} from '../utils/videoExporter';
import { getTargetDimensions } from '../utils/aspectRatioUtils';
import { PresetExportSettings } from './PresetExportSettings';
import { ExportPresetConfig } from '../utils/exportPresets';
import { CAPTION_PRESETS } from '../data/presets';
import { useToastNotifications } from '../context/ToastNotificationContext';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: VideoInfo;
  clipSettings: ClipSettings;
  captionStyle: CaptionStyle;
  captions: CaptionItem[];
  videoElementRef: React.RefObject<HTMLVideoElement | null>;
  onUpdateClipSettings?: (newSettings: Partial<ClipSettings>) => void;
  onUpdateCaptionStyle?: (newStyle: Partial<CaptionStyle>) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  video,
  clipSettings,
  captionStyle,
  captions,
  videoElementRef,
  onUpdateClipSettings,
  onUpdateCaptionStyle,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportVideoFormat>('mp4');
  const [selectedQuality, setSelectedQuality] = useState<'ultra' | 'high' | 'medium'>('high');
  const [burnSubtitles, setBurnSubtitles] = useState<boolean>(true);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [copiedFfmpeg, setCopiedFfmpeg] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { startTask, updateTask, completeTask, failTask } = useToastNotifications();

  const mp4Support = useMemo(() => checkBrowserMp4Support(), []);

  if (!isOpen) return null;

  const clipDuration = clipSettings.endTime - clipSettings.startTime;
  const targetDim = getTargetDimensions(clipSettings);
  const ratioFileSlug = targetDim.simplifiedRatio.replace(':', 'x');

  // Handle Preset Selection
  const handleApplyPreset = (preset: ExportPresetConfig) => {
    if (onUpdateClipSettings) {
      onUpdateClipSettings({
        aspectRatio: preset.aspectRatio,
        customWidth: preset.customWidth,
        customHeight: preset.customHeight,
        fitMode: preset.fitMode,
        showTopBanner: preset.showTopBanner,
      });
    }

    if (preset.format) {
      setSelectedFormat(preset.format);
    }

    if (preset.captionPresetKey && onUpdateCaptionStyle && CAPTION_PRESETS[preset.captionPresetKey]) {
      onUpdateCaptionStyle(CAPTION_PRESETS[preset.captionPresetKey]);
    }
  };

  // Export SRT
  const handleExportSRT = (relative = true) => {
    const content = generateSRT(captions, relative ? clipSettings.startTime : 0);
    const filename = `${video.title.slice(0, 20).replace(/\s+/g, '_')}_clip_${ratioFileSlug}.srt`;
    downloadTextFile(content, filename, 'text/plain');
  };

  // Export VTT
  const handleExportVTT = (relative = true) => {
    const content = generateVTT(captions, relative ? clipSettings.startTime : 0);
    const filename = `${video.title.slice(0, 20).replace(/\s+/g, '_')}_clip_${ratioFileSlug}.vtt`;
    downloadTextFile(content, filename, 'text/vtt');
  };

  // Export Project JSON
  const handleExportJSON = () => {
    const data = {
      videoInfo: { id: video.id, title: video.title, url: video.url },
      clipSettings,
      captionStyle,
      captions,
      exportFormat: selectedFormat,
      targetResolution: { width: targetDim.width, height: targetDim.height, ratio: targetDim.simplifiedRatio },
      exportedAt: new Date().toISOString(),
    };
    downloadTextFile(
      JSON.stringify(data, null, 2),
      `clipcraft_project_${Date.now()}.json`,
      'application/json'
    );
  };

  // Render & Export HTML5 Video (MP4 or WebM)
  const handleExportRenderedVideo = async () => {
    const el = videoElementRef.current;
    if (!el) {
      setExportError('Video element not available for export');
      return;
    }

    setIsExportingVideo(true);
    setExportError(null);

    const taskId = startTask(
      'video_export',
      `Exporting ${targetDim.simplifiedRatio} Video (.${selectedFormat.toUpperCase()})`,
      'Preparing video stream & audio tracks...',
      0,
      {
        format: selectedFormat,
        totalSeconds: clipDuration,
        currentSecond: 0,
      }
    );

    try {
      const result = await exportHtml5VideoClip(
        el,
        clipSettings,
        captionStyle,
        captions,
        (progress) => {
          setExportProgress(progress);
          const desc =
            progress.status === 'preparing'
              ? 'Preparing canvas video stream...'
              : progress.status === 'rendering'
              ? `Rendering clip... (${progress.currentSecond.toFixed(1)}s / ${progress.totalSeconds.toFixed(1)}s)`
              : `Finalizing .${selectedFormat.toUpperCase()} encoding...`;

          updateTask(taskId, {
            progress: progress.progress,
            description: desc,
            metadata: {
              currentSecond: progress.currentSecond,
              totalSeconds: progress.totalSeconds,
              format: selectedFormat,
            },
          });
        },
        {
          format: selectedFormat,
          quality: selectedQuality,
          burnSubtitles,
        }
      );

      // Trigger celebration
      confetti({
        particleCount: 85,
        spread: 75,
        origin: { y: 0.6 },
      });

      // Complete Toast Notification with progress
      completeTask(taskId, {
        title: `${selectedFormat.toUpperCase()} Video Exported`,
        description: `Successfully downloaded ${targetDim.width}×${targetDim.height} .${selectedFormat.toUpperCase()} clip!`,
      });

      // Download file with selected container extension (.mp4 or .webm)
      const ext = selectedFormat;
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${video.title.slice(0, 24).replace(/[^a-zA-Z0-9_-]+/g, '_')}_${targetDim.width}x${targetDim.height}_clip.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Video export error:', err);
      const errMsg = err.message || 'Failed to render and record video';
      setExportError(errMsg);
      failTask(taskId, errMsg);
    } finally {
      setIsExportingVideo(false);
    }
  };

  // Generate FFmpeg command with exact target dimensions and selected format
  const ffmpegCmd =
    selectedFormat === 'mp4'
      ? `ffmpeg -ss ${clipSettings.startTime.toFixed(1)} -to ${clipSettings.endTime.toFixed(1)} -i input_video.mp4 -vf "scale=${targetDim.width}:${targetDim.height}:force_original_aspect_ratio=increase,crop=${targetDim.width}:${targetDim.height}" -c:v libx264 -c:a aac -b:v 8M output_${targetDim.width}x${targetDim.height}_clip.mp4`
      : `ffmpeg -ss ${clipSettings.startTime.toFixed(1)} -to ${clipSettings.endTime.toFixed(1)} -i input_video.mp4 -vf "scale=${targetDim.width}:${targetDim.height}:force_original_aspect_ratio=increase,crop=${targetDim.width}:${targetDim.height}" -c:v libvpx-vp9 -c:a libopus -b:v 6M output_${targetDim.width}x${targetDim.height}_clip.webm`;

  const handleCopyFfmpeg = () => {
    navigator.clipboard.writeText(ffmpegCmd);
    setCopiedFfmpeg(true);
    setTimeout(() => setCopiedFfmpeg(false), 3000);
  };

  const isHtml5Source = video.type === 'local' || video.type === 'sample';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Export Video Clip</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                  {targetDim.simplifiedRatio} ({targetDim.width}×{targetDim.height})
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold uppercase border border-emerald-500/30">
                  .{selectedFormat}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Duration: {clipDuration.toFixed(1)}s ({formatSeconds(clipSettings.startTime)} - {formatSeconds(clipSettings.endTime)})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
          {exportError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{exportError}</span>
            </div>
          )}

          {/* Section 0: Preset Export Settings (TikTok, Reels, Shorts, Custom) */}
          <PresetExportSettings
            clipSettings={clipSettings}
            captionStyle={captionStyle}
            onApplyPreset={handleApplyPreset}
          />

          {/* Section 1: In-Browser Video Rendering & Format Choice */}
          {isHtml5Source ? (
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white">
                    Render {targetDim.simplifiedRatio} Video ({targetDim.width} × {targetDim.height}px)
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready to Render
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Encodes the trimmed clip into {targetDim.width}×{targetDim.height}px with your custom aspect framing, burned-in kinetic subtitles, and top headline hook.
              </p>

              {/* Format Selection (MP4 vs WebM) */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-amber-400" /> Output Video Format
                  </label>
                  {selectedFormat === 'mp4' && mp4Support.isMp4Supported && (
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Native MP4 Recording Supported
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* MP4 Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('mp4')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                      selectedFormat === 'mp4'
                        ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400 shadow-lg shadow-amber-500/10'
                        : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        MP4 Video (.mp4)
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        RECOMMENDED
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 font-medium">H.264 / AAC Universal Encoding</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Direct upload to TikTok, Instagram Reels, YouTube Shorts, Premiere Pro, and Mobile
                    </p>
                  </button>

                  {/* WebM Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('webm')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedFormat === 'webm'
                        ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400 shadow-lg shadow-amber-500/10'
                        : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-zinc-400" />
                        WebM Video (.webm)
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        WEB STANDARD
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 font-medium">VP9 / Opus Open Codec</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Lightweight format for Chrome, Firefox, and Discord media players
                    </p>
                  </button>
                </div>
              </div>

              {/* Bitrate & Subtitle Burn Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Sliders className="w-3 h-3 text-amber-400" /> Bitrate Quality
                  </span>
                  <select
                    value={selectedQuality}
                    onChange={(e) => setSelectedQuality(e.target.value as 'ultra' | 'high' | 'medium')}
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-500"
                  >
                    <option value="ultra">Ultra Master (14 Mbps)</option>
                    <option value="high">High Quality (8 Mbps)</option>
                    <option value="medium">Compact (4 Mbps)</option>
                  </select>
                </div>

                <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-zinc-300 block">Burn-in Subtitles</span>
                    <span className="text-[10px] text-zinc-400">
                      Kinetic {captionStyle.entryTransition || 'pop'} animations included
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={burnSubtitles}
                    onChange={(e) => setBurnSubtitles(e.target.checked)}
                    className="accent-amber-500 rounded cursor-pointer w-4 h-4"
                  />
                </div>

                <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-3.5 h-3.5 text-amber-400" />
                    <div>
                      <span className="text-xs font-medium text-zinc-300 block">Background Music Mix</span>
                      <span className="text-[10px] text-zinc-400">
                        {clipSettings.musicSettings?.enabled
                          ? `Mixed in (${Math.round((clipSettings.musicSettings?.volume ?? 0.25) * 100)}% vol, ${
                              clipSettings.musicSettings?.audioDucking ? 'Auto-Ducking' : 'No Ducking'
                            })`
                          : 'Disabled (Video voice only)'}
                      </span>
                    </div>
                  </div>
                  {onUpdateClipSettings && (
                    <input
                      type="checkbox"
                      checked={Boolean(clipSettings.musicSettings?.enabled)}
                      onChange={(e) =>
                        onUpdateClipSettings({
                          musicSettings: {
                            ...(clipSettings.musicSettings || {
                              selectedTrackId: 'lofi-sunset',
                              volume: 0.25,
                              videoVolume: 1.0,
                              audioDucking: true,
                              duckingAmount: 0.3,
                              loop: true,
                            }),
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="accent-amber-500 rounded cursor-pointer w-4 h-4"
                    />
                  )}
                </div>
              </div>

              {/* Render Progress Bar */}
              {isExportingVideo && exportProgress && (
                <div className="space-y-1.5 pt-2 bg-zinc-900/50 p-3 rounded-xl border border-amber-500/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      {exportProgress.status === 'preparing'
                        ? 'Preparing video stream...'
                        : exportProgress.status === 'rendering'
                        ? `Encoding ${selectedFormat.toUpperCase()} clip... (${exportProgress.currentSecond.toFixed(1)}s / ${exportProgress.totalSeconds.toFixed(1)}s)`
                        : `Finalizing .${selectedFormat} container...`}
                    </span>
                    <span className="font-mono text-amber-400 font-bold">
                      {exportProgress.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-150"
                      style={{ width: `${exportProgress.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleExportRenderedVideo}
                disabled={isExportingVideo}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isExportingVideo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      Rendering {selectedFormat.toUpperCase()} Video ({exportProgress?.progress || 0}%)...
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>
                      Download {targetDim.width}×{targetDim.height} Video (.{selectedFormat.toUpperCase()})
                    </span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white">
                    YouTube Lossless Crop Command ({selectedFormat.toUpperCase()} • {targetDim.width}×{targetDim.height})
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('mp4')}
                    className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      selectedFormat === 'mp4' ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    MP4
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('webm')}
                    className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      selectedFormat === 'webm' ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    WebM
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-400">
                YouTube iframe playback is protected against direct client-side screen recording. To clip with original master bitrate into an <strong>.{selectedFormat.toUpperCase()}</strong> file at {targetDim.simplifiedRatio} ({targetDim.width}×{targetDim.height}), run this command in terminal:
              </p>

              <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-3 font-mono text-xs text-zinc-200 overflow-x-auto">
                <code>{ffmpegCmd}</code>
                <button
                  onClick={handleCopyFfmpeg}
                  className="absolute right-2 top-2 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 cursor-pointer"
                  title="Copy FFmpeg Command"
                >
                  {copiedFfmpeg ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-sans">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="font-sans">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Section 2: Subtitle File Downloads */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-white">
                  Timed Subtitles & Captions ({captions.length} cues)
                </span>
              </div>
              <span className="text-xs text-zinc-400">
                Synchronized to clip offset
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleExportSRT(true)}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer text-left"
              >
                <div>
                  <span className="text-xs font-bold text-white block">Download .SRT</span>
                  <span className="text-[10px] text-zinc-400">Standard SubRip subtitle track</span>
                </div>
                <Download className="w-4 h-4 text-amber-400" />
              </button>

              <button
                type="button"
                onClick={() => handleExportVTT(true)}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer text-left"
              >
                <div>
                  <span className="text-xs font-bold text-white block">Download .VTT</span>
                  <span className="text-[10px] text-zinc-400">WebVTT Shorts / Reels ready</span>
                </div>
                <Download className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>

          {/* Section 3: Project Metadata Backup */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Save Project Configuration</span>
              <span className="text-[10px] text-zinc-400">
                Exports all timestamps, {targetDim.simplifiedRatio} dimensions, {selectedFormat.toUpperCase()} settings & captions to JSON
              </span>
            </div>
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold cursor-pointer"
            >
              Export JSON
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
