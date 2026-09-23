import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Smartphone,
  Video,
  Layers,
  CheckCircle2,
  Bookmark,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ClipSettings, CaptionStyle } from '../types';
import {
  ExportPresetConfig,
  DEFAULT_EXPORT_PRESETS,
  getCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  matchesPreset,
} from '../utils/exportPresets';
import { getTargetDimensions } from '../utils/aspectRatioUtils';

interface PresetExportSettingsProps {
  clipSettings: ClipSettings;
  captionStyle: CaptionStyle;
  onApplyPreset: (preset: ExportPresetConfig) => void;
}

export const PresetExportSettings: React.FC<PresetExportSettingsProps> = ({
  clipSettings,
  captionStyle,
  onApplyPreset,
}) => {
  const [customPresets, setCustomPresets] = useState<ExportPresetConfig[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Load custom presets on mount
  useEffect(() => {
    setCustomPresets(getCustomPresets());
  }, []);

  const allPresets = [...DEFAULT_EXPORT_PRESETS, ...customPresets];
  const targetDim = getTargetDimensions(clipSettings);

  const activePreset = allPresets.find((p) => matchesPreset(p, clipSettings));

  const handleApply = (preset: ExportPresetConfig) => {
    onApplyPreset(preset);
    setAppliedNotice(`Applied "${preset.name}" preset!`);
    setTimeout(() => setAppliedNotice(null), 3000);
  };

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const saved = saveCustomPreset({
      name: newPresetName.trim(),
      platform: 'custom',
      badge: `${targetDim.simplifiedRatio} • ${targetDim.width}×${targetDim.height}`,
      description: newPresetDesc.trim() || `Custom configuration with ${clipSettings.fitMode} framing`,
      aspectRatio: clipSettings.aspectRatio,
      customWidth: targetDim.width,
      customHeight: targetDim.height,
      fitMode: clipSettings.fitMode,
      showTopBanner: clipSettings.showTopBanner,
      captionPresetKey: captionStyle.preset,
    });

    setCustomPresets((prev) => [saved, ...prev]);
    setNewPresetName('');
    setNewPresetDesc('');
    setIsCreatingNew(false);
    setAppliedNotice(`Saved "${saved.name}" to presets!`);
    setTimeout(() => setAppliedNotice(null), 3000);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCustomPreset(id);
    setCustomPresets((prev) => prev.filter((p) => p.id !== id));
  };

  // Helper for platform icon and badge styling
  const getPlatformStyle = (platform: ExportPresetConfig['platform']) => {
    switch (platform) {
      case 'tiktok':
        return {
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          ring: 'hover:border-cyan-500/40',
          dot: 'bg-cyan-400',
        };
      case 'reels':
        return {
          bg: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
          ring: 'hover:border-pink-500/40',
          dot: 'bg-pink-400',
        };
      case 'shorts':
        return {
          bg: 'bg-red-500/10 text-red-400 border-red-500/20',
          ring: 'hover:border-red-500/40',
          dot: 'bg-red-400',
        };
      case 'feed':
        return {
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          ring: 'hover:border-purple-500/40',
          dot: 'bg-purple-400',
        };
      case 'twitter':
        return {
          bg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
          ring: 'hover:border-sky-500/40',
          dot: 'bg-sky-400',
        };
      default:
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          ring: 'hover:border-amber-500/40',
          dot: 'bg-amber-400',
        };
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/90 space-y-3 shadow-inner">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Preset Export Configurations</span>
              {activePreset && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{activePreset.name} Active</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              Standardized framing & resolutions for TikTok, Instagram Reels, and YouTube Shorts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsCreatingNew((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800 hover:border-amber-500/30 transition-all cursor-pointer"
            title="Save current configuration as custom preset"
          >
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">Save Current</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer"
            title={isExpanded ? 'Collapse presets' : 'Expand presets'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Applied Notice */}
      {appliedNotice && (
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{appliedNotice}</span>
        </div>
      )}

      {/* Create Custom Preset Form */}
      {isCreatingNew && (
        <form
          onSubmit={handleSaveCurrent}
          className="p-3 bg-zinc-900 border border-amber-500/30 rounded-xl space-y-2.5 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              Save Current Settings as New Preset
            </span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {targetDim.simplifiedRatio} ({targetDim.width}×{targetDim.height} • {clipSettings.fitMode})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Preset Name (e.g. TikTok Viral Hook)..."
              required
              className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              value={newPresetDesc}
              onChange={(e) => setNewPresetDesc(e.target.value)}
              placeholder="Short description (optional)..."
              className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className="px-3 py-1 rounded-lg text-xs text-zinc-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20 cursor-pointer"
            >
              Save Preset
            </button>
          </div>
        </form>
      )}

      {/* Presets Grid */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {allPresets.map((preset) => {
            const isMatch = matchesPreset(preset, clipSettings);
            const style = getPlatformStyle(preset.platform);

            return (
              <div
                key={preset.id}
                onClick={() => handleApply(preset)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isMatch
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/30'
                    : `bg-zinc-900/70 border-zinc-800/80 ${style.ring} hover:bg-zinc-900`
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                      <span className="text-xs font-bold text-white truncate max-w-[130px]">
                        {preset.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${style.bg}`}
                      >
                        {preset.badge}
                      </span>
                      {preset.format && (
                        <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          .{preset.format.toUpperCase()}
                        </span>
                      )}

                      {preset.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(preset.id, preset.name, e)}
                          className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                          title="Delete custom preset"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500">
                  <div className="flex items-center gap-2">
                    <span className="capitalize">
                      {preset.fitMode === 'cover' ? 'Zoom Crop' : 'Blurred Fit'}
                    </span>
                    {preset.showTopBanner && (
                      <span className="text-amber-400/90 font-medium">• Headline On</span>
                    )}
                  </div>

                  {isMatch ? (
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" /> Active
                    </span>
                  ) : (
                    <span className="text-zinc-400 group-hover:text-amber-400 transition-colors font-semibold">
                      Apply →
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
