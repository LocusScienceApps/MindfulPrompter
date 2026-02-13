import type { AppMode, Settings } from './types';

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
