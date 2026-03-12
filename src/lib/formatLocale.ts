import type { CoworkDay } from './types';

// ── Week ordering ─────────────────────────────────────────────────────────────

const DAY_KEYS: CoworkDay[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Returns the locale's first day of week as a 0-based index (0=Sun, 1=Mon). */
function localeWeekStart(): number {
  try {
    // weekInfo.firstDay: 1=Mon … 7=Sun
    const info = (new Intl.Locale(navigator.language) as any).weekInfo
      ?? (new Intl.Locale(navigator.language) as any).getWeekInfo?.();
    if (info?.firstDay !== undefined) {
      return info.firstDay === 7 ? 0 : info.firstDay; // normalize Sun=7 → 0
    }
  } catch { /* ignore */ }
  return 0; // fallback: Sunday-first
}

/** Sort days of week according to the user's locale week start. */
export function sortDays(days: CoworkDay[]): CoworkDay[] {
  const start = localeWeekStart();
  const order = [...DAY_KEYS.slice(start), ...DAY_KEYS.slice(0, start)];
  return [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

// ── Time formatting ───────────────────────────────────────────────────────────

/**
 * Detect whether the system uses 12-hour time by formatting a known 13:00 time
 * and checking if AM/PM appears. Uses undefined locale so Windows regional
 * format settings (not just display language) are respected.
 */
function locale12h(): boolean {
  try {
    const formatted = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: 'numeric' })
      .format(new Date(2000, 0, 1, 13, 0));
    return /am|pm/i.test(formatted);
  } catch { return false; }
}

/**
 * Format a "HH:MM" 24-hour string for display.
 * e.g. "16:30" → "4:30 PM" (en-US) or "16:30" (en-GB / cs-CZ)
 */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return hhmm;
  if (locale12h()) {
    const period = h < 12 ? 'AM' : 'PM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── Date formatting ───────────────────────────────────────────────────────────

/**
 * Format a "YYYY-MM-DD" date + "HH:MM" time for display. No year.
 * e.g. "2026-03-14" + "16:30" → "14 Mar at 16:30" (cs-CZ) or "Mar 14 at 4:30 PM" (en-US)
 */
export function formatDate(date: string, time: string): string {
  const d = new Date(`${date}T${time}`);
  if (isNaN(d.getTime())) return `${date} ${time}`;
  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${dateStr} at ${formatTime(time)}`;
}

/**
 * Format a timestamp (ms) for display. No year.
 * If the timestamp is today, returns "Today at 16:30".
 */
export function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `Today at ${formatTime(hhmm)}`;
  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${dateStr} at ${formatTime(hhmm)}`;
}

/**
 * Format a recurring schedule for display.
 * e.g. ['Tue', 'Mon'] + "03:00" → "Every Mon & Tue at 3:00"
 */
export function formatRecurring(days: CoworkDay[], time: string): string {
  const sorted = sortDays(days);
  const dayStr = sorted.length === 1
    ? sorted[0]
    : sorted.slice(0, -1).join(', ') + ' & ' + sorted[sorted.length - 1];
  return `Every ${dayStr} at ${formatTime(time)}`;
}
