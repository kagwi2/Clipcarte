import { useEffect, useRef, useState, useCallback } from 'react';
import { BackgroundMusicSettings, CaptionItem, ClipSettings } from '../types';
import { generateProceduralMusicTrack } from '../utils/proceduralMusic';

interface UseBackgroundMusicProps {
  clipSettings: ClipSettings;
  currentTime: number;
  isPlaying: boolean;
  captions: CaptionItem[];
  onUpdateClipSettings?: (newSettings: Partial<ClipSettings>) => void;
}

export function useBackgroundMusic({
  clipSettings,
  currentTime,
  isPlaying,
  captions,
}: UseBackgroundMusicProps) {
  const musicSettings = clipSettings.musicSettings;
  const isEnabled = Boolean(musicSettings?.enabled);
  const selectedTrackId = musicSettings?.selectedTrackId || 'lofi-sunset';
  const musicVolume = musicSettings?.volume ?? 0.25;
  const audioDucking = musicSettings?.audioDucking ?? true;
  const duckingAmount = musicSettings?.duckingAmount ?? 0.3;

  // Audio elements
  const syncedAudioRef = useRef<HTMLAudioElement | null>(null);
  const auditionAudioRef = useRef<HTMLAudioElement | null>(null);

  const [auditioningTrackId, setAuditioningTrackId] = useState<string | null>(null);
  const [isAuditioning, setIsAuditioning] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);

  // Check if a caption is active at current video timestamp for audio ducking
  const isCaptionActive = Boolean(
    captions.find((c) => currentTime >= c.startTime && currentTime <= c.endTime)
  );

  const isDuckingActive = isEnabled && isPlaying && audioDucking && isCaptionActive;

  // Initialize synced audio element
  useEffect(() => {
    if (!syncedAudioRef.current) {
      const audio = new Audio();
      audio.loop = true;
      audio.preload = 'auto';
      syncedAudioRef.current = audio;
    }

    if (!auditionAudioRef.current) {
      const audio = new Audio();
      audio.loop = true;
      audio.preload = 'auto';
      auditionAudioRef.current = audio;
    }

    return () => {
      syncedAudioRef.current?.pause();
      auditionAudioRef.current?.pause();
    };
  }, []);

  // Resolve and set audio source for synced audio
  useEffect(() => {
    let isCancelled = false;

    const loadTrack = async () => {
      if (!syncedAudioRef.current) return;

      // Custom track takes priority if active
      if (musicSettings?.customTrack?.url && selectedTrackId === 'custom') {
        if (syncedAudioRef.current.src !== musicSettings.customTrack.url) {
          syncedAudioRef.current.src = musicSettings.customTrack.url;
          syncedAudioRef.current.load();
        }
        return;
      }

      setIsLoadingAudio(true);
      try {
        const url = await generateProceduralMusicTrack(selectedTrackId);
        if (!isCancelled && syncedAudioRef.current) {
          if (syncedAudioRef.current.src !== url) {
            syncedAudioRef.current.src = url;
            syncedAudioRef.current.load();
          }
        }
      } catch (err) {
        console.error('Failed to prepare background music track:', err);
      } finally {
        if (!isCancelled) setIsLoadingAudio(false);
      }
    };

    if (isEnabled) {
      loadTrack();
    } else {
      syncedAudioRef.current?.pause();
    }

    return () => {
      isCancelled = true;
    };
  }, [isEnabled, selectedTrackId, musicSettings?.customTrack?.url]);

  // Adjust volume dynamically (including Audio Ducking when captions are spoken)
  useEffect(() => {
    const audio = syncedAudioRef.current;
    if (!audio) return;

    const targetVolume = isDuckingActive
      ? Math.max(0.02, musicVolume * duckingAmount)
      : musicVolume;

    // Smooth volume transition
    audio.volume = Math.max(0, Math.min(1, targetVolume));
  }, [musicVolume, isDuckingActive, duckingAmount]);

  // Sync play / pause with video playback
  useEffect(() => {
    const audio = syncedAudioRef.current;
    if (!audio || !isEnabled) return;

    if (isPlaying) {
      // If user starts playing video, stop standalone auditioning
      if (auditionAudioRef.current) {
        auditionAudioRef.current.pause();
        setIsAuditioning(false);
        setAuditioningTrackId(null);
      }

      audio.play().catch(() => {
        // Autoplay policy fallback
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, isEnabled]);

  // Sync seek timestamp with video playback relative to clip start
  useEffect(() => {
    const audio = syncedAudioRef.current;
    if (!audio || !isEnabled || !audio.duration) return;

    const clipDuration = Math.max(1, clipSettings.endTime - clipSettings.startTime);
    const elapsed = Math.max(0, currentTime - clipSettings.startTime);
    const targetAudioTime = elapsed % audio.duration;

    if (Math.abs(audio.currentTime - targetAudioTime) > 0.6) {
      audio.currentTime = targetAudioTime;
    }
  }, [currentTime, clipSettings.startTime, clipSettings.endTime, isEnabled]);

  // Standalone auditioning for track browsing
  const toggleAudition = useCallback(
    async (trackId: string, customUrl?: string) => {
      const audio = auditionAudioRef.current;
      if (!audio) return;

      // If already auditioning this track, toggle pause
      if (auditioningTrackId === trackId && isAuditioning) {
        audio.pause();
        setIsAuditioning(false);
        return;
      }

      // Stop any synced audio
      syncedAudioRef.current?.pause();

      setIsLoadingAudio(true);
      try {
        let url = customUrl;
        if (!url) {
          url = await generateProceduralMusicTrack(trackId);
        }

        audio.src = url;
        audio.volume = musicVolume;
        await audio.play();
        setAuditioningTrackId(trackId);
        setIsAuditioning(true);
      } catch (err) {
        console.error('Audition error:', err);
      } finally {
        setIsLoadingAudio(false);
      }
    },
    [auditioningTrackId, isAuditioning, musicVolume]
  );

  const stopAudition = useCallback(() => {
    if (auditionAudioRef.current) {
      auditionAudioRef.current.pause();
    }
    setIsAuditioning(false);
    setAuditioningTrackId(null);
  }, []);

  return {
    syncedAudioRef,
    isDuckingActive,
    isAuditioning,
    auditioningTrackId,
    isLoadingAudio,
    toggleAudition,
    stopAudition,
  };
}
