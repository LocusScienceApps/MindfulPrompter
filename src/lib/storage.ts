import type { Settings, SettingsFile, Template, TemplateSlot, RecentSession, SoloSession } from './types';
import { isTauri } from './tauri';

const STORAGE_KEY = 'mindful-prompter-v3';
const SETTINGS_FILE = 'settings.json';

let cache: SettingsFile = { templates: {} };

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
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // v2 format detection: has defaultsP/M/B keys → wipe and start fresh (v3 migration)
    if ('defaultsP' in parsed || 'defaultsM' in parsed || 'defaultsB' in parsed) {
      return { templates: {} };
    }
    // Migrate legacy presets → templates
    const anyParsed = parsed as unknown as Record<string, unknown>;
    if (anyParsed.presets && !anyParsed.templates) {
      anyParsed.templates = anyParsed.presets;
      delete anyParsed.presets;
    }
    const file = anyParsed as unknown as SettingsFile;
    return { ...file, templates: file.templates ?? {} };
  } catch {
    // File doesn't exist yet (first launch) or read failed — start fresh
    return { templates: {} };
  }
}

function loadFromLocalStorage(): SettingsFile {
  try {
    // Check for v2 data — wipe it (v3 migration)
    const oldRaw = localStorage.getItem('mindful-prompter-v2');
    if (oldRaw) {
      localStorage.removeItem('mindful-prompter-v2');
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { templates: {} };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Migrate legacy presets → templates
    const anyParsed = parsed as unknown as Record<string, unknown>;
    if (anyParsed.presets && !anyParsed.templates) {
      anyParsed.templates = anyParsed.presets;
      delete anyParsed.presets;
    }
    const file = anyParsed as unknown as SettingsFile;
    return { ...file, templates: file.templates ?? {} };
  } catch {
    return { templates: {} };
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
    const file: SettingsFile = { ...parsed, templates: parsed.templates ?? {} };
    saveFile(file);
    return true;
  } catch {
    return false;
  }
}

// ── Defaults ───────────────────────────────────────────────────────────────────

/**
 * Load saved default overrides.
 * Returns an empty object if no custom defaults have been saved.
 */
export function getDefaults(): Partial<Settings> {
  return loadFile().defaults ?? {};
}

/**
 * Save the current settings as the new defaults.
 */
export function saveDefaults(settings: Settings): void {
  const file = loadFile();
  file.defaults = { ...settings };
  saveFile(file);
}

/**
 * Clear saved default overrides, reverting to factory defaults.
 */
export function clearDefaults(): void {
  const file = loadFile();
  delete file.defaults;
  saveFile(file);
}

// ── Templates ──────────────────────────────────────────────────────────────────

/**
 * List all occupied template slots in slot order (S1–S5).
 */
export function listTemplates(): Array<{ slot: TemplateSlot; preset: Template }> {
  const file = loadFile();
  const result: Array<{ slot: TemplateSlot; preset: Template }> = [];
  for (let i = 1; i <= 5; i++) {
    const slot = `S${i}` as TemplateSlot;
    const preset = file.templates[slot];
    if (preset) result.push({ slot, preset });
  }
  return result;
}

/**
 * Get all 5 template slots, including empty ones.
 * Used when saving a template so the user can see which slots are free.
 */
export function getTemplateSlots(): Array<{ slot: TemplateSlot; preset: Template | null }> {
  const file = loadFile();
  return Array.from({ length: 5 }, (_, i) => {
    const slot = `S${i + 1}` as TemplateSlot;
    return { slot, preset: file.templates[slot] ?? null };
  });
}

/**
 * Save a template to a slot.
 */
export function saveTemplate(slot: TemplateSlot, preset: Template): void {
  const file = loadFile();
  file.templates[slot] = preset;
  saveFile(file);
}

/**
 * Load a template from a slot. Returns null if the slot is empty.
 */
export function loadTemplate(slot: TemplateSlot): Template | null {
  const file = loadFile();
  return file.templates[slot] ?? null;
}

/**
 * Rename a template in a slot.
 */
export function renameTemplate(slot: TemplateSlot, newName: string): void {
  const file = loadFile();
  if (file.templates[slot]) {
    file.templates[slot] = { ...file.templates[slot], name: newName };
    saveFile(file);
  }
}

/**
 * Delete a template from a slot.
 */
export function deleteTemplate(slot: TemplateSlot): void {
  const file = loadFile();
  delete file.templates[slot];
  saveFile(file);
}

// ── Solo Schedules ──────────────────────────────────────────────────────────

/** Load all saved solo sessions, migrating legacy single-object format if needed. */
export function getSoloSchedules(): SoloSession[] {
  const raw = loadFile().soloSchedule;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as SoloSession[];
  // Legacy: single object — migrate with a stable ID
  const legacy = raw as Record<string, unknown>;
  return [{ ...legacy, id: 'legacy' } as SoloSession];
}

/** Add a new solo session (max 3). Returns the created session, or null if at cap. */
export function addSoloSchedule(schedule: SoloSession): SoloSession | null {
  const file = loadFile();
  const current = getSoloSchedules();
  if (current.length >= 3) return null;
  const newSession: SoloSession = { ...schedule, id: Date.now().toString() } as SoloSession;
  file.soloSchedule = [...current, newSession];
  saveFile(file);
  return newSession;
}

/** Update an existing solo session (e.g. rename). */
export function updateSoloSchedule(session: SoloSession): void {
  const file = loadFile();
  file.soloSchedule = getSoloSchedules().map((s) => s.id === session.id ? session : s);
  saveFile(file);
}

/** Delete a solo session by ID. */
export function deleteSoloSchedule(id: string): void {
  const file = loadFile();
  file.soloSchedule = getSoloSchedules().filter((s) => s.id !== id);
  saveFile(file);
}

// ── Recent Sessions ─────────────────────────────────────────────────────────

const MAX_RECENTS = 5;

export function getRecentSessions(): RecentSession[] {
  return loadFile().recentSessions ?? [];
}

export function addRecentSession(session: Omit<RecentSession, 'id'>): void {
  const file = loadFile();
  const entry: RecentSession = { ...session, id: Date.now().toString() };
  file.recentSessions = [entry, ...(file.recentSessions ?? [])].slice(0, MAX_RECENTS);
  saveFile(file);
}

export function renameRecentSession(id: string, newName: string): void {
  const file = loadFile();
  file.recentSessions = (file.recentSessions ?? []).map((s) =>
    s.id === id ? { ...s, name: newName } : s
  );
  saveFile(file);
}

export function deleteRecentSession(id: string): void {
  const file = loadFile();
  file.recentSessions = (file.recentSessions ?? []).filter((s) => s.id !== id);
  saveFile(file);
}
