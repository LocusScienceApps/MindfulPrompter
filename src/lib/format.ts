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
 * Format a duration in minutes for display.
 * < 1 min → "30s", 1-59 → "5m", 60+ → "1h 5m"
 * Ported from MindfulnessPrompter.bat Format-Duration
 */
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 1) {
    const secs = Math.round(totalMinutes * 60);
    return `${secs}s`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
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
