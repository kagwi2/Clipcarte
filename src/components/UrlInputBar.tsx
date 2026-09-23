import React, { useState } from 'react';
import { Youtube, Upload, Play, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { SAMPLE_VIDEOS, SampleVideoItem } from '../data/presets';
import { VideoInfo } from '../types';

interface UrlInputBarProps {
  onLoadYouTube: (url: string) => Promise<void>;
  onLoadSample: (sample: SampleVideoItem) => void;
  onUploadFile: (file: File) => void;
  isLoading: boolean;
  currentVideo: VideoInfo | null;
  error: string | null;
}

export const UrlInputBar: React.FC<UrlInputBarProps> = ({
  onLoadYouTube,
  onLoadSample,
  onUploadFile,
  isLoading,
  currentVideo,
  error,
}) => {
  const [inputUrl, setInputUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onLoadYouTube(inputUrl.trim());
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-red-500">
            <Youtube className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Paste YouTube Video or Shorts URL (e.g. https://www.youtube.com/watch?v=...)"
            className="w-full pl-11 pr-4 py-3 bg-zinc-950 border border-zinc-700/80 rounded-xl text-sm sm:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            disabled={isLoading}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading || !inputUrl.trim()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-black" />
                <span>Load & Clip</span>
              </>
            )}
          </button>

          <label
            className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-sm font-semibold transition-all cursor-pointer"
            title="Upload local MP4 or WebM video file"
          >
            <Upload className="w-4 h-4 text-zinc-400" />
            <span className="hidden md:inline">Upload Video</span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </form>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-xs sm:text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Preset sample chips */}
      <div className="mt-3.5 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick Samples:
        </span>
        {SAMPLE_VIDEOS.map((sample, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onLoadSample(sample)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white border border-zinc-700/50 hover:border-zinc-500 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>{sample.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
