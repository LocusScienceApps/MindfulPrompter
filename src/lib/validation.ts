import { formatNum } from './format';

/**
 * Check if an interval divides evenly into a total.
 * Returns true if total / interval is a whole number (within tolerance).
 */
export function dividesEvenly(total: number, interval: number): boolean {
  if (interval <= 0 || total <= 0) return false;
  const ratio = total / interval;
  return Math.abs(ratio - Math.round(ratio)) < 0.0001;
}

/**
 * Get clean divisors of a total (in minutes).
 * Returns values >= 1 that divide evenly, sorted descending, capped at 10.
 * Ported from MindfulnessPrompter.bat Get-Divisors
 */
export function getDivisors(total: number): number[] {
  const divisors: number[] = [];
  const maxN = Math.floor(total);

  for (let n = 1; n <= maxN; n++) {
    const d = total / n;
    if (d < 1) continue;

    // Round to 2 decimal places
    const dRounded = Math.round(d * 100) / 100;

    // Verify the rounded value still divides cleanly
    const check = total / dRounded;
    if (Math.abs(check - Math.round(check)) >= 0.001) continue;

    // Check for duplicates
    const alreadyExists = divisors.some(
      (existing) => Math.abs(existing - dRounded) < 0.001
    );
    if (!alreadyExists) {
      divisors.push(dRounded);
    }
  }

  divisors.sort((a, b) => b - a);
  return divisors.slice(0, 10);
}

/**
 * Format a list of divisors for display.
 * [12.5, 6.25, 5, 4] → "12.5, 6.25, 5, 4"
 */
export function formatDivisorList(total: number): string {
  return getDivisors(total).map(formatNum).join(', ');
}
