import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles,
  Download,
  Film,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Clock,
  Check,
  Minimize2,
  Maximize2,
} from 'lucide-react';

export type TaskType = 'caption_generation' | 'video_export' | 'audio_capture';
export type TaskStatus = 'running' | 'completed' | 'error';

export interface ToastTask {
  id: string;
  type: TaskType;
  title: string;
  description?: string;
  progress: number; // 0 to 100
  status: TaskStatus;
  errorMessage?: string;
  startTime: number;
  completedAt?: number;
  metadata?: {
    format?: string;
    totalSeconds?: number;
    currentSecond?: number;
    cueCount?: number;
    isIndeterminate?: boolean;
  };
}

interface ToastContextValue {
  tasks: ToastTask[];
  startTask: (
    type: TaskType,
    title: string,
    description?: string,
    initialProgress?: number,
    metadata?: ToastTask['metadata']
  ) => string;
  updateTask: (
    id: string,
    updates: {
      progress?: number;
      title?: string;
      description?: string;
      metadata?: Partial<ToastTask['metadata']>;
    }
  ) => void;
  completeTask: (id: string, message?: { title?: string; description?: string }) => void;
  failTask: (id: string, errorMessage: string) => void;
  dismissTask: (id: string) => void;
}

const ToastNotificationContext = createContext<ToastContextValue | null>(null);

