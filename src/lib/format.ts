/**
 * Format a number for display: removes trailing zeros from decimals.
 * 5.0 → "5", 12.50 → "12.5", 4.8 → "4.8"
 * Ported from MindfulnessPrompter.bat Format-Num
 */
export function formatNum(val: number): string {
  if (val === Math.floor(val)) return String(Math.floor(val));
  const rounded = Math.round(val * 100) / 100;
  if (rounded === Math.floor(rounded)) return String(Math.floor(rounded));
  return rounded.toString();
}

/**
 * Format a duration (in seconds) for summary displays — popup bodies and stat screens.
 *   < 60s           → "45 sec"
 *   60s – 59m 59s   → "1 min, 12 sec"  (omits ", 0 sec")
 *   60m+            → "1 hr, 40 min"   (drops seconds, rounds to nearest min)
 *
 * Do NOT use this for live countdown timers — use formatCountdown for those.
 */
export function formatSummaryTime(totalSeconds: number): string {
  const secs = Math.round(totalSeconds);
  if (secs < 60) {
    return `${secs} sec`;
  }
  if (secs < 3600) {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return remSecs > 0 ? `${mins} min, ${remSecs} sec` : `${mins} min`;
  }
  // 1 hour+: drop seconds, round to nearest minute
  const hrs = Math.floor(secs / 3600);
  const remMins = Math.round((secs % 3600) / 60);
  const hrsLabel = hrs === 1 ? 'hr' : 'hrs';
  return remMins > 0 ? `${hrs} ${hrsLabel}, ${remMins} min` : `${hrs} ${hrsLabel}`;
}

/** @deprecated Use formatSummaryTime(seconds) instead. Kept for reference. */
export function formatDuration(totalMinutes: number): string {
  return formatSummaryTime(totalMinutes * 60);
}

/**
 * Format seconds as M:SS countdown display.
 * 312 → "5:12", 65 → "1:05", 8 → "0:08"
 */
export function formatCountdown(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
