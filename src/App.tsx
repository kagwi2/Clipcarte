import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { UrlInputBar } from './components/UrlInputBar';
import { VideoPlayerPreview } from './components/VideoPlayerPreview';
import { TimelineClipper } from './components/TimelineClipper';
import { CaptionEditor } from './components/CaptionEditor';
import { CaptionStylingPanel } from './components/CaptionStylingPanel';
import { AspectRatioSelector } from './components/AspectRatioSelector';
import { BackgroundMusicPanel } from './components/BackgroundMusicPanel';
import { AiClipSuggesterModal } from './components/AiClipSuggesterModal';
import { ExportModal } from './components/ExportModal';
import { VideoInfo, ClipSettings, CaptionStyle, CaptionItem, SuggestedClip } from './types';
import { CAPTION_PRESETS, SAMPLE_VIDEOS, SampleVideoItem } from './data/presets';
import { getTargetDimensions } from './utils/aspectRatioUtils';
import { useStudioHistory } from './hooks/useStudioHistory';
import { useProjectAutoSave, loadSavedProjectState } from './hooks/useProjectAutoSave';
import { useBackgroundMusic } from './hooks/useBackgroundMusic';
import { MessageSquare, Palette, Clock, Crop, RotateCcw, RotateCw, Undo2, Redo2, CheckCircle2, X, Music } from 'lucide-react';
import { ToastNotificationProvider } from './context/ToastNotificationContext';