export const ToastNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<ToastTask[]>([]);
  const autoDismissTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const startTask = useCallback(
    (
      type: TaskType,
      title: string,
      description?: string,
      initialProgress = 0,
      metadata?: ToastTask['metadata']
    ) => {
      const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newTask: ToastTask = {
        id,
        type,
        title,
        description,
        progress: Math.min(100, Math.max(0, initialProgress)),
        status: 'running',
        startTime: Date.now(),
        metadata,
      };

      setTasks((prev) => [newTask, ...prev.filter((t) => t.status === 'running')]);
      return id;
    },
    []
  );

  const updateTask = useCallback(
    (
      id: string,
      updates: {
        progress?: number;
        title?: string;
        description?: string;
        metadata?: Partial<ToastTask['metadata']>;
      }
    ) => {
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== id) return task;
          return {
            ...task,
            ...(updates.title ? { title: updates.title } : {}),
            ...(updates.description ? { description: updates.description } : {}),
            ...(updates.progress !== undefined
              ? { progress: Math.min(100, Math.max(0, updates.progress)) }
              : {}),
            ...(updates.metadata
              ? { metadata: { ...task.metadata, ...updates.metadata } }
              : {}),
          };
        })
      );
    },
    []
  );

  const completeTask = useCallback(
    (id: string, message?: { title?: string; description?: string }) => {
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== id) return task;
          return {
            ...task,
            progress: 100,
            status: 'completed',
            completedAt: Date.now(),
            ...(message?.title ? { title: message.title } : {}),
            ...(message?.description ? { description: message.description } : {}),
          };
        })
      );

      // Auto dismiss completed task after 4.5 seconds
      if (autoDismissTimers.current.has(id)) {
        clearTimeout(autoDismissTimers.current.get(id));
      }
      const timer = setTimeout(() => {
        dismissTask(id);
      }, 4500);
      autoDismissTimers.current.set(id, timer);
    },
    []
  );

  const failTask = useCallback((id: string, errorMessage: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        return {
          ...task,
          status: 'error',
          errorMessage,
          description: errorMessage,
        };
      })
    );
  }, []);

  const dismissTask = useCallback((id: string) => {
    if (autoDismissTimers.current.has(id)) {
      clearTimeout(autoDismissTimers.current.get(id));
      autoDismissTimers.current.delete(id);
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastNotificationContext.Provider
      value={{
        tasks,
        startTask,
        updateTask,
        completeTask,
        failTask,
        dismissTask,
      }}
    >
      {children}
      <ToastNotificationContainer tasks={tasks} onDismiss={dismissTask} />
    </ToastNotificationContext.Provider>
  );
};

export const useToastNotifications = () => {
  const context = useContext(ToastNotificationContext);
  if (!context) {
    throw new Error('useToastNotifications must be used within a ToastNotificationProvider');
  }
  return context;
};

// Container Component rendering floating toasts
const ToastNotificationContainer: React.FC<{
  tasks: ToastTask[];
  onDismiss: (id: string) => void;
}> = ({ tasks, onDismiss }) => {
  if (tasks.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full px-4 sm:px-0 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {tasks.map((task) => (
          <ToastCard key={task.id} task={task} onDismiss={() => onDismiss(task.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Individual Toast Card with Progress Bar
const ToastCard: React.FC<{
  task: ToastTask;
  onDismiss: () => void;
}> = ({ task, onDismiss }) => {
  const isCaption = task.type === 'caption_generation';
  const isExport = task.type === 'video_export';

  const theme = isCaption
    ? {
        accent: 'from-purple-500 to-indigo-500',
        badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        barBg: 'from-purple-500 via-indigo-500 to-purple-400',
        iconBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        glow: 'shadow-purple-500/10',
        icon: Sparkles,
        tag: 'Gemini AI',
      }
    : {
        accent: 'from-amber-500 to-amber-400',
        badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        barBg: 'from-amber-500 via-yellow-400 to-amber-300',
        iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        glow: 'shadow-amber-500/10',
        icon: Film,
        tag: task.metadata?.format?.toUpperCase() || 'MP4 Export',
      };

  const Icon = theme.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 shadow-2xl p-4 text-zinc-100 ${theme.glow}`}
    >
      {/* Top Accent Line */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
          task.status === 'completed'
            ? 'from-emerald-500 to-teal-400'
            : task.status === 'error'
            ? 'from-red-500 to-rose-400'
            : theme.accent
        }`}
      />

      <div className="flex items-start justify-between gap-3">
        {/* Leading Icon */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
            task.status === 'completed'
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : task.status === 'error'
              ? 'bg-red-500/20 text-red-400 border-red-500/30'
              : theme.iconBg
          }`}
        >
          {task.status === 'completed' ? (
            <Check className="w-4 h-4 stroke-[3]" />
          ) : task.status === 'error' ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h5 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
              <span>{task.title}</span>
            </h5>
            <div className="flex items-center gap-1 shrink-0">
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${theme.badgeBg}`}>
                {theme.tag}
              </span>
              {task.status === 'running' && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono font-bold ml-1">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  {task.progress}%
                </span>
              )}
            </div>
          </div>

          {/* Description / Subtitle */}
          <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
            {task.description || (task.status === 'running' ? 'Processing background task...' : '')}
          </p>

          {/* Progress Bar UI */}
          {task.status === 'running' && (
            <div className="mt-2.5 space-y-1">
              <div className="w-full bg-zinc-800/90 h-2 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${theme.barBg} shadow-sm`}
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.max(4, task.progress)}%` }}
                  transition={{ ease: 'easeOut', duration: 0.25 }}
                />
              </div>

              {/* Extra Progress Metrics */}
              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
                <span>
                  {task.metadata?.currentSecond !== undefined && task.metadata?.totalSeconds !== undefined
                    ? `${task.metadata.currentSecond.toFixed(1)}s / ${task.metadata.totalSeconds.toFixed(1)}s encoded`
                    : task.metadata?.isIndeterminate
                    ? 'AI Audio Analysis in flight...'
                    : 'Ongoing background render'}
                </span>
                <span className="font-mono text-zinc-400">{task.progress}%</span>
              </div>
            </div>
          )}

          {/* Completed State Check */}
          {task.status === 'completed' && (
            <div className="mt-2 flex items-center justify-between text-[10px] text-emerald-400 font-medium pt-0.5 border-t border-zinc-800/80">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ready for playback & preview
              </span>
              <span className="text-zinc-500 font-mono">100%</span>
            </div>
          )}

          {/* Error State */}
          {task.status === 'error' && (
            <div className="mt-2 text-[10px] text-red-400 font-medium pt-0.5 border-t border-zinc-800/80">
              <span>{task.errorMessage || 'An error occurred during processing'}</span>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 cursor-pointer transition-colors shrink-0"
          title="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};
