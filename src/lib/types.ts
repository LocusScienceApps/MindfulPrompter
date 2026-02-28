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

/** Preset slot key — P/M/B + slot number 1-5 */
export type PresetSlot =
  | 'P1' | 'P2' | 'P3' | 'P4' | 'P5'
  | 'M1' | 'M2' | 'M3' | 'M4' | 'M5'
  | 'B1' | 'B2' | 'B3' | 'B4' | 'B5';

/** A saved preset */
export interface Preset {
  name: string;
  mode: AppMode;
  settings: Settings;
}

/** The full persisted settings file structure */
export interface SettingsFile {
  defaultsP?: Partial<Settings>;
  defaultsM?: Partial<Settings>;
  defaultsB?: Partial<Settings>;
  presets: Partial<Record<PresetSlot, Preset>>;
}

/** Stats accumulated during a timer session */
export interface SessionStats {
  sessionsCompleted: number;
  setsCompleted: number;
  promptsCompleted: number;
  totalWorkMinutes: number;
  totalElapsedSeconds: number;
}
