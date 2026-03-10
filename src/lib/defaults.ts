import type { Settings } from './types';
import { formatNum } from './format';

/** Factory default settings — unified, no separate modes */
export function getDefaults(): Settings {
  return {
    useTimedWork: false,
    useMindfulness: true,
    // Pomodoro defaults
    workMinutes: 25,
    breakMinutes: 5,
    sessionsPerSet: 4,
    multipleSets: false,
    longBreakMinutes: 20,
    numberOfSets: 1,
    hardBreak: false,
    // Mindfulness defaults
    promptText: 'What are you doing right now? Should you be doing it?',
    promptIntervalMinutes: 15,
    dismissSeconds: 15,
    promptCount: 0, // 0 = run indefinitely (mindfulness-only mode only)
    bothMindfulnessScope: 'work-only',
    // Global
    playSound: true,
  };
}

/**
 * Compute the derived default for break length: work / 5
 */
export function defaultBreakMinutes(workMinutes: number): number {
  return roundToSecond(workMinutes / 5);
}

/**
 * Compute the derived default for long break: 4 * short break
 */
export function defaultLongBreakMinutes(breakMinutes: number): number {
  return roundToSecond(4 * breakMinutes);
}

/**
 * Compute the derived default for prompt interval in hybrid mode: work / 2
 */
export function defaultPromptInterval(workMinutes: number): number {
  return workMinutes / 2;
}

/**
 * Round to the nearest second (expressed in minutes).
 * Prevents floating-point issues with sub-second values.
 */
function roundToSecond(minutes: number): number {
  return Math.round(minutes * 60) / 60;
}

/**
 * Auto-generate a preset name by comparing settings to factory defaults.
 * Describes the first 3 differences, e.g. "45m work, 10m break, 2 sessions".
 * Returns "Custom preset" if there are no differences.
 */
export function generatePresetName(settings: Settings): string {
  const factory = getDefaults();
  const diffs: string[] = [];

  if (settings.useTimedWork) {
    if (settings.workMinutes !== factory.workMinutes)
      diffs.push(`${formatNum(settings.workMinutes)}m work`);
    if (settings.breakMinutes !== factory.breakMinutes)
      diffs.push(`${formatNum(settings.breakMinutes)}m break`);
    if (settings.sessionsPerSet !== factory.sessionsPerSet)
      diffs.push(`${settings.sessionsPerSet} periods`);
    if (settings.multipleSets && !factory.multipleSets)
      diffs.push(`${settings.numberOfSets} sets`);
  }

  if (settings.useMindfulness) {
    if (settings.promptText !== factory.promptText)
      diffs.push('custom prompt');
    if (settings.promptIntervalMinutes !== factory.promptIntervalMinutes)
      diffs.push(`every ${formatNum(settings.promptIntervalMinutes)}m`);
    if (settings.dismissSeconds !== factory.dismissSeconds)
      diffs.push(`${settings.dismissSeconds}s delay`);
    if (!settings.useTimedWork && settings.promptCount > 0)
      diffs.push(`${settings.promptCount} prompts`);
  }

  if (!settings.useTimedWork && settings.useMindfulness)
    diffs.push('mindfulness only');
  if (settings.useTimedWork && !settings.useMindfulness)
    diffs.push('Pomodoro only');

  if (diffs.length === 0) return 'Custom preset';
  return diffs.slice(0, 3).join(', ');
}

/**
 * Auto-generate a cowork room name that describes the session type.
 * Similar in spirit to generatePresetName but tuned for rooms.
 * Examples: "Mindfulness every 15m", "25m Pomodoro", "25m Pomodoro + mindfulness"
 */
export function generateRoomName(settings: Settings): string {
  if (settings.useTimedWork && settings.useMindfulness) {
    return `${formatNum(settings.workMinutes)}m Pomodoro + mindfulness`;
  }
  if (settings.useTimedWork) {
    return `${formatNum(settings.workMinutes)}m Pomodoro`;
  }
  if (settings.useMindfulness) {
    return `Prosochai every ${formatNum(settings.promptIntervalMinutes)}m`;
  }
  return 'Session';
}