function StudioApp() {
  const initialSample = SAMPLE_VIDEOS[0];
  const initialSavedSession = useRef(loadSavedProjectState()).current;

  const [currentVideo, setCurrentVideo] = useState<VideoInfo>(() => {
    if (initialSavedSession?.video) {
      return {
        type: initialSavedSession.video.type,
        id: initialSavedSession.video.id,
        title: initialSavedSession.video.title,
        authorName: initialSavedSession.video.authorName || 'Creator',
        thumbnailUrl: initialSavedSession.video.thumbnailUrl,
        url: initialSavedSession.video.url,
        duration: initialSavedSession.video.duration,
        localVideoUrl: initialSavedSession.video.type === 'sample' ? initialSavedSession.video.url : undefined,
      };
    }
    return {
      type: initialSample.sourceType,
      id: 'sample-1',
      title: initialSample.title,
      authorName: initialSample.author,
      thumbnailUrl: initialSample.thumbnail,
      url: initialSample.url,
      duration: initialSample.duration,
      localVideoUrl: initialSample.url,
    };
  });

  const defaultClipSettings: ClipSettings = {
    startTime: initialSample.initialStartTime,
    endTime: initialSample.initialEndTime,
    aspectRatio: '9:16',
    customWidth: 1080,
    customHeight: 1920,
    lockAspectRatio: true,
    fitMode: 'cover',
    panX: 0,
    panY: 0,
    zoom: 1.0,
    volume: 1.0,
    loop: true,
    topBannerText: initialSample.suggestedHooks[0] || 'Viral Short ⚡',
    showTopBanner: true,
    musicSettings: {
      enabled: false,
      selectedTrackId: 'lofi-sunset',
      volume: 0.25,
      videoVolume: 1.0,
      audioDucking: true,
      duckingAmount: 0.3,
      loop: true,
    },
  };

  const initialClipSettings: ClipSettings = initialSavedSession?.clipSettings || defaultClipSettings;
  const initialCaptions: CaptionItem[] = initialSavedSession?.captions || initialSample.defaultCaptions;

  // State management with Undo/Redo history for clipSettings & captions
  const {
    clipSettings,
    captions,
    updateClipSettings,
    updateCaptions,
    undo,
    redo,
    canUndo,
    canRedo,
    historyCount,
    lastUndoRedoAction,
    resetHistory,
  } = useStudioHistory(initialClipSettings, initialCaptions);

  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(
    initialSavedSession?.captionStyle || CAPTION_PRESETS.hormozi
  );
  const [currentTime, setCurrentTime] = useState<number>(
    initialSavedSession?.currentTime ?? initialClipSettings.startTime
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Notice when session was resumed
  const [sessionRestoredNotice, setSessionRestoredNotice] = useState<boolean>(
    Boolean(initialSavedSession)
  );

  // Periodic Auto-Save Hook to localStorage
  const {
    savedTimeAgo,
    isSaving,
    hasSavedSession,
    clearSession,
    saveNow,
  } = useProjectAutoSave({
    currentVideo,
    clipSettings,
    captions,
    captionStyle,
    currentTime,
    intervalMs: 2500,
  });

  const handleResetToSample = () => {
    clearSession();
    const freshSample = SAMPLE_VIDEOS[0];
    setCurrentVideo({
      type: freshSample.sourceType,
      id: 'sample-1',
      title: freshSample.title,
      authorName: freshSample.author,
      thumbnailUrl: freshSample.thumbnail,
      url: freshSample.url,
      duration: freshSample.duration,
      localVideoUrl: freshSample.url,
    });
    resetHistory(defaultClipSettings, freshSample.defaultCaptions);
    setCaptionStyle(CAPTION_PRESETS.hormozi);
    setCurrentTime(freshSample.initialStartTime);
    setToastMessage('Reset session to default sample');
    setSessionRestoredNotice(false);
  };

  // Active right-side tab: 'aspect' | 'captions' | 'style' | 'music' | 'timeline'
  const [activeTab, setActiveTab] = useState<'aspect' | 'captions' | 'style' | 'music' | 'timeline'>('aspect');

  // Background Music engine & playback synchronization
  const {
    isDuckingActive,
    isAuditioning,
    auditioningTrackId,
    isLoadingAudio,
    toggleAudition,
    stopAudition,
  } = useBackgroundMusic({
    clipSettings,
    currentTime,
    isPlaying,
    captions,
  });

  // Floating notification for undo/redo
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isAiSuggestionsOpen, setIsAiSuggestionsOpen] = useState<boolean>(false);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const targetDim = getTargetDimensions(clipSettings);

  // Trigger toast on undo/redo action
  useEffect(() => {
    if (lastUndoRedoAction) {
      setToastMessage(lastUndoRedoAction);
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [lastUndoRedoAction]);

  // Global Keyboard shortcuts for Play/Pause, Seek, and Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      // Handle Undo / Redo shortcuts (Ctrl+Z, ⌘Z, Ctrl+Y, ⌘Y, ⌘Shift+Z)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          if (canRedo) redo();
        } else {
          e.preventDefault();
          if (canUndo) undo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      // Playback shortcuts (only when not typing in text fields)
      if (isInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(0, currentTime - 1));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(Math.min(currentVideo.duration, currentTime + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, currentVideo.duration, canUndo, canRedo, undo, redo]);

  // Handle Loading a YouTube URL
  const handleLoadYouTube = async (url: string) => {
    setIsLoadingUrl(true);
    setUrlError(null);
    try {
      const res = await fetch(`/api/youtube-info?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Could not load YouTube video info');
      }

      const data = await res.json();
      const dur = data.durationEstimate || 300;

      const newVideo: VideoInfo = {
        type: 'youtube',
        id: data.videoId,
        title: data.title || 'YouTube Video',
        authorName: data.authorName || 'YouTube Creator',
        thumbnailUrl: data.thumbnailUrl,
        url: data.watchUrl,
        duration: dur,
      };

      setCurrentVideo(newVideo);
      const newStart = 0;
      const newEnd = Math.min(30, dur);

      const newSettings: ClipSettings = {
        ...clipSettings,
        startTime: newStart,
        endTime: newEnd,
        topBannerText: data.title ? `${data.title.slice(0, 32)}...` : 'Watch till the end 🤯',
      };

      const newCaptions: CaptionItem[] = [
        { id: 'c-1', startTime: 0.5, endTime: 3.5, text: 'Check out this incredible moment!' },
        { id: 'c-2', startTime: 3.8, endTime: 7.5, text: 'Notice what happens right here.' },
        { id: 'c-3', startTime: 8.0, endTime: 12.0, text: 'This will completely change your perspective.' },
      ];

      resetHistory(newSettings, newCaptions);
      setCurrentTime(newStart);
      setIsPlaying(false);
    } catch (err: any) {
      setUrlError(err.message || 'Failed to fetch YouTube details');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // Handle Loading a Sample Preset
  const handleLoadSample = (sample: SampleVideoItem) => {
    setCurrentVideo({
      type: sample.sourceType,
      id: `sample-${Date.now()}`,
      title: sample.title,
      authorName: sample.author,
      thumbnailUrl: sample.thumbnail,
      url: sample.url,
      duration: sample.duration,
      localVideoUrl: sample.url,
    });

    const newSettings: ClipSettings = {
      ...clipSettings,
      startTime: sample.initialStartTime,
      endTime: sample.initialEndTime,
      topBannerText: sample.suggestedHooks[0] || 'Viral Hook ⚡',
    };

    resetHistory(newSettings, sample.defaultCaptions);
    setCurrentTime(sample.initialStartTime);
    setIsPlaying(false);
  };

  // Handle Local File Upload
  const handleUploadFile = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.src = objectUrl;
    tempVideo.onloadedmetadata = () => {
      const dur = tempVideo.duration || 60;
      setCurrentVideo({
        type: 'local',
        id: `local-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        authorName: 'Local Upload',
        thumbnailUrl: '',
        url: objectUrl,
        duration: dur,
        localVideoUrl: objectUrl,
        fileBlob: file,
      });

      const newStart = 0;
      const newEnd = Math.min(30, dur);
      const newSettings: ClipSettings = {
        ...clipSettings,
        startTime: newStart,
        endTime: newEnd,
        topBannerText: file.name.slice(0, 30),
      };

      const newCaptions: CaptionItem[] = [
        { id: 'c-1', startTime: 0.5, endTime: 3.5, text: 'Here is what you need to know.' },
        { id: 'c-2', startTime: 4.0, endTime: 8.0, text: 'Custom captions added in custom format!' },
      ];

      resetHistory(newSettings, newCaptions);
      setCurrentTime(newStart);
      setIsPlaying(false);
    };
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = time;
    }
  };

  const handlePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  // Updating clipSettings with history
  const handleUpdateClipSettings = (newSettings: Partial<ClipSettings>) => {
    let actionName = 'Adjust Settings';
    if ('aspectRatio' in newSettings || 'customWidth' in newSettings || 'customHeight' in newSettings) {
      actionName = 'Change Aspect Ratio';
    } else if ('startTime' in newSettings || 'endTime' in newSettings) {
      actionName = 'Trim Clip Timing';
    } else if ('panX' in newSettings || 'panY' in newSettings || 'fitMode' in newSettings) {
      actionName = 'Adjust Framing';
    } else if ('topBannerText' in newSettings || 'showTopBanner' in newSettings) {
      actionName = 'Update Headline Banner';
    }

    updateClipSettings(newSettings, actionName);
  };

  const handleUpdateCaptionStyle = (newStyle: Partial<CaptionStyle>) => {
    setCaptionStyle((prev) => ({ ...prev, ...newStyle }));
  };

  // Caption operations with history
  const handleAddCaption = (newCaption: CaptionItem) => {
    updateCaptions((prev) => [...prev, newCaption], 'Add Caption', true);
  };

  const handleUpdateCaption = (id: string, updated: Partial<CaptionItem>) => {
    updateCaptions(
      (prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)),
      'Edit Caption'
    );
  };

  const handleDeleteCaption = (id: string) => {
    updateCaptions((prev) => prev.filter((c) => c.id !== id), 'Delete Caption', true);
  };

  const handleClearCaptions = () => {
    updateCaptions([], 'Clear Captions', true);
  };

  const handleImportCaptions = (items: CaptionItem[]) => {
    updateCaptions(items, 'Import Subtitles', true);
  };

  const handleSelectSuggestedClip = (clip: SuggestedClip) => {
    updateClipSettings(
      {
        startTime: clip.startTime,
        endTime: clip.endTime,
        topBannerText: clip.hookText || clip.title,
        showTopBanner: true,
      },
      `Select AI Clip: ${clip.title}`,
      true
    );
    handleSeek(clip.startTime);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative">
      {/* Top Header with integrated Undo/Redo & Autosave */}
      <Header
        onOpenExport={() => setIsExportOpen(true)}
        onOpenAiSuggestions={() => setIsAiSuggestionsOpen(true)}
        hasVideo={Boolean(currentVideo)}
        aspectRatio={`${targetDim.simplifiedRatio}`}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        historyCount={historyCount}
        autoSaveInfo={{
          savedTimeAgo,
          isSaving,
          hasSavedSession,
          onResetSession: handleResetToSample,
        }}
      />

      {/* Floating Undo/Redo Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-zinc-900/95 border border-amber-500/40 text-amber-300 text-xs px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Session Restored Alert Banner */}
        {sessionRestoredNotice && (
          <div className="p-3 sm:px-4 rounded-2xl bg-zinc-900/90 border border-emerald-500/30 shadow-lg flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5 text-zinc-200 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">
                <strong className="text-emerald-400 font-semibold">Editing session restored:</strong> Resumed your clip project for{' '}
                <span className="text-white font-medium">"{currentVideo.title}"</span> ({targetDim.simplifiedRatio} • {captions.length} captions).
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleResetToSample}
                className="text-[11px] font-semibold text-zinc-400 hover:text-amber-400 underline transition-colors cursor-pointer"
              >
                Start fresh
              </button>
              <button
                type="button"
                onClick={() => setSessionRestoredNotice(false)}
                className="p-1 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* YouTube URL & Media Loader */}
        <UrlInputBar
          onLoadYouTube={handleLoadYouTube}
          onLoadSample={handleLoadSample}
          onUploadFile={handleUploadFile}
          isLoading={isLoadingUrl}
          currentVideo={currentVideo}
          error={urlError}
        />

        {/* Studio Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Adaptive Aspect Viewport & Live Animated Captions Player */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center justify-center bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-5 shadow-2xl">
            <div className="w-full flex items-center justify-between mb-3 px-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Framing & Captions
              </span>
              <div className="flex items-center gap-2">
                {/* Secondary Mini Undo/Redo for quick access near preview */}
                <div className="flex items-center gap-1 bg-zinc-950/80 border border-zinc-800 px-1 py-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={undo}
                    disabled={!canUndo}
                    className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={redo}
                    disabled={!canRedo}
                    className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo2 className="w-3 h-3" />
                  </button>
                </div>

                <span className="text-xs font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  {targetDim.simplifiedRatio} ({targetDim.width}×{targetDim.height})
                </span>
              </div>
            </div>

            <VideoPlayerPreview
              video={currentVideo}
              clipSettings={clipSettings}
              captionStyle={captionStyle}
              captions={captions}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onTimeUpdate={setCurrentTime}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onUpdateClipSettings={handleUpdateClipSettings}
              onUpdateCaptionStyle={handleUpdateCaptionStyle}
              videoElementRef={videoElementRef}
            />
          </div>

          {/* Right Column: Multi-tab Editing Engine */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-4">
            {/* Tab Navigation */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('aspect')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'aspect'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Aspect & Size</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('captions')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'captions'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Captions ({captions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('style')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'style'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Style</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('music')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                  activeTab === 'music'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>Music</span>
                {clipSettings.musicSettings?.enabled && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-950" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'timeline'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Trimmer</span>
              </button>
            </div>

            {/* Always visible timeline clipper */}
            <TimelineClipper
              duration={currentVideo.duration}
              currentTime={currentTime}
              clipSettings={clipSettings}
              captions={captions}
              onUpdateClipSettings={handleUpdateClipSettings}
              onSeek={handleSeek}
            />

            {/* Tab 1: Aspect Ratio & Dimensions Customization */}
            {activeTab === 'aspect' && (
              <AspectRatioSelector
                clipSettings={clipSettings}
                onUpdateClipSettings={handleUpdateClipSettings}
              />
            )}

            {/* Tab 2: Captions Editor */}
            {activeTab === 'captions' && (
              <CaptionEditor
                captions={captions}
                currentTime={currentTime}
                clipStartTime={clipSettings.startTime}
                clipEndTime={clipSettings.endTime}
                videoTitle={currentVideo.title}
                video={currentVideo}
                videoElementRef={videoElementRef}
                onAddCaption={handleAddCaption}
                onUpdateCaption={handleUpdateCaption}
                onDeleteCaption={handleDeleteCaption}
                onClearCaptions={handleClearCaptions}
                onSeek={handleSeek}
                onImportCaptions={handleImportCaptions}
              />
            )}

            {/* Tab 3: Caption Styling & Effects */}
            {activeTab === 'style' && (
              <CaptionStylingPanel
                captionStyle={captionStyle}
                clipSettings={clipSettings}
                onUpdateCaptionStyle={handleUpdateCaptionStyle}
                onUpdateClipSettings={handleUpdateClipSettings}
              />
            )}

            {/* Tab 4: Background Music & Audio Mix */}
            {activeTab === 'music' && (
              <BackgroundMusicPanel
                clipSettings={clipSettings}
                onUpdateClipSettings={handleUpdateClipSettings}
                isAuditioning={isAuditioning}
                auditioningTrackId={auditioningTrackId}
                isLoadingAudio={isLoadingAudio}
                isDuckingActive={isDuckingActive}
                onToggleAudition={toggleAudition}
                onStopAudition={stopAudition}
                isPlayingVideo={isPlaying}
              />
            )}

            {/* Tab 4: Detailed Trimmer Notes */}
            {activeTab === 'timeline' && (
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Timeline & History Shortcuts
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <span>Undo: <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 font-mono text-zinc-200">Ctrl+Z</kbd></span>
                    <span>Redo: <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 font-mono text-zinc-200">Ctrl+Y</kbd></span>
                  </div>
                </div>
                <ul className="text-xs text-zinc-400 space-y-2 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span><strong>Undo / Redo Buffer:</strong> Every trimming adjustment, caption edit, deletion, and aspect ratio swap is preserved in memory.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span><strong>Continuous Edit Grouping:</strong> Rapid slider drags and text typing are intelligently throttled into cohesive undo steps.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span><strong>Spacebar:</strong> Play / Pause toggle anywhere in the studio.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span><strong>Left / Right Arrow:</strong> Nudge playhead by 1 second.</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* AI Suggested Clips Modal */}
      <AiClipSuggesterModal
        isOpen={isAiSuggestionsOpen}
        onClose={() => setIsAiSuggestionsOpen(false)}
        video={currentVideo}
        onSelectClip={handleSelectSuggestedClip}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        video={currentVideo}
        clipSettings={clipSettings}
        captionStyle={captionStyle}
        captions={captions}
        videoElementRef={videoElementRef}
        onUpdateClipSettings={handleUpdateClipSettings}
        onUpdateCaptionStyle={handleUpdateCaptionStyle}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastNotificationProvider>
      <StudioApp />
    </ToastNotificationProvider>
  );
}
