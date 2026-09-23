import { useState, useCallback, useRef } from 'react';
import { ClipSettings, CaptionItem } from '../types';

export interface StudioSnapshot {
  clipSettings: ClipSettings;
  captions: CaptionItem[];
  actionName?: string;
  timestamp: number;
}

export interface UseStudioHistoryOptions {
  maxHistory?: number;
  throttleMs?: number;
}

export function useStudioHistory(
  initialSettings: ClipSettings,
  initialCaptions: CaptionItem[],
  options: UseStudioHistoryOptions = {}
) {
  const maxHistory = options.maxHistory ?? 40;
  const throttleMs = options.throttleMs ?? 400;

  const [past, setPast] = useState<StudioSnapshot[]>([]);
  const [present, setPresent] = useState<StudioSnapshot>({
    clipSettings: initialSettings,
    captions: initialCaptions,
    actionName: 'Initial State',
    timestamp: Date.now(),
  });
  const [future, setFuture] = useState<StudioSnapshot[]>([]);
  const [lastUndoRedoAction, setLastUndoRedoAction] = useState<string | null>(null);

  // Keep references for immediate read in callbacks
  const presentRef = useRef(present);
  presentRef.current = present;

  const pastRef = useRef(past);
  pastRef.current = past;

  const futureRef = useRef(future);
  futureRef.current = future;

  const lastPushTimeRef = useRef<number>(0);
  const lastActionKeyRef = useRef<string>('');

  /**
   * Push a new state with smart grouping for rapid slider/typing edits
   */
  const recordChange = useCallback(
    (
      newSettings: ClipSettings,
      newCaptions: CaptionItem[],
      actionName: string,
      forceNewStep = false
    ) => {
      const now = Date.now();
      const currentPresent = presentRef.current;

      // Check if this action is identical to current state
      const settingsChanged =
        JSON.stringify(currentPresent.clipSettings) !== JSON.stringify(newSettings);
      const captionsChanged =
        JSON.stringify(currentPresent.captions) !== JSON.stringify(newCaptions);

      if (!settingsChanged && !captionsChanged) {
        return; // Nothing changed
      }

      const isRapidContinuousEdit =
        !forceNewStep &&
        actionName === lastActionKeyRef.current &&
        now - lastPushTimeRef.current < throttleMs;

      if (isRapidContinuousEdit) {
        // Group with current present state: simply update present without adding a new past step
        setPresent({
          clipSettings: newSettings,
          captions: newCaptions,
          actionName,
          timestamp: now,
        });
      } else {
        // Distinct step: push current present to past, clear future
        setPast((prevPast) => {
          const updated = [...prevPast, currentPresent];
          if (updated.length > maxHistory) {
            return updated.slice(updated.length - maxHistory);
          }
          return updated;
        });

        setPresent({
          clipSettings: newSettings,
          captions: newCaptions,
          actionName,
          timestamp: now,
        });

        // Any new action clears redo future
        setFuture([]);
      }

      lastPushTimeRef.current = now;
      lastActionKeyRef.current = actionName;
      setLastUndoRedoAction(null);
    },
    [maxHistory, throttleMs]
  );

  /**
   * Update clipSettings
   */
  const updateClipSettings = useCallback(
    (
      newSettingsOrUpdater: Partial<ClipSettings> | ((prev: ClipSettings) => ClipSettings),
      actionName = 'Edit Settings',
      forceNewStep = false
    ) => {
      const current = presentRef.current;
      const nextSettings =
        typeof newSettingsOrUpdater === 'function'
          ? newSettingsOrUpdater(current.clipSettings)
          : { ...current.clipSettings, ...newSettingsOrUpdater };

      recordChange(nextSettings, current.captions, actionName, forceNewStep);
    },
    [recordChange]
  );

  /**
   * Update captions
   */
  const updateCaptions = useCallback(
    (
      newCaptionsOrUpdater: CaptionItem[] | ((prev: CaptionItem[]) => CaptionItem[]),
      actionName = 'Edit Captions',
      forceNewStep = false
    ) => {
      const current = presentRef.current;
      const nextCaptions =
        typeof newCaptionsOrUpdater === 'function'
          ? newCaptionsOrUpdater(current.captions)
          : newCaptionsOrUpdater;

      recordChange(current.clipSettings, nextCaptions, actionName, forceNewStep);
    },
    [recordChange]
  );

  /**
   * Update both clipSettings and captions simultaneously (e.g. AI clip suggestion)
   */
  const updateStudioState = useCallback(
    (
      updates: {
        clipSettings?: Partial<ClipSettings> | ClipSettings;
        captions?: CaptionItem[];
      },
      actionName = 'Update Studio',
      forceNewStep = true
    ) => {
      const current = presentRef.current;
      const nextSettings = updates.clipSettings
        ? { ...current.clipSettings, ...updates.clipSettings }
        : current.clipSettings;
      const nextCaptions = updates.captions ?? current.captions;

      recordChange(nextSettings, nextCaptions, actionName, forceNewStep);
    },
    [recordChange]
  );

  /**
   * Undo to previous state
   */
  const undo = useCallback(() => {
    const currentPast = pastRef.current;
    if (currentPast.length === 0) return;

    const previous = currentPast[currentPast.length - 1];
    const newPast = currentPast.slice(0, currentPast.length - 1);
    const currentPresent = presentRef.current;

    setPast(newPast);
    setFuture((prevFuture) => [currentPresent, ...prevFuture]);
    setPresent(previous);
    setLastUndoRedoAction(`Undone: ${currentPresent.actionName || 'Change'}`);
  }, []);

  /**
   * Redo to future state
   */
  const redo = useCallback(() => {
    const currentFuture = futureRef.current;
    if (currentFuture.length === 0) return;

    const next = currentFuture[0];
    const newFuture = currentFuture.slice(1);
    const currentPresent = presentRef.current;

    setFuture(newFuture);
    setPast((prevPast) => [...prevPast, currentPresent]);
    setPresent(next);
    setLastUndoRedoAction(`Redone: ${next.actionName || 'Change'}`);
  }, []);

  /**
   * Reset the entire history (used when loading a new video or project)
   */
  const resetHistory = useCallback((newSettings: ClipSettings, newCaptions: CaptionItem[]) => {
    setPast([]);
    setFuture([]);
    setPresent({
      clipSettings: newSettings,
      captions: newCaptions,
      actionName: 'Initial State',
      timestamp: Date.now(),
    });
    setLastUndoRedoAction(null);
    lastPushTimeRef.current = 0;
    lastActionKeyRef.current = '';
  }, []);

  return {
    clipSettings: present.clipSettings,
    captions: present.captions,
    updateClipSettings,
    updateCaptions,
    updateStudioState,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    historyCount: {
      past: past.length,
      future: future.length,
    },
    currentAction: present.actionName,
    lastUndoRedoAction,
    resetHistory,
  };
}
