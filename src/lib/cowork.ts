/**
 * Cowork room logic: Firebase room CRUD, recurrence computation, guest settings.
 */
import { ref, set, get, onValue, remove } from 'firebase/database';
import { db, ensureAuth } from './firebase';
import type { CoworkRoom, CoworkTimingSettings, GuestContentMode, RecurrenceRule, Settings } from './types';
import { getDefaults } from './defaults';
import { getDefaults as getStoredDefaults } from './storage';

// ── Room codes ──────────────────────────────────────────────────────────────

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // unambiguous chars (no 0/O, 1/I)

function randomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

/** Generate a 6-char code that doesn't already exist in Firebase. */
async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const snap = await get(ref(db, `rooms/${code}`));
    if (!snap.exists()) return code;
  }
  throw new Error('Could not generate a unique room code. Try again.');
}

// ── Room CRUD ───────────────────────────────────────────────────────────────

export type NewRoomInput = Omit<CoworkRoom, 'code' | 'hostUid' | 'createdAt'>;

/** Create a room in Firebase. Returns the generated room code. */
export async function createRoom(input: NewRoomInput): Promise<string> {
  const uid = await ensureAuth();
  const code = await generateUniqueCode();

  const room: CoworkRoom = {
    ...input,
    code,
    hostUid: uid,
    createdAt: Date.now(),
  };

  await set(ref(db, `rooms/${code}`), room);
  // Write host-rooms index for fast "my rooms" lookup
  await set(ref(db, `host-rooms/${uid}/${code}`), {
    createdAt: room.createdAt,
    name: room.name ?? null,
    timingSettings: room.timingSettings,
  });
  return code;
}

/** Fetch a room by code. Returns null if not found. */
export async function getRoom(code: string): Promise<CoworkRoom | null> {
  const snap = await get(ref(db, `rooms/${code}`));
  if (!snap.exists()) return null;
  return snap.val() as CoworkRoom;
}

/** Subscribe to a room in real time. Returns an unsubscribe function. */
export function subscribeToRoom(
  code: string,
  callback: (room: CoworkRoom | null) => void
): () => void {
  const roomRef = ref(db, `rooms/${code}`);
  const unsubscribe = onValue(roomRef, (snap) => {
    callback(snap.exists() ? (snap.val() as CoworkRoom) : null);
  });
  return unsubscribe;
}

/** Delete a room. Only the host (matching UID) can delete. */
export async function deleteRoom(code: string): Promise<void> {
  const uid = await ensureAuth();
  const room = await getRoom(code);
  if (!room) return;
  if (room.hostUid !== uid) throw new Error('Only the host can delete this room.');
  await remove(ref(db, `rooms/${code}`));
  // Clean host-rooms index
  await remove(ref(db, `host-rooms/${uid}/${code}`));
}

/** Get all rooms hosted by the current user (up to 5). */
export async function getHostRooms(): Promise<CoworkRoom[]> {
  const uid = await ensureAuth();
  const indexSnap = await get(ref(db, `host-rooms/${uid}`));
  if (!indexSnap.exists()) return [];

  const codes = Object.keys(indexSnap.val() as Record<string, unknown>);
  const rooms: CoworkRoom[] = [];
  for (const code of codes) {
    const room = await getRoom(code);
    if (room) rooms.push(room);
  }
  return rooms.slice(0, 5);
}

// ── Timezone helpers ────────────────────────────────────────────────────────

/**
 * Convert a calendar date + time in a given IANA timezone to a UTC ms timestamp.
 * Uses the Intl API to determine the UTC offset at approximately that time.
 */
function zonedTimeToUtcMs(
  year: number,
  month: number, // 0-indexed
  day: number,
  hour: number,
  minute: number,
  timezone: string
): number {
  // Approximate: treat the target time as UTC, then find the offset
  const approx = new Date(Date.UTC(year, month, day, hour, minute));
  // What time does the timezone show for this UTC moment?
  const tzTime = new Date(approx.toLocaleString('en-US', { timeZone: timezone }));
  const offsetMs = approx.getTime() - tzTime.getTime();
  return Date.UTC(year, month, day, hour, minute) + offsetMs;
}

/** Get the calendar date (year/month0/day/weekdayNum) in a given timezone */
function getDateInTimezone(date: Date, timezone: string): {
  year: number; month: number; day: number; weekdayNum: number;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find(p => p.type === 'year')!.value);
  const month = Number(parts.find(p => p.type === 'month')!.value) - 1; // 0-indexed
  const day = Number(parts.find(p => p.type === 'day')!.value);

  const weekdayStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, weekday: 'short',
  }).format(date); // "Mon", "Tue", ...

  const dayNameToNum: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekdayNum = dayNameToNum[weekdayStr] ?? -1;

  return { year, month, day, weekdayNum };
}

// ── Recurrence computation ──────────────────────────────────────────────────

const DAY_NAME_TO_NUM: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Find the most recent past occurrence of a recurrence rule (UTC ms). Returns null if none in 14 days. */
export function computeMostRecentOccurrence(rule: RecurrenceRule, now: number): number | null {
  const ruleDays = new Set(rule.days.map(d => DAY_NAME_TO_NUM[d]));
  const [sessionHour, sessionMinute] = rule.time.split(':').map(Number);

  for (let daysAgo = 0; daysAgo <= 14; daysAgo++) {
    const checkDate = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    const { year, month, day, weekdayNum } = getDateInTimezone(checkDate, rule.timezone);

    if (ruleDays.has(weekdayNum)) {
      const startMs = zonedTimeToUtcMs(year, month, day, sessionHour, sessionMinute, rule.timezone);
      if (startMs <= now) return startMs;
    }
  }
  return null;
}

