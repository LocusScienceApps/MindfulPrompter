// ============================================================
// App-wide TypeScript types
// ============================================================

/** The three usage modes */
export type AppMode = 'mindfulness' | 'pomodoro' | 'both';

/** Controls which popups show the mindfulness prompt in Both mode */
export type MindfulnessScope = 'work-only' | 'breaks' | 'work-starts' | 'all';

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
  /** M-mode only: number of prompts before session ends. 0 = run indefinitely. */
  promptCount: number;
  /** Both mode only: which popup types show the mindfulness prompt. Default: 'work-only'. */
  bothMindfulnessScope?: MindfulnessScope;

  // Global
  playSound: boolean;
  /** P and B modes only: if true, break popups fill the full break duration and cannot be dismissed early. */
  hardBreak?: boolean;
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
  /** Total sets in this session. 0 = unlimited or not applicable. */
  totalSets: number;
  /** Periods per set. 0 = unlimited or not applicable. */
  periodsPerSet: number;
  /** Per-event dismiss delay (seconds). Overrides settings.dismissSeconds when set. */
  dismissSeconds?: number;
  /** If true, popup auto-dismisses when countdown reaches 0. Used for hard breaks. */
  autoClose?: boolean;
  /** If true, don't show a popup/notification for this event (e.g., initial session start) */
  silent?: boolean;
  /** M-mode only: total number of prompts in this session. 0 or undefined = indefinite. */
  promptCountTotal?: number;
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
  | 'settings-updated'
  | 'scheduled-start'
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
