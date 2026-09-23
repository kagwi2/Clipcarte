import React, { useState, useEffect } from 'react';
import { Sparkles, X, Flame, Play, Clock, Check, Loader2, Zap } from 'lucide-react';
import { SuggestedClip, VideoInfo } from '../types';
import { formatSeconds } from '../utils/subtitleUtils';

interface AiClipSuggesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: VideoInfo;
  onSelectClip: (clip: SuggestedClip) => void;
}

export const AiClipSuggesterModal: React.FC<AiClipSuggesterModalProps> = ({
  isOpen,
  onClose,
  video,
  onSelectClip,
}) => {
  const [clips, setClips] = useState<SuggestedClip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/suggest-clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: video.title,
          videoId: video.id,
          duration: video.duration,
          customDescription: `${video.title} by ${video.authorName || 'Creator'}`,
        }),
      });

      if (!res.ok) {
        throw new Error('Could not analyze video moments');
      }

      const data = await res.json();
      setClips(data.clips || []);
    } catch (err: any) {
      setError(err.message || 'Failed to detect clips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && clips.length === 0) {
      fetchSuggestions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>AI Viral Clip Finder</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  Gemini Powered
                </span>
              </h2>
              <p className="text-xs text-zinc-400 truncate max-w-md">
                Analyzing &ldquo;{video.title}&rdquo;
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 overflow-y-auto space-y-3 flex-1 scrollbar-thin">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-zinc-200">
                Scanning transcript & hook patterns...
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Pinpointing high-retention 9:16 Shorts candidates
              </p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-400 mb-3">{error}</p>
              <button
                onClick={fetchSuggestions}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white"
              >
                Retry Scan
              </button>
            </div>
          ) : (
            clips.map((clip) => (
              <div
                key={clip.id}
                className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white">{clip.title}</span>
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Flame className="w-3 h-3 fill-amber-400" />
                      {clip.viralityScore}% Virality
                    </span>
                    <span className="flex items-center gap-1 text-xs text-zinc-400 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {formatSeconds(clip.startTime)} - {formatSeconds(clip.endTime)} (
                      {(clip.endTime - clip.startTime).toFixed(0)}s)
                    </span>
                  </div>

                  {clip.hookText && (
                    <p className="text-xs font-medium text-amber-200/90 italic">
                      &ldquo;{clip.hookText}&rdquo;
                    </p>
                  )}

                  <p className="text-xs text-zinc-400 leading-relaxed">{clip.reason}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSelectClip(clip);
                    onClose();
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Zap className="w-3.5 h-3.5 fill-black" />
                  <span>Apply Cut</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Select a suggested cut to automatically trim timeline & insert viral hook banner.
          </span>
          <button
            type="button"
            onClick={fetchSuggestions}
            disabled={loading}
            className="text-xs text-amber-400 hover:underline cursor-pointer disabled:opacity-50"
          >
            Refresh Suggestions
          </button>
        </div>
      </div>
    </div>
  );
};
