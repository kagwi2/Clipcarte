import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  Mic,
  Upload,
  Bot,
  Check,
  AlertCircle,
  Clock,
  Loader2,
  X,
  Play,
  Square,
  Flame,
  Radio,
  FileAudio,
} from 'lucide-react';
import { VideoInfo, CaptionItem } from '../types';
import { formatSeconds } from '../utils/subtitleUtils';
import { extractAudioSegment, captureAudioSegment, blobToBase64 } from '../utils/audioExtractor';
import { useToastNotifications } from '../context/ToastNotificationContext';

interface AutoGenerateCaptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: VideoInfo;
  clipStartTime: number;
  clipEndTime: number;
  existingCaptionsCount: number;
  videoElementRef?: React.RefObject<HTMLVideoElement | null>;
  onApplyCaptions: (captions: CaptionItem[], mode: 'replace' | 'append') => void;
}

type AudioSourceMode = 'video_extract' | 'record_capture' | 'upload_file' | 'ai_context';
type PacingStyle = 'punchy' | 'standard' | 'word_by_word';

export const AutoGenerateCaptionsModal: React.FC<AutoGenerateCaptionsModalProps> = ({
  isOpen,
  onClose,
  video,
  clipStartTime,
  clipEndTime,
  existingCaptionsCount,
  videoElementRef,
  onApplyCaptions,
}) => {
  const duration = Math.max(1, clipEndTime - clipStartTime);

  const [sourceMode, setSourceMode] = useState<AudioSourceMode>(
    video.fileBlob || video.localVideoUrl ? 'video_extract' : 'ai_context'
  );
  const [pacing, setPacing] = useState<PacingStyle>('punchy');
  const [insertMode, setInsertMode] = useState<'replace' | 'append'>('replace');
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedElapsed, setRecordedElapsed] = useState(0);
  const [recordedAudioData, setRecordedAudioData] = useState<{
    base64Audio: string;
    mimeType: string;
  } | null>(null);

  // Processing state
  const { startTask, updateTask, completeTask, failTask } = useToastNotifications();
  const [statusStep, setStatusStep] = useState<
    'idle' | 'extracting' | 'recording' | 'transcribing' | 'completed' | 'error'
  >('idle');
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedCaptions, setGeneratedCaptions] = useState<CaptionItem[]>([]);
  const [transcriptionSource, setTranscriptionSource] = useState<string>('audio_analysis');

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStatusStep('idle');
      setErrorMessage(null);
      setGeneratedCaptions([]);
      setRecordedAudioData(null);
      setRecordedElapsed(0);
      setIsRecording(false);
      if (video.fileBlob || video.localVideoUrl) {
        setSourceMode('video_extract');
      } else {
        setSourceMode('ai_context');
      }
    }
  }, [isOpen, video]);

  if (!isOpen) return null;

  // Handle Recording Audio from mic/speaker
  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      setStatusStep('recording');
      setProgressMessage(`Capturing segment audio (${duration.toFixed(1)}s)...`);

      // If video element exists, play it synchronized
      if (videoElementRef?.current) {
        videoElementRef.current.currentTime = clipStartTime;
        videoElementRef.current.play().catch(() => {});
      }

      const result = await captureAudioSegment(duration, (elapsed) => {
        setRecordedElapsed(elapsed);
      });

      setRecordedAudioData(result);
      setIsRecording(false);
      setStatusStep('idle');
      setProgressMessage(`Audio captured successfully (${duration.toFixed(1)}s)! Ready to transcribe.`);
    } catch (err: any) {
      setIsRecording(false);
      setStatusStep('error');
      setErrorMessage(err.message || 'Microphone / audio capture permission denied.');
    }
  };

  // Main Execute: Analyze Audio with Gemini
  const handleGenerateCaptions = async () => {
    setStatusStep('extracting');
    setErrorMessage(null);
    setGeneratedCaptions([]);

    const taskId = startTask(
      'caption_generation',
      'Auto-Generating Captions',
      'Preparing audio source segment...',
      15,
      { isIndeterminate: true }
    );

    let base64Audio: string | null = null;
    let mimeType: string = 'audio/wav';
    let progressTimer: NodeJS.Timeout | null = null;

    try {
      // 1. Prepare Audio Data according to sourceMode
      if (sourceMode === 'video_extract') {
        const msg = `Extracting audio slice (${formatSeconds(clipStartTime)} - ${formatSeconds(clipEndTime)})...`;
        setProgressMessage(msg);
        updateTask(taskId, { progress: 25, description: msg });

        const audioSource = video.fileBlob || video.localVideoUrl;
        if (!audioSource) {
          throw new Error(
            'No local video audio track found. Please select "Capture Audio", "Upload Audio", or "AI Speech Analysis".'
          );
        }

        const extracted = await extractAudioSegment(audioSource, clipStartTime, clipEndTime);
        base64Audio = extracted.base64Audio;
        mimeType = extracted.mimeType;
      } else if (sourceMode === 'record_capture') {
        if (!recordedAudioData) {
          throw new Error('Please click "Start Capture" to record the segment audio first.');
        }
        base64Audio = recordedAudioData.base64Audio;
        mimeType = recordedAudioData.mimeType;
        updateTask(taskId, { progress: 30, description: 'Using captured audio segment...' });
      } else if (sourceMode === 'upload_file') {
        if (!uploadedAudioFile) {
          throw new Error('Please select or drop an audio file first.');
        }
        setProgressMessage('Reading uploaded audio file...');
        updateTask(taskId, { progress: 25, description: 'Reading uploaded audio file...' });
        base64Audio = await blobToBase64(uploadedAudioFile);
        mimeType = uploadedAudioFile.type || 'audio/mp3';
      }

      // 2. Call Gemini API endpoint
      setStatusStep('transcribing');
      const transcribeMsg = base64Audio
        ? 'Transcribing speech with Gemini API audio intelligence...'
        : 'Analyzing video timing & generating time-coded speech cues...';
      setProgressMessage(transcribeMsg);
      updateTask(taskId, { progress: 45, description: transcribeMsg });

      // Simulate smooth progress updates while awaiting Gemini response
      let simP = 45;
      progressTimer = setInterval(() => {
        simP = Math.min(88, simP + 4);
        updateTask(taskId, {
          progress: simP,
          description: 'Analyzing speech timing & word boundaries with Gemini AI...',
        });
      }, 400);

      const response = await fetch('/api/ai/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64Audio,
          mimeType,
          startTime: clipStartTime,
          endTime: clipEndTime,
          title: video.title,
          pacing,
        }),
      });

      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      if (!data.captions || !Array.isArray(data.captions) || data.captions.length === 0) {
        throw new Error('Gemini did not return any subtitle cues for this segment.');
      }

      setGeneratedCaptions(data.captions);
      setTranscriptionSource(data.source || 'audio_analysis');
      setStatusStep('completed');
      setProgressMessage(`Successfully generated ${data.captions.length} time-aligned captions!`);

      // Complete Toast Notification
      completeTask(taskId, {
        title: 'Captions Auto-Generated',
        description: `Generated ${data.captions.length} time-aligned captions with Gemini API!`,
      });
    } catch (err: any) {
      if (progressTimer) {
        clearInterval(progressTimer);
      }
      setStatusStep('error');
      const errMsg = err.message || 'Failed to auto-generate captions from audio.';
      setErrorMessage(errMsg);
      failTask(taskId, errMsg);
    }
  };

  const handleApply = () => {
    if (generatedCaptions.length === 0) return;
    onApplyCaptions(generatedCaptions, insertMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Auto-Generate Captions</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  Gemini API
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Acoustic speech transcription & timestamp alignment for video clips
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 scrollbar-thin">
          {/* Selected Video Segment Badge */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Target Video Segment
              </span>
              <p className="text-sm font-bold text-white truncate max-w-md">
                {video.title}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs font-bold text-amber-400">
                {formatSeconds(clipStartTime, true)} → {formatSeconds(clipEndTime, true)}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 font-mono text-xs font-bold text-amber-300">
                {duration.toFixed(1)}s
              </span>
            </div>
          </div>

          {/* Audio Source Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
              1. Select Audio Source
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Option 1: Extract Video Audio */}
              <button
                type="button"
                onClick={() => setSourceMode('video_extract')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  sourceMode === 'video_extract'
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/10'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Volume2
                    className={`w-4 h-4 ${
                      sourceMode === 'video_extract' ? 'text-amber-400' : 'text-zinc-400'
                    }`}
                  />
                  {sourceMode === 'video_extract' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Extract Audio</div>
                  <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                    From video file track
                  </div>
                </div>
              </button>

              {/* Option 2: Record / Capture */}
              <button
                type="button"
                onClick={() => setSourceMode('record_capture')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  sourceMode === 'record_capture'
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/10'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Mic
                    className={`w-4 h-4 ${
                      sourceMode === 'record_capture' ? 'text-amber-400' : 'text-zinc-400'
                    }`}
                  />
                  {sourceMode === 'record_capture' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Capture Audio</div>
                  <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                    Record live segment
                  </div>
                </div>
              </button>

              {/* Option 3: Upload Audio File */}
              <button
                type="button"
                onClick={() => setSourceMode('upload_file')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  sourceMode === 'upload_file'
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/10'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Upload
                    className={`w-4 h-4 ${
                      sourceMode === 'upload_file' ? 'text-amber-400' : 'text-zinc-400'
                    }`}
                  />
                  {sourceMode === 'upload_file' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Upload Audio</div>
                  <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                    MP3, WAV, M4A
                  </div>
                </div>
              </button>

              {/* Option 4: AI Context Synthesis */}
              <button
                type="button"
                onClick={() => setSourceMode('ai_context')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  sourceMode === 'ai_context'
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/10'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Bot
                    className={`w-4 h-4 ${
                      sourceMode === 'ai_context' ? 'text-amber-400' : 'text-zinc-400'
                    }`}
                  />
                  {sourceMode === 'ai_context' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">AI Alignment</div>
                  <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                    Context & pacing
                  </div>
                </div>
              </button>
            </div>

            {/* Source Specific Configuration Panel */}
            <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-xs text-zinc-300">
              {sourceMode === 'video_extract' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {video.fileBlob || video.localVideoUrl
                        ? 'Ready to extract audio track slice directly from the video buffer.'
                        : 'Web Audio will attempt extraction from media stream. For YouTube embeds, you can also use Capture Audio or AI Alignment.'}
                    </span>
                  </div>
                  {(video.fileBlob || video.localVideoUrl) && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      Direct Audio Ready
                    </span>
                  )}
                </div>
              )}

              {sourceMode === 'record_capture' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>
                      Play and capture audio during the segment duration ({duration.toFixed(1)}s):
                    </span>
                    {recordedAudioData ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        Audio Recorded ({duration.toFixed(1)}s)
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-400">Ready to record</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      disabled={isRecording}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        isRecording
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>Recording... ({recordedElapsed.toFixed(1)}s / {duration.toFixed(1)}s)</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5" />
                          <span>{recordedAudioData ? 'Re-record Audio' : 'Start Audio Capture'}</span>
                        </>
                      )}
                    </button>

                    {isRecording && (
                      <div className="flex-1 bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="bg-red-500 h-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (recordedElapsed / duration) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {sourceMode === 'upload_file' && (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <FileAudio className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {uploadedAudioFile ? uploadedAudioFile.name : 'Select or drop an audio file for this clip'}
                    </span>
                  </div>
                  <label className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 cursor-pointer">
                    Browse Audio
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setUploadedAudioFile(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {sourceMode === 'ai_context' && (
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>
                    Gemini will analyze video metadata, title, and segment duration ({duration.toFixed(1)}s) to create aligned, punchy speech subtitles.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Subtitle Pacing Style */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
              2. Subtitle Pacing & Density
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPacing('punchy')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  pacing === 'punchy'
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/10'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-0.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Viral Punchy</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  2 - 5 words per cue (Hormozi / MrBeast)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPacing('standard')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  pacing === 'standard'
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/10'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="text-xs font-bold text-white mb-0.5">Standard Subtitles</div>
                <div className="text-[11px] text-zinc-400">
                  5 - 8 words per cue (Readable pacing)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPacing('word_by_word')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  pacing === 'word_by_word'
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/10'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="text-xs font-bold text-white mb-0.5">Word-by-Word</div>
                <div className="text-[11px] text-zinc-400">
                  1 - 3 words per cue (Rapid-fire reels)
                </div>
              </button>
            </div>
          </div>

          {/* Insertion Mode */}
          {existingCaptionsCount > 0 && (
            <div className="flex items-center gap-4 text-xs">
              <span className="text-zinc-400 font-semibold">Existing Captions ({existingCaptionsCount}):</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="insertMode"
                  checked={insertMode === 'replace'}
                  onChange={() => setInsertMode('replace')}
                  className="accent-amber-500"
                />
                <span className="text-zinc-300">Replace current</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="insertMode"
                  checked={insertMode === 'append'}
                  onChange={() => setInsertMode('append')}
                  className="accent-amber-500"
                />
                <span className="text-zinc-300">Append new cues</span>
              </label>
            </div>
          )}

          {/* Progress / Status / Error Feedback */}
          {statusStep !== 'idle' && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-center gap-3 transition-all ${
                statusStep === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : statusStep === 'completed'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
              }`}
            >
              {statusStep === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              ) : statusStep === 'completed' ? (
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-semibold">{progressMessage || errorMessage}</div>
                {statusStep === 'completed' && (
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Source: {transcriptionSource === 'audio_analysis' ? 'Acoustic Audio Analysis' : 'Semantic Video Analysis'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview of Generated Captions */}
          {generatedCaptions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                <span>Generated Subtitle Cues ({generatedCaptions.length})</span>
                <span className="text-emerald-400">Ready to populate</span>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1.5 p-2 bg-zinc-950 border border-zinc-800 rounded-xl scrollbar-thin">
                {generatedCaptions.map((c, i) => (
                  <div
                    key={c.id || i}
                    className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-500 text-[10px]">#{i + 1}</span>
                      <span className="text-zinc-200 font-medium">{c.text}</span>
                    </div>
                    <span className="font-mono text-[10px] text-amber-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                      {formatSeconds(c.startTime, true)} - {formatSeconds(c.endTime, true)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {generatedCaptions.length > 0 ? (
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Populate Caption Editor ({generatedCaptions.length})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGenerateCaptions}
                disabled={
                  statusStep === 'extracting' ||
                  statusStep === 'transcribing' ||
                  (sourceMode === 'record_capture' && !recordedAudioData) ||
                  (sourceMode === 'upload_file' && !uploadedAudioFile)
                }
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {statusStep === 'extracting' || statusStep === 'transcribing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Processing Audio...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-black" />
                    <span>Analyze Audio & Generate</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
