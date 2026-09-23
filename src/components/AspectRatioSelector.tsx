import React, { useState } from 'react';
import {
  Smartphone,
  Square,
  Tv,
  Layers,
  Sliders,
  Maximize2,
  Lock,
  Unlock,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Crop,
  Check,
  Move,
} from 'lucide-react';
import { AspectRatioOption, AspectRatioPreset, ClipSettings } from '../types';
import { PREDEFINED_ASPECT_RATIOS, getTargetDimensions } from '../utils/aspectRatioUtils';

interface AspectRatioSelectorProps {
  clipSettings: ClipSettings;
  onUpdateClipSettings: (newSettings: Partial<ClipSettings>) => void;
}

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({
  clipSettings,
  onUpdateClipSettings,
}) => {
  const [showCustomModal, setShowCustomModal] = useState<boolean>(
    clipSettings.aspectRatio === 'custom'
  );

  const targetDim = getTargetDimensions(clipSettings);

  const handleSelectPreset = (preset: AspectRatioOption) => {
    if (preset.id === 'custom') {
      setShowCustomModal(true);
      onUpdateClipSettings({
        aspectRatio: 'custom',
      });
    } else {
      onUpdateClipSettings({
        aspectRatio: preset.id,
        customWidth: preset.defaultWidth,
        customHeight: preset.defaultHeight,
      });
    }
  };

  const handleWidthChange = (val: number) => {
    const newWidth = Math.max(120, Math.min(3840, val));
    if (clipSettings.lockAspectRatio && clipSettings.customWidth > 0) {
      const currentRatio = clipSettings.customHeight / clipSettings.customWidth;
      const newHeight = Math.round(newWidth * currentRatio);
      onUpdateClipSettings({
        aspectRatio: 'custom',
        customWidth: newWidth,
        customHeight: newHeight,
      });
    } else {
      onUpdateClipSettings({
        aspectRatio: 'custom',
        customWidth: newWidth,
      });
    }
  };

  const handleHeightChange = (val: number) => {
    const newHeight = Math.max(120, Math.min(3840, val));
    if (clipSettings.lockAspectRatio && clipSettings.customHeight > 0) {
      const currentRatio = clipSettings.customWidth / clipSettings.customHeight;
      const newWidth = Math.round(newHeight * currentRatio);
      onUpdateClipSettings({
        aspectRatio: 'custom',
        customWidth: newWidth,
        customHeight: newHeight,
      });
    } else {
      onUpdateClipSettings({
        aspectRatio: 'custom',
        customHeight: newHeight,
      });
    }
  };

  const handleSwapDimensions = () => {
    onUpdateClipSettings({
      aspectRatio: 'custom',
      customWidth: clipSettings.customHeight,
      customHeight: clipSettings.customWidth,
    });
  };

  const QUICK_RESOLUTION_PRESETS = [
    { label: '9:16 HD (1080×1920)', w: 1080, h: 1920 },
    { label: '4:5 IG (1080×1350)', w: 1080, h: 1350 },
    { label: '1:1 Square (1080×1080)', w: 1080, h: 1080 },
    { label: '16:9 YouTube (1920×1080)', w: 1920, h: 1080 },
    { label: 'Twitter Card (1200×675)', w: 1200, h: 675 },
    { label: 'Story/TikTok (720×1280)', w: 720, h: 1280 },
  ];

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-3.5">
      {/* Header with active ratio summary */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Crop className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Aspect Ratio & Framing</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-amber-400 border border-zinc-700 font-mono">
                {targetDim.simplifiedRatio} ({targetDim.width} × {targetDim.height}px)
              </span>
            </h4>
          </div>
        </div>

        {/* Fit Mode Switcher */}
        <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => onUpdateClipSettings({ fitMode: 'cover' })}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              clipSettings.fitMode === 'cover'
                ? 'bg-amber-500 text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Crop to fill aspect ratio"
          >
            Zoom Crop
          </button>
          <button
            type="button"
            onClick={() => onUpdateClipSettings({ fitMode: 'blurred-fit' })}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              clipSettings.fitMode === 'blurred-fit'
                ? 'bg-amber-500 text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Fit with ambient blurred background"
          >
            Blurred Fit
          </button>
        </div>
      </div>

      {/* Preset Aspect Ratio Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PREDEFINED_ASPECT_RATIOS.map((option) => {
          const isSelected = clipSettings.aspectRatio === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelectPreset(option)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-amber-400 bg-amber-500/10 ring-1 ring-amber-400 shadow-md shadow-amber-500/10'
                  : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                  {/* Miniature visual ratio shape */}
                  <span
                    className={`inline-block border rounded-xs ${
                      isSelected ? 'border-amber-400 bg-amber-400/20' : 'border-zinc-600 bg-zinc-800'
                    }`}
                    style={{
                      width: option.ratioW > option.ratioH ? 14 : Math.max(8, Math.round(14 * (option.ratioW / option.ratioH))),
                      height: option.ratioH >= option.ratioW ? 14 : Math.max(8, Math.round(14 * (option.ratioH / option.ratioW))),
                    }}
                  />
                  {option.label}
                </span>

                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </div>

              <span className="text-[10px] text-zinc-400 truncate">
                {option.sublabel}
              </span>

              <span className="text-[9px] font-mono text-zinc-500 mt-1">
                {option.defaultWidth}×{option.defaultHeight}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toggle Custom Dimensions drawer button */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => {
            setShowCustomModal(!showCustomModal);
            if (!showCustomModal) {
              onUpdateClipSettings({ aspectRatio: 'custom' });
            }
          }}
          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-semibold cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{showCustomModal ? 'Hide Custom Dimensions' : 'Enter Custom Width & Height'}</span>
          {showCustomModal ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {clipSettings.aspectRatio === 'custom' && (
          <span className="text-[11px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
            Custom Active
          </span>
        )}
      </div>

      {/* Custom Dimensions Drawer */}
      {showCustomModal && (
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span className="font-semibold">Pixel Resolution (Custom Dimensions)</span>
            <button
              type="button"
              onClick={() => onUpdateClipSettings({ lockAspectRatio: !clipSettings.lockAspectRatio })}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                clipSettings.lockAspectRatio
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
              }`}
              title="Lock proportion when changing width or height"
            >
              {clipSettings.lockAspectRatio ? (
                <>
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Locked</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3 text-zinc-500" />
                  <span>Unlocked</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-center">
            {/* Width Input */}
            <div className="sm:col-span-3">
              <label className="text-[10px] text-zinc-400 block mb-1">Width (px)</label>
              <input
                type="number"
                min="120"
                max="3840"
                step="10"
                value={clipSettings.customWidth || 1080}
                onChange={(e) => handleWidthChange(parseInt(e.target.value) || 1080)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Swap Button */}
            <div className="sm:col-span-1 flex justify-center pt-3 sm:pt-4">
              <button
                type="button"
                onClick={handleSwapDimensions}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                title="Swap Width & Height"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Height Input */}
            <div className="sm:col-span-3">
              <label className="text-[10px] text-zinc-400 block mb-1">Height (px)</label>
              <input
                type="number"
                min="120"
                max="3840"
                step="10"
                value={clipSettings.customHeight || 1920}
                onChange={(e) => handleHeightChange(parseInt(e.target.value) || 1920)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Quick Resolution Buttons */}
          <div className="pt-2 border-t border-zinc-800/80">
            <span className="text-[10px] text-zinc-400 block mb-1.5">Common Resolution Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_RESOLUTION_PRESETS.map((res, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onUpdateClipSettings({
                      aspectRatio: 'custom',
                      customWidth: res.w,
                      customHeight: res.h,
                    });
                  }}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all cursor-pointer"
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Framing & Pan Sliders (Intelligently enabled based on crop) */}
      {clipSettings.fitMode === 'cover' && (
        <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-2.5">
          <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-amber-400" />
            Intelligent Framing & Positioning
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Horizontal Pan */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                <span>Horizontal Pan (X)</span>
                <span className="font-mono text-zinc-200">{clipSettings.panX}%</span>
              </div>
              <input
                type="range"
                min="-45"
                max="45"
                value={clipSettings.panX}
                onChange={(e) => onUpdateClipSettings({ panX: Number(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
                title="Shift video left/right to center speaker"
              />
            </div>

            {/* Vertical Pan */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                <span>Vertical Pan (Y)</span>
                <span className="font-mono text-zinc-200">{clipSettings.panY || 0}%</span>
              </div>
              <input
                type="range"
                min="-45"
                max="45"
                value={clipSettings.panY || 0}
                onChange={(e) => onUpdateClipSettings({ panY: Number(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
                title="Shift video up/down for custom/wide crops"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
