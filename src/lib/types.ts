// ============================================================
// App-wide TypeScript types
// ============================================================

/** Controls which popups show the mindfulness prompt in hybrid sessions */
export type MindfulnessScope = 'work-only' | 'breaks' | 'work-starts' | 'all';

/** All configurable settings — unified, no separate modes */
export interface Settings {
  /** If true: run a pomodoro timer. If false: mindfulness-only (prompt interval timing only). */
  useTimedWork: boolean;
  /** If true: show mindfulness prompts. If false: timed-work only. At least one must be true. */
  useMindfulness: boolean;

  // Pomodoro settings (used when useTimedWork === true)
  workMinutes: number;
  breakMinutes: number;
  sessionsPerSet: number;
  multipleSets: boolean;
  longBreakMinutes: number;
  numberOfSets: number;

  // Mindfulness settings (used when useMindfulness === true)
  promptText: string;
  promptIntervalMinutes: number;
  dismissSeconds: number;
  /** Mindfulness-only: number of prompts before session ends. 0 = run indefinitely. */
  promptCount: number;
  /** Hybrid (timed + mindfulness): which popup types show the prompt. Default: 'work-only'. */
  bothMindfulnessScope?: MindfulnessScope;

  // Global
  playSound: boolean;
  /** When true, break popups fill the full break duration and cannot be dismissed early. */
  hardBreak?: boolean;

  // Timing preference — specific dates are never stored; always computed as today / next occurrence
  startType: 'now' | 'specific' | 'recurring';
  /** "HH:MM" 24-hour — used for startType 'specific' and 'recurring' */
  startTime?: string;
  /** Days of week — used for startType 'recurring' */
  startDays?: CoworkDay[];
  /** IANA timezone — used for startType 'recurring'; omit = user's local tz */
  startTimezone?: string;

  // Coworking preference
  isCoworking: boolean;
  /** Whether the host's mindfulness prompts are shared with guests */
  sharePrompts: boolean;

  // Guest field locking — ephemeral, never persisted or saved in presets
  /** Fields the guest cannot edit (Pomodoro + timing) when joining a cowork session */
  lockedFields?: Array<keyof Settings>;
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
  /** Mindfulness-only: total number of prompts in this session. 0 or undefined = indefinite. */
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
  | 'main'
  | 'scheduled-start'
  | 'timer'
  | 'session-complete';

// ── Cowork types ────────────────────────────────────────────────────────────

export type CoworkDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

/** How a guest wants to experience a cowork session */
export type GuestContentMode = 'no-prompts' | 'own-prompts' | 'host-prompts';

/** Recurring session schedule rule */
export interface RecurrenceRule {
  days: CoworkDay[];
  time: string;           // "HH:MM" 24-hour format
  timezone: string;       // IANA timezone, e.g. "America/New_York"
  durationMinutes: number;
}

/** Timing parameters shared to all cowork participants */
export interface CoworkTimingSettings {
  workMinutes: number;
  breakMinutes: number;
  sessionsPerSet: number;
  multipleSets: boolean;
  longBreakMinutes: number;
  numberOfSets: number;
  hardBreak: boolean;
  playSound: boolean;
}

/** A cowork room stored in Firebase */
export interface CoworkRoom {
  code: string;
  hostUid: string;
  type: 'public' | 'private';
  name?: string;
  /** Whether the host session is mindfulness-only (no timed work) */
  mindfulnessOnly?: boolean;
  /** Unix ms timestamp — for one-time sessions */
  startTime?: number;
  /** For recurring sessions */
  recurrenceRule?: RecurrenceRule;
  timingSettings: CoworkTimingSettings;
  sharePrompts: boolean;
  promptSettings?: {
    promptText: string;
    promptIntervalMinutes: number;
    dismissSeconds: number;
    promptCount: number;
    bothMindfulnessScope: MindfulnessScope;
  };
  /** Complete snapshot of host's settings at room creation time. Used to restore all host settings on load. */
  hostSettings?: Settings;
  createdAt: number;
}

/** Preset slot key — S1–S5 (unified, no mode prefix) */
export type PresetSlot = 'S1' | 'S2' | 'S3' | 'S4' | 'S5';

/** What the user was editing when they clicked "Change Settings" */
export type EditContext =
  | { type: 'preset'; slot: PresetSlot; name: string }
  | { type: 'cowork-room'; code: string; name: string };

/** A saved preset */
export interface Preset {
  name: string;
  settings: Settings;
}

/** A saved solo session schedule entry */
export type SoloSession = {
  id: string;
  name?: string;
  settings?: Settings;
} & ({
  type: 'specific';
  date: string;   // "YYYY-MM-DD"
  time: string;   // "HH:MM"
} | {
  type: 'recurring';
  days: CoworkDay[];
  time: string;   // "HH:MM"
  timezone: string;
});

/** The full persisted settings file structure */
export interface SettingsFile {
  defaults?: Partial<Settings>;
  presets: Partial<Record<PresetSlot, Preset>>;
  /** Array of saved solo sessions (max 5). Legacy: may be a single object — migrated on read. */
  soloSchedule?: SoloSession[] | Record<string, unknown>;
}

/** Stats accumulated during a timer session */
export interface SessionStats {
  sessionsCompleted: number;
  setsCompleted: number;
  promptsCompleted: number;
  totalWorkMinutes: number;
  totalElapsedSeconds: number;
}

/** Persisted cowork session for auto-rejoin on page refresh */
export interface PersistedCoworkSession {
  roomCode: string;
  role: 'host' | 'guest';
  contentMode: GuestContentMode;
  startMs: number;
}
