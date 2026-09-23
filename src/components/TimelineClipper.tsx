import React, { useRef, useState } from 'react';
import { Scissors, Clock, ArrowRight, Play, ChevronsLeft, ChevronsRight, Zap } from 'lucide-react';
import { CaptionItem, ClipSettings } from '../types';
import { formatSeconds } from '../utils/subtitleUtils';

interface TimelineClipperProps {
  duration: number;
  currentTime: number;
  clipSettings: ClipSettings;
  captions: CaptionItem[];
  onUpdateClipSettings: (newSettings: Partial<ClipSettings>) => void;
  onSeek: (time: number) => void;
}

export const TimelineClipper: React.FC<TimelineClipperProps> = ({
  duration,
  currentTime,
  clipSettings,
  captions,
  onUpdateClipSettings,
  onSeek,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const totalDuration = Math.max(1, duration);
  const clipDuration = Math.max(0.1, clipSettings.endTime - clipSettings.startTime);

  // Quick preset handlers
  const handleSetPreset = (seconds: number) => {
    const newEnd = Math.min(totalDuration, clipSettings.startTime + seconds);
    onUpdateClipSettings({ endTime: newEnd });
  };

  const handleSetStartToPlayhead = () => {
    if (currentTime < clipSettings.endTime) {
      onUpdateClipSettings({ startTime: Math.max(0, currentTime) });
    }
  };

  const handleSetEndToPlayhead = () => {
    if (currentTime > clipSettings.startTime) {
      onUpdateClipSettings({ endTime: Math.min(totalDuration, currentTime) });
    }
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = pct * totalDuration;
    onSeek(targetTime);
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Clip Trimmer & Timeline</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-amber-400 border border-zinc-700 font-mono">
                {clipDuration.toFixed(1)}s Duration
              </span>
            </h3>
          </div>
        </div>

        {/* Quick Length Presets */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-400 hidden md:inline">Quick Presets:</span>
          <button
            onClick={() => handleSetPreset(15)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-all cursor-pointer"
          >
            15s Hook
          </button>
          <button
            onClick={() => handleSetPreset(30)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-all cursor-pointer"
          >
            30s Short
          </button>
          <button
            onClick={() => handleSetPreset(60)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-all cursor-pointer"
          >
            60s Reel
          </button>
        </div>
      </div>

      {/* Main Interactive Visual Timeline Track */}
      <div className="relative pt-4 pb-3">
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className="relative h-14 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer select-none group"
        >
          {/* Timeline background ticks */}
          <div className="absolute inset-0 flex justify-between px-2 opacity-15 pointer-events-none">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="w-[1px] h-full bg-zinc-500" />
            ))}
          </div>

          {/* Caption segments on the timeline */}
          {captions.map((c) => {
            const leftPct = (c.startTime / totalDuration) * 100;
            const widthPct = Math.max(1, ((c.endTime - c.startTime) / totalDuration) * 100);
            return (
              <div
                key={c.id}
                className="absolute top-1 bottom-1 bg-amber-500/30 border border-amber-400/50 rounded pointer-events-none z-10 flex items-center overflow-hidden px-1"
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                title={`Caption: ${c.text}`}
              >
                <span className="text-[9px] font-bold text-amber-200 truncate select-none">
                  {c.text}
                </span>
              </div>
            );
          })}

          {/* Active Trim Window (Highlighted Region) */}
          <div
            className="absolute top-0 bottom-0 bg-amber-500/15 border-y-2 border-amber-400 z-10"
            style={{
              left: `${(clipSettings.startTime / totalDuration) * 100}%`,
              width: `${((clipSettings.endTime - clipSettings.startTime) / totalDuration) * 100}%`,
            }}
          >
            {/* Left Trim Handle */}
            <div className="absolute -left-1 top-0 bottom-0 w-3 bg-amber-400 rounded-l cursor-ew-resize flex items-center justify-center shadow-lg">
              <div className="w-0.5 h-6 bg-black rounded" />
            </div>

            {/* Right Trim Handle */}
            <div className="absolute -right-1 top-0 bottom-0 w-3 bg-amber-400 rounded-r cursor-ew-resize flex items-center justify-center shadow-lg">
              <div className="w-0.5 h-6 bg-black rounded" />
            </div>
          </div>

          {/* Current Playhead Line */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-red-500 z-30 pointer-events-none flex flex-col items-center"
            style={{ left: `${(currentTime / totalDuration) * 100}%` }}
          >
            <div className="w-3 h-3 bg-red-500 rotate-45 -mt-1.5 shadow" />
          </div>
        </div>

        {/* Timeline Sliders for precise dual-point scrubbing */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1 font-medium">
                <ChevronsLeft className="w-3.5 h-3.5 text-amber-400" /> Clip Start Time
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSetStartToPlayhead}
                  className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                >
                  Set to Playhead ({formatSeconds(currentTime, true)})
                </button>
                <span className="font-mono text-zinc-100 font-bold bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  {formatSeconds(clipSettings.startTime, true)}
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(0, clipSettings.endTime - 1)}
              step="0.1"
              value={clipSettings.startTime}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateClipSettings({ startTime: val });
                onSeek(val);
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1 font-medium">
                Clip End Time <ChevronsRight className="w-3.5 h-3.5 text-amber-400" />
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSetEndToPlayhead}
                  className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                >
                  Set to Playhead ({formatSeconds(currentTime, true)})
                </button>
                <span className="font-mono text-zinc-100 font-bold bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  {formatSeconds(clipSettings.endTime, true)}
                </span>
              </div>
            </div>
            <input
              type="range"
              min={clipSettings.startTime + 1}
              max={totalDuration}
              step="0.1"
              value={clipSettings.endTime}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateClipSettings({ endTime: val });
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
