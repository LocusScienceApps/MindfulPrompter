// ============================================================
// App-wide TypeScript types
// ============================================================

/** The three usage modes */
export type AppMode = 'mindfulness' | 'pomodoro' | 'both';

/** All configurable settings */
export interface Settings {
  mode: AppMode;

  // Pomodoro settings (modes: pomodoro, both)
  workMinutes: number;
  breakMinutes: number;
  sessionsPerSet: number;
  multipleSets: boolean;
  longBreakMinutes: number;
  numberOfSets: number;

  // Mindfulness settings (modes: mindfulness, both)
  promptText: string;
  promptIntervalMinutes: number;
  dismissSeconds: number;

  // Global
  playSound: boolean;
}

/** A scheduled event in the timer */
export interface TimerEvent {
  offsetSeconds: number;
  type: 'mindfulness' | 'work_start' | 'short_break' | 'long_break' | 'session_complete';
  title: string;
  body: string;
  /** The mindfulness prompt text (shown large, front-and-center). Empty if not applicable. */
  promptText: string;
  setNumber: number;
  sessionNumber: number;
  globalSessionNumber: number;
  /** If true, don't show a popup/notification for this event (e.g., initial session start) */
  silent?: boolean;
}

/** Messages sent from the Web Worker to the main thread */
export type WorkerMessage =
  | { type: 'tick'; elapsed: number }
  | { type: 'event'; event: TimerEvent };

/** Messages sent from the main thread to the Web Worker */
export type WorkerCommand =
  | { type: 'start'; schedule: TimerEvent[]; startTime: number }
  | { type: 'stop' };

/** Which screen is currently shown */
export type Screen =
  | 'mode-select'
  | 'defaults-review'
  | 'customize'
  | 'summary'
  | 'timer'
  | 'session-complete';
