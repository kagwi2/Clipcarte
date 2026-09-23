import { useState, useEffect, useRef, useCallback } from 'react';
import { VideoInfo, ClipSettings, CaptionItem, CaptionStyle } from '../types';

export const PROJECT_STORAGE_KEY = 'clipcraft_current_project_v1';

export interface SavedProjectState {
  version: number;
  lastSavedAt: number;
  video: {
    id: string;
    type: VideoInfo['type'];
    title: string;
    url: string;
    duration: number;
    thumbnailUrl?: string;
    authorName?: string;
  };
  clipSettings: ClipSettings;
  captions: CaptionItem[];
  captionStyle?: CaptionStyle;
  currentTime?: number;
}

export interface UseProjectAutoSaveProps {
  currentVideo: VideoInfo;
  clipSettings: ClipSettings;
  captions: CaptionItem[];
  captionStyle?: CaptionStyle;
  currentTime?: number;
  intervalMs?: number; // Periodic save interval in ms, defaults to 3000ms
  enabled?: boolean;
}

/**
 * Reads any previously saved project state from localStorage
 */
export function loadSavedProjectState(): SavedProjectState | null {
  try {
    const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProjectState;
    if (parsed && parsed.video && parsed.clipSettings && Array.isArray(parsed.captions)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse saved project from localStorage:', err);
  }
  return null;
}

/**
 * Clears the saved project from localStorage
 */
export function clearSavedProjectState(): void {
  try {
    localStorage.removeItem(PROJECT_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear saved project from localStorage:', err);
  }
}

/**
 * Hook to periodically save the current project state to localStorage
 * so users can resume their editing session after a page refresh.
 */
export function useProjectAutoSave({
  currentVideo,
  clipSettings,
  captions,
  captionStyle,
  currentTime,
  intervalMs = 3000,
  enabled = true,
}: UseProjectAutoSaveProps) {
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(() => {
    const initial = loadSavedProjectState();
    return initial ? new Date(initial.lastSavedAt) : null;
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedTimeAgo, setSavedTimeAgo] = useState<string>('');

  // Keep latest references for intervals and beforeunload handler
  const latestStateRef = useRef({
    currentVideo,
    clipSettings,
    captions,
    captionStyle,
    currentTime,
  });

  useEffect(() => {
    latestStateRef.current = {
      currentVideo,
      clipSettings,
      captions,
      captionStyle,
      currentTime,
    };
  }, [currentVideo, clipSettings, captions, captionStyle, currentTime]);

  const lastSerializedRef = useRef<string>('');

  /**
   * Core save function
   */
  const performSave = useCallback((): boolean => {
    if (!enabled) return false;

    const {
      currentVideo: vid,
      clipSettings: cs,
      captions: caps,
      captionStyle: cStyle,
      currentTime: ct,
    } = latestStateRef.current;

    // Do not save if no video ID
    if (!vid || !vid.id) return false;

    const payload: SavedProjectState = {
      version: 1,
      lastSavedAt: Date.now(),
      video: {
        id: vid.id,
        type: vid.type,
        title: vid.title,
        url: vid.url,
        duration: vid.duration,
        thumbnailUrl: vid.thumbnailUrl,
        authorName: vid.authorName,
      },
      clipSettings: cs,
      captions: caps,
      captionStyle: cStyle,
      currentTime: ct,
    };

    const serialized = JSON.stringify(payload);

    // Skip redundant writes if nothing meaningful changed
    if (serialized === lastSerializedRef.current) {
      return false;
    }

    try {
      setIsSaving(true);
      localStorage.setItem(PROJECT_STORAGE_KEY, serialized);
      lastSerializedRef.current = serialized;
      const saveDate = new Date(payload.lastSavedAt);
      setLastSavedTime(saveDate);
      return true;
    } catch (err) {
      console.warn('Auto-save to localStorage failed:', err);
      return false;
    } finally {
      setTimeout(() => setIsSaving(false), 300);
    }
  }, [enabled]);

  /**
   * Periodic saving timer
   */
  useEffect(() => {
    if (!enabled) return;

    // Run initial save check after short delay
    const initialTimer = setTimeout(() => {
      performSave();
    }, 1200);

    // Periodic timer
    const intervalTimer = setInterval(() => {
      performSave();
    }, intervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [enabled, intervalMs, performSave]);

  /**
   * Also trigger save immediately when beforeunload fires (page refresh, tab close)
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      performSave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [performSave]);

  /**
   * Human-readable "Saved X seconds/minutes ago" helper
   */
  useEffect(() => {
    const updateAgo = () => {
      if (!lastSavedTime) {
        setSavedTimeAgo('');
        return;
      }
      const diffSec = Math.floor((Date.now() - lastSavedTime.getTime()) / 1000);
      if (diffSec < 4) {
        setSavedTimeAgo('Just now');
      } else if (diffSec < 60) {
        setSavedTimeAgo(`${diffSec}s ago`);
      } else {
        const mins = Math.floor(diffSec / 60);
        setSavedTimeAgo(`${mins}m ago`);
      }
    };

    updateAgo();
    const ticker = setInterval(updateAgo, 5000);
    return () => clearInterval(ticker);
  }, [lastSavedTime]);

  /**
   * Explicit manual save
   */
  const saveNow = useCallback(() => {
    performSave();
  }, [performSave]);

  /**
   * Clear session
   */
  const clearSession = useCallback(() => {
    clearSavedProjectState();
    setLastSavedTime(null);
    setSavedTimeAgo('');
    lastSerializedRef.current = '';
  }, []);

  return {
    lastSavedTime,
    savedTimeAgo,
    isSaving,
    saveNow,
    clearSession,
    getSavedProject: loadSavedProjectState,
    hasSavedSession: Boolean(lastSavedTime),
  };
}