/** Find the next future occurrence of a recurrence rule (UTC ms). Returns null if none in 14 days. */
export function computeNextOccurrence(rule: RecurrenceRule, now: number): number | null {
  const ruleDays = new Set(rule.days.map(d => DAY_NAME_TO_NUM[d]));
  const [sessionHour, sessionMinute] = rule.time.split(':').map(Number);

  for (let daysAhead = 0; daysAhead <= 14; daysAhead++) {
    const checkDate = new Date(now + daysAhead * 24 * 60 * 60 * 1000);
    const { year, month, day, weekdayNum } = getDateInTimezone(checkDate, rule.timezone);

    if (ruleDays.has(weekdayNum)) {
      const startMs = zonedTimeToUtcMs(year, month, day, sessionHour, sessionMinute, rule.timezone);
      if (startMs > now) return startMs;
    }
  }
  return null;
}

// ── Effective start time ────────────────────────────────────────────────────

export interface RoomTiming {
  startMs: number;       // UTC ms when this session started/starts
  isActive: boolean;     // true = session is currently in progress
  isFuture: boolean;     // true = session hasn't started yet
  elapsedMs: number;     // ms since session start (0 if future)
  nextStartMs?: number;  // for recurring rooms: when the next session starts
}

/** Compute the effective start time and session status for a room. */
export function computeRoomTiming(room: CoworkRoom): RoomTiming | null {
  const now = Date.now();
  const durationMs = room.timingSettings
    ? computeSessionDurationMs(room.timingSettings)
    : 0;

  if (room.startTime !== undefined) {
    const startMs = room.startTime;
    const elapsedMs = now - startMs;
    return {
      startMs,
      isActive: elapsedMs >= 0 && elapsedMs < durationMs,
      isFuture: elapsedMs < 0,
      elapsedMs: Math.max(0, elapsedMs),
    };
  }

  if (room.recurrenceRule) {
    const rule = room.recurrenceRule;
    const mostRecent = computeMostRecentOccurrence(rule, now);
    const next = computeNextOccurrence(rule, now);

    if (mostRecent !== null) {
      const elapsedMs = now - mostRecent;
      const isActive = elapsedMs < durationMs;
      return {
        startMs: mostRecent,
        isActive,
        isFuture: false,
        elapsedMs,
        nextStartMs: next ?? undefined,
      };
    }

    // No past occurrence, but there is a future one
    if (next !== null) {
      return {
        startMs: next,
        isActive: false,
        isFuture: true,
        elapsedMs: 0,
        nextStartMs: next,
      };
    }
  }

  return null;
}

/** Compute total session duration in ms from timing settings. */
export function computeSessionDurationMs(t: CoworkTimingSettings): number {
  const workMs = t.workMinutes * 60 * 1000;
  const breakMs = t.breakMinutes * 60 * 1000;
  const sessions = t.sessionsPerSet;
  const sets = t.multipleSets ? t.numberOfSets : 1;
  const longBreakMs = t.multipleSets ? t.longBreakMinutes * 60 * 1000 : 0;

  // (work * sessions + break * (sessions-1)) * sets + longBreak * (sets-1)
  const setDurationMs = workMs * sessions + breakMs * (sessions - 1);
  return setDurationMs * sets + longBreakMs * Math.max(0, sets - 1);
}

// ── Guest settings builder ──────────────────────────────────────────────────

/**
 * Build a Settings object for a guest to pass to the Timer.
 * - timing: always from the room
 * - content: based on guestMode
 */
export function buildGuestSettings(
  room: CoworkRoom,
  guestMode: GuestContentMode,
): Settings {
  const t = room.timingSettings;
  const factory = getDefaults();
  const saved = getStoredDefaults();

  const timing: Partial<Settings> = {
    useTimedWork: !room.mindfulnessOnly,
    workMinutes: t.workMinutes,
    breakMinutes: t.breakMinutes,
    sessionsPerSet: t.sessionsPerSet,
    multipleSets: t.multipleSets,
    longBreakMinutes: t.longBreakMinutes,
    numberOfSets: t.numberOfSets,
    hardBreak: t.hardBreak,
    playSound: t.playSound,
  };

  if (guestMode === 'no-prompts') {
    return { ...factory, ...timing, useMindfulness: false };
  }

  if (guestMode === 'own-prompts') {
    // Use guest's own saved prompt settings merged on top of factory defaults
    return { ...factory, ...saved, ...timing, useMindfulness: true };
  }

  // host-prompts (only available when room.sharePrompts === true)
  const p = room.promptSettings!;
  return {
    ...factory,
    ...timing,
    useMindfulness: true,
    promptText: p.promptText,
    promptIntervalMinutes: p.promptIntervalMinutes,
    dismissSeconds: p.dismissSeconds,
    promptCount: p.promptCount,
    bothMindfulnessScope: p.bothMindfulnessScope,
  };
}

/** Build the host's Settings from the room, preserving their mindfulness settings. */
export function buildHostSettings(room: CoworkRoom, currentSettings: Settings): Settings {
  const t = room.timingSettings;
  return {
    ...currentSettings,
    useTimedWork: !room.mindfulnessOnly,
    workMinutes: t.workMinutes,
    breakMinutes: t.breakMinutes,
    sessionsPerSet: t.sessionsPerSet,
    multipleSets: t.multipleSets,
    longBreakMinutes: t.longBreakMinutes,
    numberOfSets: t.numberOfSets,
    hardBreak: t.hardBreak,
  };
}
