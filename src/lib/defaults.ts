import type { AppMode, Settings } from './types';
import { formatNum } from './format';

/** Default settings for each mode */
export function getDefaults(mode: AppMode): Settings {
  const base = {
    mode,
    playSound: true,
    promptText: 'Are you doing what you should be doing?',
    dismissSeconds: 15,
  };

  switch (mode) {
    case 'mindfulness':
      return {
        ...base,
        // No pomodoro — use placeholder values
        workMinutes: 0,
        breakMinutes: 0,
        sessionsPerSet: 0,
        multipleSets: false,
        longBreakMinutes: 0,
        numberOfSets: 0,
        // Mindfulness defaults
        promptIntervalMinutes: 15,
        promptCount: 0, // 0 = run indefinitely
      };

    case 'pomodoro':
      return {
        ...base,
        // Pomodoro defaults
        workMinutes: 25,
        breakMinutes: 5, // 25 / 5
        sessionsPerSet: 4,
        multipleSets: false,
        longBreakMinutes: 20, // 4 * 5
        numberOfSets: 1,
        // No mindfulness — use placeholder values
        promptIntervalMinutes: 0,
        promptText: '',
        dismissSeconds: 0,
        promptCount: 0,
      };

    case 'both':
      return {
        ...base,
        // Pomodoro defaults
        workMinutes: 25,
        breakMinutes: 5,
        sessionsPerSet: 4,
        multipleSets: false,
        longBreakMinutes: 20,
        numberOfSets: 1,
        // Mindfulness defaults (interval = work / 2)
        promptIntervalMinutes: 12.5,
        promptCount: 0,
      };
  }
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
 * Compute the derived default for prompt interval: work / 2 (mode c only)
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
 * Ported from MindfulnessPrompter.bat Generate-PresetName
 */
export function generatePresetName(mode: AppMode, settings: Settings): string {
  const factory = getDefaults(mode);
  const diffs: string[] = [];

  if (mode === 'pomodoro' || mode === 'both') {
    if (settings.workMinutes !== factory.workMinutes)
      diffs.push(`${formatNum(settings.workMinutes)}m work`);
    if (settings.breakMinutes !== factory.breakMinutes)
      diffs.push(`${formatNum(settings.breakMinutes)}m break`);
    if (settings.sessionsPerSet !== factory.sessionsPerSet)
      diffs.push(`${settings.sessionsPerSet} sessions`);
    if (settings.multipleSets && !factory.multipleSets)
      diffs.push(`${settings.numberOfSets} sets`);
  }

  if (mode === 'mindfulness' || mode === 'both') {
    if (settings.promptText !== factory.promptText)
      diffs.push('custom prompt');
    if (settings.promptIntervalMinutes !== factory.promptIntervalMinutes)
      diffs.push(`every ${formatNum(settings.promptIntervalMinutes)}m`);
    if (settings.dismissSeconds !== factory.dismissSeconds)
      diffs.push(`${settings.dismissSeconds}s delay`);
    if (mode === 'mindfulness' && settings.promptCount > 0)
      diffs.push(`${settings.promptCount} prompts`);
  }

  if (diffs.length === 0) return 'Custom preset';
  return diffs.slice(0, 3).join(', ');
}
