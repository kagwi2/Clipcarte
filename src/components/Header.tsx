import React, { useState } from 'react';
import {
  Scissors,
  Sparkles,
  Download,
  Undo2,
  Redo2,
  CloudCheck,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface HeaderProps {
  onOpenExport: () => void;
  onOpenAiSuggestions: () => void;
  hasVideo: boolean;
  aspectRatio: string;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  historyCount?: { past: number; future: number };
  autoSaveInfo?: {
    savedTimeAgo: string;
    isSaving: boolean;
    hasSavedSession: boolean;
    onResetSession?: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({
  onOpenExport,
  onOpenAiSuggestions,
  hasVideo,
  aspectRatio,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  historyCount,
  autoSaveInfo,
}) => {
  const [showSessionMenu, setShowSessionMenu] = useState(false);

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-white/20">
            <Scissors className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-1">
                Clip<span className="text-amber-400">Craft</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {aspectRatio}
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              YouTube Video Shorts & Multi-Format Clipper
            </p>
          </div>
        </div>

        {/* Action Controls, Autosave Badge, Undo/Redo */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Autosave Status Indicator */}
          {autoSaveInfo && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSessionMenu((prev) => !prev)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-[11px] font-medium bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                title="Your project state (captions, settings, video) is automatically saved to localStorage"
              >
                {autoSaveInfo.isSaving ? (
                  <>
                    <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                    <span className="text-zinc-300">Saving...</span>
                  </>
                ) : autoSaveInfo.hasSavedSession ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-zinc-300 hidden sm:inline">
                      {autoSaveInfo.savedTimeAgo ? `Saved ${autoSaveInfo.savedTimeAgo}` : 'Saved'}
                    </span>
                    <span className="text-zinc-300 sm:hidden">Saved</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                    <span className="text-zinc-400">Auto-save</span>
                  </>
                )}
              </button>

              {/* Session popup menu */}
              {showSessionMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSessionMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-64 p-3 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl z-50 text-left space-y-2.5 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Session Persistence
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {autoSaveInfo.savedTimeAgo || 'Active'}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Your current video ID, timestamps, custom aspect ratio, and captions are continuously preserved. If you refresh the page, your progress will be restored.
                    </p>

                    {autoSaveInfo.onResetSession && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowSessionMenu(false);
                          autoSaveInfo.onResetSession?.();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset to Default Sample</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Undo / Redo History Buttons */}
          <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl shadow-inner">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="flex items-center gap-1 p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 text-zinc-300 hover:text-white"
              title="Undo last change (Ctrl+Z / ⌘Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">Undo</span>
              {historyCount && historyCount.past > 0 && (
                <span className="text-[9px] font-mono px-1 rounded bg-zinc-800 text-zinc-400">
                  {historyCount.past}
                </span>
              )}
            </button>

            <div className="h-3.5 w-[1px] bg-zinc-800" />

            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="flex items-center gap-1 p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 text-zinc-300 hover:text-white"
              title="Redo change (Ctrl+Y / ⌘Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">Redo</span>
              {historyCount && historyCount.future > 0 && (
                <span className="text-[9px] font-mono px-1 rounded bg-zinc-800 text-zinc-400">
                  {historyCount.future}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenAiSuggestions}
            disabled={!hasVideo}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            title="AI Viral Clip Detection"
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="hidden xs:inline">AI Clip Finder</span>
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            disabled={!hasVideo}
            className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Clip</span>
          </button>
        </div>
      </div>
    </header>
  );
};
