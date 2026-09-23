import React, { useState, useRef } from 'react';
import {
  Music,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Upload,
  Check,
  Sparkles,
  Sliders,
  Mic,
  Disc,
  Info,
  Trash2,
  Headphones,
  Flame,
  Radio,
} from 'lucide-react';
import { ClipSettings, MusicGenre, MusicTrack } from '../types';
import { CURATED_MUSIC_TRACKS } from '../utils/proceduralMusic';

interface BackgroundMusicPanelProps {
  clipSettings: ClipSettings;
  onUpdateClipSettings: (newSettings: Partial<ClipSettings>) => void;
  isAuditioning: boolean;
  auditioningTrackId: string | null;
  isLoadingAudio: boolean;
  isDuckingActive: boolean;
  onToggleAudition: (trackId: string, customUrl?: string) => Promise<void>;
  onStopAudition: () => void;
  isPlayingVideo: boolean;
}

export const BackgroundMusicPanel: React.FC<BackgroundMusicPanelProps> = ({
  clipSettings,
  onUpdateClipSettings,
  isAuditioning,
  auditioningTrackId,
  isLoadingAudio,
  isDuckingActive,
  onToggleAudition,
  onStopAudition,
  isPlayingVideo,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const musicSettings = clipSettings.musicSettings || {
    enabled: false,
    selectedTrackId: 'lofi-sunset',
    volume: 0.25,
    videoVolume: 1.0,
    audioDucking: true,
    duckingAmount: 0.3,
    loop: true,
  };

  const isEnabled = musicSettings.enabled;
  const currentTrackId = musicSettings.selectedTrackId;

  // Selected track definition
  const currentTrack =
    currentTrackId === 'custom' && musicSettings.customTrack
      ? {
          id: 'custom',
          title: musicSettings.customTrack.name,
          artist: 'Custom Upload',
          genre: 'custom' as MusicGenre,
          bpm: 120,
          duration: musicSettings.customTrack.duration || 30,
          mood: 'User Audio File',
          gradient: 'from-amber-600 to-rose-600',
        }
      : CURATED_MUSIC_TRACKS.find((t) => t.id === currentTrackId) || CURATED_MUSIC_TRACKS[0];

  const handleToggleEnable = () => {
    onUpdateClipSettings({
      musicSettings: {
        ...musicSettings,
        enabled: !isEnabled,
      },
    });
  };

  const handleSelectTrack = (track: MusicTrack) => {
    onUpdateClipSettings({
      musicSettings: {
        ...musicSettings,
        enabled: true,
        selectedTrackId: track.id,
      },
    });
  };

  const handleUpdateVolume = (vol: number) => {
    onUpdateClipSettings({
      musicSettings: {
        ...musicSettings,
        volume: vol,
      },
    });
  };

  const handleUpdateVideoVolume = (vol: number) => {
    onUpdateClipSettings({
      volume: vol,
      musicSettings: {
        ...musicSettings,
        videoVolume: vol,
      },
    });
  };

  const handleToggleDucking = () => {
    onUpdateClipSettings({
      musicSettings: {
        ...musicSettings,
        audioDucking: !musicSettings.audioDucking,
      },
    });
  };

  const handleDuckingAmount = (amount: number) => {
    onUpdateClipSettings({
      musicSettings: {
        ...musicSettings,
        duckingAmount: amount,
      },
    });
  };

  // Custom audio file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    onUpdateClipSettings({
      musicSettings: {
        ...musicSettings,
        enabled: true,
        selectedTrackId: 'custom',
        customTrack: {
          id: 'custom',
          name: file.name.replace(/\.[^/.]+$/, ''),
          url,
          size: file.size,
        },
      },
    });

    // Reset input
    e.target.value = '';
  };

  const handleRemoveCustomTrack = () => {
    onUpdateClipSettings({
      musicSettings: {
        ...musicSettings,
        selectedTrackId: 'lofi-sunset',
        customTrack: null,
      },
    });
  };

  const filteredTracks =
    selectedGenre === 'all'
      ? CURATED_MUSIC_TRACKS
      : CURATED_MUSIC_TRACKS.filter((t) => t.genre === selectedGenre);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              Background Music & Soundtracks
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                Audio Mix
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Royalty-free viral loops, custom uploads & speech audio-ducking
            </p>
          </div>
        </div>

        {/* Master ON / OFF Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-300">
            {isEnabled ? (
              <span className="text-amber-400 font-bold">Enabled</span>
            ) : (
              <span className="text-zinc-500">Muted</span>
            )}
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={handleToggleEnable}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>
      </div>

      {/* Live Track Playing Hero Status Card */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-3.5 space-y-3 relative overflow-hidden shadow-inner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Animated Cover Disc */}
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentTrack.gradient} flex items-center justify-center text-white shadow-lg relative shrink-0 ${
                isEnabled && (isPlayingVideo || isAuditioning) ? 'animate-pulse' : ''
              }`}
            >
              <Disc
                className={`w-6 h-6 ${
                  isEnabled && (isPlayingVideo || isAuditioning) ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '4s' }}
              />
              {isEnabled && isPlayingVideo && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-zinc-950 rounded-full animate-ping" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs font-bold text-white truncate max-w-[200px]">
                  {currentTrack.title}
                </h4>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 uppercase font-semibold">
                  {currentTrack.genre}
                </span>
                <span className="text-[10px] font-mono text-amber-400 font-bold">
                  {currentTrack.bpm} BPM
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Quick Audition Play Button */}
          <button
            type="button"
            onClick={() =>
              onToggleAudition(
                currentTrack.id,
                currentTrack.id === 'custom' ? musicSettings.customTrack?.url : undefined
              )
            }
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              isAuditioning && auditioningTrackId === currentTrack.id
                ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
            }`}
            title="Preview track audio"
          >
            {isLoadingAudio && auditioningTrackId === currentTrack.id ? (
              <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isAuditioning && auditioningTrackId === currentTrack.id ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Auditioning</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Audition</span>
              </>
            )}
          </button>
        </div>

        {/* Live Audio Ducking Notice */}
        {isDuckingActive && (
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300 animate-in fade-in">
            <span className="flex items-center gap-1.5 font-medium">
              <Mic className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>
                <strong>Audio Ducking Active:</strong> Music volume lowered for clear spoken voice
              </span>
            </span>
            <span className="font-mono text-[10px] font-bold">
              {Math.round(musicSettings.volume * musicSettings.duckingAmount * 100)}% vol
            </span>
          </div>
        )}
      </div>

      {/* Audio Balance & Mix Controls */}
      <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3.5 space-y-3.5">
        <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>Volume & Mix Balance</span>
        </h4>

        {/* Music Volume */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 flex items-center gap-1.5">
              <Music className="w-3 h-3 text-amber-400" />
              <span>Background Music Volume</span>
            </span>
            <span className="font-mono font-bold text-amber-400">
              {Math.round(musicSettings.volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={musicSettings.volume}
            onChange={(e) => handleUpdateVolume(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />

          {/* Quick Volume Preset Pills */}
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            {[
              { label: 'Subtle (15%)', val: 0.15 },
              { label: 'Recommended (25%)', val: 0.25 },
              { label: 'Prominent (45%)', val: 0.45 },
              { label: 'Full (70%)', val: 0.7 },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => handleUpdateVolume(p.val)}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer text-center truncate ${
                  Math.abs(musicSettings.volume - p.val) < 0.05
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                    : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Video Dialogue Volume */}
        <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 flex items-center gap-1.5">
              <Mic className="w-3 h-3 text-emerald-400" />
              <span>Original Video Speech Volume</span>
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {Math.round((clipSettings.volume ?? 1) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={clipSettings.volume ?? 1}
            onChange={(e) => handleUpdateVideoVolume(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

        {/* Audio Ducking Toggle */}
        <div className="pt-2 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-200 block flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Smart Speech Ducking</span>
              </span>
              <span className="text-[10px] text-zinc-400">
                Automatically lower music during subtitle phrases for crystal clear dialogue
              </span>
            </div>
            <input
              type="checkbox"
              checked={musicSettings.audioDucking}
              onChange={handleToggleDucking}
              className="accent-amber-500 rounded cursor-pointer w-4 h-4"
            />
          </div>

          {musicSettings.audioDucking && (
            <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Ducking Intensity:</span>
                <span className="text-amber-400 font-mono font-bold">
                  {Math.round(musicSettings.duckingAmount * 100)}% of normal
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                {[
                  { label: 'Soft (20%)', val: 0.2 },
                  { label: 'Balanced (35%)', val: 0.35 },
                  { label: 'Gentle (50%)', val: 0.5 },
                ].map((d) => (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => handleDuckingAmount(d.val)}
                    className={`py-1 rounded-lg border text-center transition-all cursor-pointer ${
                      musicSettings.duckingAmount === d.val
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Audio Upload Section */}
      <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Upload Your Own Track (MP3 / WAV)</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3,audio/wav,audio/aac,audio/m4a,audio/ogg"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {musicSettings.customTrack ? (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Headphones className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {musicSettings.customTrack.name}
                </p>
                <p className="text-[10px] text-zinc-400">
                  Custom file • {(musicSettings.customTrack.size! / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onToggleAudition('custom', musicSettings.customTrack?.url)
                }
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 cursor-pointer"
                title="Audition custom audio"
              >
                {isAuditioning && auditioningTrackId === 'custom' ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </button>

              <button
                type="button"
                onClick={handleRemoveCustomTrack}
                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                title="Remove custom audio track"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-zinc-700 hover:border-amber-500/50 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Choose MP3 / WAV from computer</span>
          </button>
        )}
      </div>

      {/* Royalty-Free Viral Soundtrack Library */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>Royalty-Free Viral Track Library</span>
          </label>
        </div>

        {/* Genre Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs scrollbar-none">
          {[
            { id: 'all', label: 'All Loops' },
            { id: 'lofi', label: 'Lo-Fi Chill' },
            { id: 'phonk', label: 'Drift Phonk' },
            { id: 'cinematic', label: 'Suspense' },
            { id: 'synthwave', label: 'Synthwave' },
            { id: 'upbeat', label: 'Upbeat Pop' },
            { id: 'ambient', label: 'Ambient' },
          ].map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedGenre(g.id)}
              className={`py-1 px-2.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedGenre === g.id
                  ? 'bg-amber-500 text-black shadow-sm font-bold'
                  : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Track Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filteredTracks.map((track) => {
            const isSelected = currentTrackId === track.id;
            const isTrackAuditioning = isAuditioning && auditioningTrackId === track.id;

            return (
              <div
                key={track.id}
                onClick={() => handleSelectTrack(track)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative group ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/5'
                    : 'bg-zinc-950/70 border-zinc-800 hover:bg-zinc-950 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg bg-gradient-to-br ${track.gradient} flex items-center justify-center text-white shrink-0 shadow-md`}
                    >
                      <Music className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                        {track.title}
                      </h5>
                      <p className="text-[10px] text-zinc-400 truncate">{track.artist}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="p-1 rounded-full bg-amber-500 text-black">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 uppercase">
                      {track.genre}
                    </span>
                    <span className="text-amber-400 font-bold">{track.bpm} BPM</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleAudition(track.id);
                    }}
                    className={`py-1 px-2 rounded-lg border font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                      isTrackAuditioning
                        ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    {isLoadingAudio && auditioningTrackId === track.id ? (
                      <span className="w-2.5 h-2.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : isTrackAuditioning ? (
                      <>
                        <Pause className="w-2.5 h-2.5 fill-current" />
                        <span>Playing</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Listen</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
