import type { AppMode, Settings, SettingsFile, Preset, PresetSlot } from './types';
import { isTauri } from './tauri';

const STORAGE_KEY = 'mindful-prompter-v2';
const SETTINGS_FILE = 'settings.json';

let cache: SettingsFile = { presets: {} };

// ── Initialization ─────────────────────────────────────────────────────────────

/**
 * Load settings from disk (Tauri/AppData) or localStorage (browser).
 * Must be called once on app startup before any storage reads.
 */
export async function initStorage(): Promise<void> {
  if (isTauri()) {
    cache = await loadFromTauri();
  } else {
    cache = loadFromLocalStorage();
  }
}

async function loadFromTauri(): Promise<SettingsFile> {
  try {
    const { readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    const raw = await readTextFile(SETTINGS_FILE, { baseDir: BaseDirectory.AppData });
    const parsed = JSON.parse(raw) as SettingsFile;
    return { ...parsed, presets: parsed.presets ?? {} };
  } catch {
    // File doesn't exist yet (first launch) or read failed — start fresh
    return { presets: {} };
  }
}

function loadFromLocalStorage(): SettingsFile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { presets: {} };
    const parsed = JSON.parse(raw) as SettingsFile;
    return { ...parsed, presets: parsed.presets ?? {} };
  } catch {
    return { presets: {} };
  }
}

// ── Internal read/write ────────────────────────────────────────────────────────

function loadFile(): SettingsFile {
  return cache;
}

function saveFile(file: SettingsFile): void {
  cache = file;
  if (isTauri()) {
    void saveTauri(file);
  } else {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
    } catch {
      // localStorage unavailable (private browsing, storage full)
    }
  }
}

async function saveTauri(file: SettingsFile): Promise<void> {
  try {
    const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    await writeTextFile(SETTINGS_FILE, JSON.stringify(file, null, 2), {
      baseDir: BaseDirectory.AppData,
    });
  } catch (e) {
    console.error('[storage] Failed to save to AppData:', e);
  }
}

// ── Export / Import ────────────────────────────────────────────────────────────

/**
 * Return the full settings file as a JSON string for backup/export.
 */
export function exportSettings(): string {
  return JSON.stringify(cache, null, 2);
}

/**
 * Replace all settings from a JSON string (e.g. from an imported backup file).
 * Returns true on success, false if the JSON is invalid or malformed.
 */
export function importSettings(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as SettingsFile;
    if (typeof parsed !== 'object' || parsed === null) return false;
    const file: SettingsFile = { ...parsed, presets: parsed.presets ?? {} };
    saveFile(file);
    return true;
  } catch {
    return false;
  }
}

// ── Mode defaults ──────────────────────────────────────────────────────────────

function defaultsKey(mode: AppMode): 'defaultsP' | 'defaultsM' | 'defaultsB' {
  if (mode === 'pomodoro') return 'defaultsP';
  if (mode === 'mindfulness') return 'defaultsM';
  return 'defaultsB';
}

/**
 * Load saved default overrides for a mode.
 * Returns an empty object if no custom defaults have been saved.
 */
export function getDefaultsForMode(mode: AppMode): Partial<Settings> {
  const file = loadFile();
  return file[defaultsKey(mode)] ?? {};
}

/**
 * Save the current settings as the new defaults for their mode.
 */
export function saveDefaultsForMode(mode: AppMode, settings: Settings): void {
  const file = loadFile();
  file[defaultsKey(mode)] = { ...settings };
  saveFile(file);
}

/**
 * Clear saved default overrides for a mode, reverting to factory defaults.
 */
export function clearDefaultsForMode(mode: AppMode): void {
  const file = loadFile();
  delete file[defaultsKey(mode)];
  saveFile(file);
}

// ── Presets ────────────────────────────────────────────────────────────────────

/**
 * List all occupied preset slots for a mode, in slot order (1-5).
 */
export function listPresetsForMode(mode: AppMode): Array<{ slot: PresetSlot; preset: Preset }> {
  const file = loadFile();
  const prefix = mode === 'pomodoro' ? 'P' : mode === 'mindfulness' ? 'M' : 'B';
  const result: Array<{ slot: PresetSlot; preset: Preset }> = [];
  for (let i = 1; i <= 5; i++) {
    const slot = `${prefix}${i}` as PresetSlot;
    const preset = file.presets[slot];
    if (preset) result.push({ slot, preset });
  }
  return result;
}

/**
 * Get all 5 preset slots for a mode, including empty ones.
 * Used when saving a preset so the user can see which slots are free.
 */
export function getPresetSlots(mode: AppMode): Array<{ slot: PresetSlot; preset: Preset | null }> {
  const file = loadFile();
  const prefix = mode === 'pomodoro' ? 'P' : mode === 'mindfulness' ? 'M' : 'B';
  return Array.from({ length: 5 }, (_, i) => {
    const slot = `${prefix}${i + 1}` as PresetSlot;
    return { slot, preset: file.presets[slot] ?? null };
  });
}

/**
 * Save a preset to a slot.
 */
export function savePreset(slot: PresetSlot, preset: Preset): void {
  const file = loadFile();
  file.presets[slot] = preset;
  saveFile(file);
}

/**
 * Load a preset from a slot. Returns null if the slot is empty.
 */
export function loadPreset(slot: PresetSlot): Preset | null {
  const file = loadFile();
  return file.presets[slot] ?? null;
}

/**
 * Rename a preset in a slot.
 */
export function renamePreset(slot: PresetSlot, newName: string): void {
  const file = loadFile();
  if (file.presets[slot]) {
    file.presets[slot] = { ...file.presets[slot], name: newName };
    saveFile(file);
  }
}

/**
 * Delete a preset from a slot.
 */
export function deletePreset(slot: PresetSlot): void {
  const file = loadFile();
  delete file.presets[slot];
  saveFile(file);
}
