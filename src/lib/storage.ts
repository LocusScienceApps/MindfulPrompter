import type { Settings } from './types';

const SETTINGS_KEY = 'mindful-prompter-settings';

/**
 * Save settings to localStorage.
 */
export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // localStorage may be unavailable (private browsing, storage full)
  }
}

/**
 * Load previously saved settings from localStorage.
 * Returns null if nothing saved or parsing fails.
 */
export function loadSettings(): Settings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Settings;
  } catch {
    return null;
  }
}
