import React, { useState } from 'react';
import { Plus, Trash2, Play, Sparkles, FileText, Upload, Copy, AlertCircle, Clock, Check, Volume2, Wand2 } from 'lucide-react';
import { CaptionItem, VideoInfo } from '../types';
import { formatSeconds } from '../utils/subtitleUtils';
import { AutoGenerateCaptionsModal } from './AutoGenerateCaptionsModal';

interface CaptionEditorProps {
  captions: CaptionItem[];
  currentTime: number;
  clipStartTime: number;
  clipEndTime: number;
  videoTitle: string;
  video?: VideoInfo;
  videoElementRef?: React.RefObject<HTMLVideoElement | null>;
  onAddCaption: (newCaption: CaptionItem) => void;
  onUpdateCaption: (id: string, updated: Partial<CaptionItem>) => void;
  onDeleteCaption: (id: string) => void;
  onClearCaptions: () => void;
  onSeek: (time: number) => void;
  onImportCaptions: (items: CaptionItem[]) => void;
}

export const CaptionEditor: React.FC<CaptionEditorProps> = ({
  captions,
  currentTime,
  clipStartTime,
  clipEndTime,
  videoTitle,
  video,
  videoElementRef,
  onAddCaption,
  onUpdateCaption,
  onDeleteCaption,
  onClearCaptions,
  onSeek,
  onImportCaptions,
}) => {
  const [isAutoGenerateModalOpen, setIsAutoGenerateModalOpen] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Add new manual caption at current playhead
  const handleAddNewAtPlayhead = () => {
    const start = Math.max(0, Math.round(currentTime * 10) / 10);
    const end = Math.min(clipEndTime, Math.round((start + 3.0) * 10) / 10);
    const newId = `c-manual-${Date.now()}`;
    onAddCaption({
      id: newId,
      startTime: start,
      endTime: end > start ? end : start + 2.5,
      text: 'New manual caption here...',
    });
  };

  // Handle applied captions from AutoGenerateCaptionsModal
  const handleApplyGeneratedCaptions = (newItems: CaptionItem[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      onImportCaptions(newItems);
      setAiSuccessMsg(`Auto-generated and applied ${newItems.length} captions with Gemini!`);
    } else {
      const merged = [...captions, ...newItems].sort((a, b) => a.startTime - b.startTime);
      onImportCaptions(merged);
      setAiSuccessMsg(`Appended ${newItems.length} new auto-generated captions!`);
    }

    setTimeout(() => {
      setAiSuccessMsg(null);
    }, 4500);

    // Seek playhead to beginning of clip to preview results
    onSeek(clipStartTime);
  };

  // Import SRT or VTT file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const parsedItems: CaptionItem[] = [];
      const lines = text.split(/\r?\n/);
      let currentItem: Partial<CaptionItem> | null = null;

      // Robust SRT / VTT parser
      const timeRegex = /(?:(\d{2}):)?(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}):(\d{2})[,.](\d{3})/;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const timeMatch = line.match(timeRegex);

        if (timeMatch) {
          const sH = timeMatch[1] ? parseInt(timeMatch[1], 10) : 0;
          const sM = parseInt(timeMatch[2], 10);
          const sS = parseInt(timeMatch[3], 10);
          const sMs = parseInt(timeMatch[4], 10);
          const startSeconds = sH * 3600 + sM * 60 + sS + sMs / 1000;

          const eH = timeMatch[5] ? parseInt(timeMatch[5], 10) : 0;
          const eM = parseInt(timeMatch[6], 10);
          const eS = parseInt(timeMatch[7], 10);
          const eMs = parseInt(timeMatch[8], 10);
          const endSeconds = eH * 3600 + eM * 60 + eS + eMs / 1000;

          currentItem = {
            id: `c-import-${parsedItems.length + 1}`,
            startTime: startSeconds,
            endTime: endSeconds,
            text: '',
          };
        } else if (currentItem && line.length > 0 && !/^\d+$/.test(line) && line !== 'WEBVTT') {
          currentItem.text = currentItem.text ? `${currentItem.text} ${line}` : line;
        } else if (line === '' && currentItem && currentItem.text) {
          parsedItems.push(currentItem as CaptionItem);
          currentItem = null;
        }
      }

      if (currentItem && currentItem.text) {
        parsedItems.push(currentItem as CaptionItem);
      }

      if (parsedItems.length > 0) {
        onImportCaptions(parsedItems);
        setAiSuccessMsg(`Imported ${parsedItems.length} subtitle cues.`);
        setTimeout(() => setAiSuccessMsg(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  const sortedCaptions = [...captions].sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col h-full">
      {/* Header with Add & Auto-Generate Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Caption Editor</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
              {captions.length} {captions.length === 1 ? 'cue' : 'cues'}
            </span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Auto-generate with Gemini audio intelligence or edit timestamps manually
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Gemini Auto-Generate Captions Feature Button */}
          <button
            type="button"
            onClick={() => setIsAutoGenerateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-amber-500/20 hover:from-purple-500/30 hover:to-amber-500/30 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all shadow-md shadow-purple-500/10 cursor-pointer"
            title="Auto-generate audio-synced captions using Gemini API"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Auto-Generate Captions</span>
          </button>

          {/* Add Manual Caption Button */}
          <button
            type="button"
            onClick={handleAddNewAtPlayhead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 transition-all cursor-pointer"
            title="Insert a manual subtitle at current playhead"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Cue</span>
          </button>

          {/* Import SRT / VTT */}
          <label
            className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs transition-all cursor-pointer"
            title="Import .SRT or .VTT subtitle file"
          >
            <Upload className="w-3.5 h-3.5" />
            <input
              type="file"
              accept=".srt,.vtt,text/plain"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {aiSuccessMsg && (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl animate-in fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{aiSuccessMsg}</span>
        </div>
      )}

      {aiError && (
        <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{aiError}</span>
        </div>
      )}

      {/* Captions List */}
      <div className="mt-3 space-y-2.5 overflow-y-auto max-h-[360px] pr-1 scrollbar-thin">
        {sortedCaptions.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/30">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-amber-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-sm text-zinc-300 font-bold">No captions in this segment yet</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
              Use Gemini audio speech intelligence to automatically transcribe the selected video segment with timestamps, or add cues manually.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsAutoGenerateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-amber-500 hover:from-purple-400 hover:to-amber-400 text-black font-extrabold text-xs shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 fill-black" />
                <span>Auto-Generate with Gemini</span>
              </button>

              <button
                type="button"
                onClick={handleAddNewAtPlayhead}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Cue</span>
              </button>
            </div>
          </div>
        ) : (
          sortedCaptions.map((item, index) => {
            const isActive = currentTime >= item.startTime && currentTime <= item.endTime;
            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/5'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-zinc-500">
                      #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSeek(item.startTime)}
                      className="flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:underline cursor-pointer bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800"
                      title="Jump video to caption start"
                    >
                      <Play className="w-2.5 h-2.5 fill-amber-400" />
                      <span>{formatSeconds(item.startTime, true)}</span>
                    </button>
                    <span className="text-zinc-600 text-xs">→</span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {formatSeconds(item.endTime, true)}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      ({(item.endTime - item.startTime).toFixed(1)}s)
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const newId = `c-copy-${Date.now()}`;
                        onAddCaption({
                          ...item,
                          id: newId,
                          startTime: item.endTime,
                          endTime: item.endTime + (item.endTime - item.startTime),
                        });
                      }}
                      className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 cursor-pointer"
                      title="Duplicate caption after this"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteCaption(item.id)}
                      className="p-1 text-zinc-400 hover:text-red-400 rounded hover:bg-zinc-800 cursor-pointer"
                      title="Delete caption"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtitle Text Input */}
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => onUpdateCaption(item.id, { text: e.target.value })}
                  placeholder="Type subtitle phrase..."
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-all"
                />

                {/* Micro timing adjustments */}
                <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <span>Start:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={item.startTime}
                      onChange={(e) =>
                        onUpdateCaption(item.id, { startTime: Math.max(0, parseFloat(e.target.value) || 0) })
                      }
                      className="w-16 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-200 text-center font-mono focus:outline-none focus:border-amber-500"
                    />
                    <span>s</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span>End:</span>
                    <input
                      type="number"
                      step="0.1"
                      min={item.startTime + 0.1}
                      value={item.endTime}
                      onChange={(e) =>
                        onUpdateCaption(item.id, { endTime: parseFloat(e.target.value) || item.startTime + 0.5 })
                      }
                      className="w-16 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-200 text-center font-mono focus:outline-none focus:border-amber-500"
                    />
                    <span>s</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onUpdateCaption(item.id, {
                        startTime: Math.max(0, Math.round(currentTime * 10) / 10),
                      });
                    }}
                    className="ml-auto text-[10px] text-amber-400/80 hover:text-amber-400 cursor-pointer"
                  >
                    Set start to now
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {captions.length > 0 && (
        <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClearCaptions}
            className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
          >
            Clear All Captions
          </button>
          <span className="text-xs text-zinc-500">
            Export as .SRT or burned video in Export panel
          </span>
        </div>
      )}

      {/* Auto-Generate Captions with Gemini Modal */}
      {video && (
        <AutoGenerateCaptionsModal
          isOpen={isAutoGenerateModalOpen}
          onClose={() => setIsAutoGenerateModalOpen(false)}
          video={video}
          clipStartTime={clipStartTime}
          clipEndTime={clipEndTime}
          existingCaptionsCount={captions.length}
          videoElementRef={videoElementRef}
          onApplyCaptions={handleApplyGeneratedCaptions}
        />
      )}
    </div>
  );
};
