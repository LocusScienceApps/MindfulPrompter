'use client';

import { useState, useEffect, useRef } from 'react';
import { openExternal } from '@/lib/tauri';
import type { Settings, PresetSlot, CoworkRoom, GuestContentMode, CoworkDay, MindfulnessScope, SoloSession } from '@/lib/types';
import { formatTime, formatDate, formatTimestamp, formatRecurring } from '@/lib/formatLocale';
import {
  listPresets, renamePreset, deletePreset,
  getSoloSchedules, addSoloSchedule, updateSoloSchedule, deleteSoloSchedule,
  getDefaults as getStoredDefaults,
} from '@/lib/storage';
import {
  getRoom,
  deleteRoom as deleteFirebaseRoom,
  getHostRooms,
  updateRoom as updateFirebaseRoom,
  computeRoomTiming,
  computeSessionDurationMs,
} from '@/lib/cowork';
import type { NewRoomInput } from '@/lib/cowork';
import {
  getDefaults,
  generateRoomName,
  defaultBreakMinutes,
  defaultLongBreakMinutes,
  defaultPromptInterval,
} from '@/lib/defaults';
import { formatNum } from '@/lib/format';
import { dividesEvenly, formatDivisorList } from '@/lib/validation';
import Button from '../ui/Button';
import WhenSection from '../ui/WhenSection';

// ── Local UI primitives ───────────────────────────────────────────────────────

function Toggle({
  checked, onChange, disabled, title,
}: { checked: boolean; onChange: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={disabled ? undefined : onChange}
      title={title}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        checked ? 'bg-indigo-600' : 'bg-gray-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block">
      <span
        role="button"
        tabIndex={0}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="ml-1 text-gray-400 hover:text-indigo-500 transition-colors text-xs align-middle cursor-help"
        aria-label="What is this?"
      >
        ⓘ
      </span>
      {show && (
        <span className="absolute left-6 top-0 z-50 w-64 rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-600 shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

function TaglineTooltip({
  text, tooltip, wikiUrl, linkText,
}: { text: string; tooltip: React.ReactNode; wikiUrl?: string; linkText?: string }) {
  const [show, setShow] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show_ = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShow(true);
  };
  const hide_ = () => {
    hideTimer.current = setTimeout(() => setShow(false), 200);
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={show_}
      onMouseLeave={hide_}
    >
      <span
        className="underline decoration-dotted cursor-help text-gray-700 hover:text-indigo-600 transition-colors"
        onFocus={show_}
        onBlur={hide_}
        tabIndex={0}
        role="button"
      >
        {text}
      </span>
      {show && (
        <span
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-64 rounded-lg bg-gray-900 p-3 text-xs text-gray-100 shadow-lg text-left"
          onMouseEnter={show_}
          onMouseLeave={hide_}
        >
          {tooltip}{' '}
          {wikiUrl && (
            <button
              type="button"
              onClick={() => openExternal(wikiUrl)}
              className="text-indigo-300 hover:text-indigo-100 underline"
            >
              {linkText ?? 'Learn more →'}
            </button>
          )}
        </span>
      )}
    </span>
  );
}

function NumericInput({
  value, defaultValue, unit, min = 1, integerOnly = false, allowZero = false, disabled = false, onChange,
}: {
  value: number; defaultValue: number; unit: string; min?: number; integerOnly?: boolean;
  allowZero?: boolean; disabled?: boolean; onChange: (v: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));
  useEffect(() => { setRaw(String(value)); }, [value]);
  const handleBlur = () => {
    const n = integerOnly ? parseInt(raw, 10) : parseFloat(raw);
    const minVal = allowZero ? 0 : min;
    if (!isNaN(n) && n >= minVal) onChange(n);
    else setRaw(String(value));
  };
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={raw}
        min={allowZero ? 0 : min}
        step={integerOnly ? 1 : 'any'}
        disabled={disabled}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={handleBlur}
        className={`w-20 rounded-lg border-2 px-2 py-1 text-sm text-right focus:border-indigo-500 focus:outline-none ${disabled ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
      />
      {unit && <span className="text-sm text-gray-500">{unit}</span>}
      {!disabled && value !== defaultValue && (
        <button type="button" onClick={() => onChange(defaultValue)} className="text-xs text-indigo-500 hover:text-indigo-700 underline">
          reset
        </button>
      )}
    </div>
  );
}

function SettingField({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {helper && <p className="text-xs text-gray-400 leading-snug">{helper}</p>}
      <div className="pt-1">{children}</div>
    </div>
  );
}

const SCOPE_OPTIONS: { value: MindfulnessScope; label: string }[] = [
  { value: 'work-only',   label: 'At work intervals only' },
  { value: 'breaks',      label: 'Intervals + at each break' },
  { value: 'work-starts', label: 'Intervals + returning from breaks' },
  { value: 'all',         label: 'All popups' },
];

// ── Room helpers ──────────────────────────────────────────────────────────────

function getRoomSortKey(room: CoworkRoom): { group: 0 | 1 | 2; sortMs: number } {
  const timing = computeRoomTiming(room);
  if (timing?.isActive) return { group: 0, sortMs: timing.startMs };
  if (timing?.isFuture || timing?.nextStartMs) return { group: 1, sortMs: timing?.nextStartMs ?? timing?.startMs ?? 0 };
  return { group: 2, sortMs: -(timing?.startMs ?? 0) };
}

function formatRoomBadge(room: CoworkRoom): { label: string; colorClass: string } {
  const timing = computeRoomTiming(room);
  if (timing?.isActive) return { label: 'Live', colorClass: 'bg-emerald-100 text-emerald-700' };
  if (timing?.isFuture || timing?.nextStartMs) {
    const label = room.recurrenceRule
      ? formatRecurring(room.recurrenceRule.days, room.recurrenceRule.time) + ' ↻'
      : formatTimestamp(timing?.startMs ?? 0);
    return { label, colorClass: 'bg-indigo-100 text-indigo-700' };
  }
  return { label: 'Ended', colorClass: 'bg-gray-100 text-gray-500' };
}

function todayString(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface MainProps {
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
  onStart: () => void;
  onScheduledStart: (startMs: number) => void;
  onSaveAsDefault: (s: Settings) => void;
  onSavePreset: (slot: PresetSlot, name: string, s: Settings) => void;
  onLoadPreset: (s: Settings, slot?: PresetSlot, name?: string) => void;
  onLoadSession: (room: CoworkRoom) => void;
  onSaveToRoom: (s: Settings) => void;
  onHostStart: (input: NewRoomInput, startMs: number | null) => Promise<void>;
  onJoinAsHost: (room: CoworkRoom, startMs: number) => void;
  onCoworkGuestStart: (room: CoworkRoom, mode: GuestContentMode, startMs: number) => void;
  onDeleteSoloSchedule: (id: string) => void;
  onDirtyStateChange: (dirty: boolean) => void;
  loadedRoomCode: string | null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Main({
  settings,
  onSettingsChange,
  onStart,
  onScheduledStart,
  onSaveAsDefault,
  onSavePreset,
  onLoadPreset,
  onLoadSession,
  onSaveToRoom,
  onHostStart,
  onJoinAsHost,
  onCoworkGuestStart,
  onDeleteSoloSchedule,
  onDirtyStateChange,
  loadedRoomCode,
}: MainProps) {
  const [pendingSettings, setPendingSettings] = useState<Settings>(settings);

  // Sync pending when settings change externally (preset load, defaults restore, etc.)
  useEffect(() => {
    setPendingSettings(settings);
  }, [settings]);

  // `p` = the settings object currently displayed/editable (always pending)
  const p = pendingSettings;
  const updatePending = (partial: Partial<Settings>) =>
    setPendingSettings((prev) => ({ ...prev, ...partial }));

  // isDirty: pending differs from last committed settings (controls save options bar)
  const isDirty =
    JSON.stringify({ ...pendingSettings, lockedFields: undefined }) !==
      JSON.stringify({ ...settings, lockedFields: undefined });

  // Notify App whether pending differs from defaults (controls "Restore defaults" button)
  const currentDefaults: Settings = { ...getDefaults(), ...getStoredDefaults() };
  const isPendingAtDefaults =
    JSON.stringify({ ...pendingSettings, lockedFields: undefined }) ===
      JSON.stringify({ ...currentDefaults, lockedFields: undefined });

  useEffect(() => {
    onDirtyStateChange(!isPendingAtDefaults);
  }, [isPendingAtDefaults]);

  const isFieldLocked = (field: keyof Settings) =>
    settings.lockedFields?.includes(field) ?? false;

  const isGuest = !!(settings.lockedFields?.length);

  // ── Specific date (local only — never stored in Settings) ──
  const [specificDate, setSpecificDate] = useState(todayString);

  // ── Preset state ──
  const [presets, setPresets] = useState(() => listPresets());
  const [renamingSlot, setRenamingSlot] = useState<PresetSlot | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<PresetSlot | null>(null);
  const [confirmSaveAsDefault, setConfirmSaveAsDefault] = useState(false);
  const [expandPresets, setExpandPresets] = useState(false);
  const [openDropdownPreset, setOpenDropdownPreset] = useState<PresetSlot | null>(null);

  // ── Sessions state (hosted rooms + soloSchedule) ──
  const [hostedRooms, setHostedRooms] = useState<CoworkRoom[]>([]);
  const [hostedRoomsLoaded, setHostedRoomsLoaded] = useState(false);
  const [expandSessions, setExpandSessions] = useState(false);
  const [expandSolo, setExpandSolo] = useState(true);
  const [expandCowork, setExpandCowork] = useState(true);
  const [openDropdownRoom, setOpenDropdownRoom] = useState<string | null>(null);
  const [showRoomCodes, setShowRoomCodes] = useState<Record<string, boolean>>({});
  const [deletingRoom, setDeletingRoom] = useState<string | null>(null);
  const [renamingRoomCode, setRenamingRoomCode] = useState<string | null>(null);
  const [renameRoomValue, setRenameRoomValue] = useState('');
  const [copiedRoomCode, setCopiedRoomCode] = useState<string | null>(null);
  const [soloSchedules, setSoloSchedules] = useState<SoloSession[]>(() => getSoloSchedules());
  const [soloScheduleError, setSoloScheduleError] = useState('');
  const [openDropdownSolo, setOpenDropdownSolo] = useState<string | null>(null);
  const [renamingSolo, setRenamingSolo] = useState<string | null>(null);
  const [renameSoloValue, setRenameSoloValue] = useState('');
  const [deletingSolo, setDeletingSolo] = useState<string | null>(null);

  // ── Cowork / host creation ──
  const [hostRoomName, setHostRoomName] = useState('');
  const [hostGenerating, setHostGenerating] = useState(false);
  const [hostError, setHostError] = useState('');

  // ── Join panel ──
  const [expandJoin, setExpandJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinRoom, setJoinRoom] = useState<CoworkRoom | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinMode, setJoinMode] = useState<GuestContentMode>('host-prompts');
  const [joinIsHost, setJoinIsHost] = useState(false);

  // ── Preset saving (shown in edit mode) ──
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [saveSlot, setSaveSlot] = useState<PresetSlot>('S1');
  const [saveName, setSaveName] = useState('');


  // ── Validation ──
  const [intervalError, setIntervalError] = useState('');
  const [scheduleSaved, setScheduleSaved] = useState(false);

  // ── Computed defaults for edit form ──
  const modeDefaults: Settings = { ...getDefaults(), ...getStoredDefaults() };
  const derivedBreak = defaultBreakMinutes(p.workMinutes);
  const derivedLongBreak = defaultLongBreakMinutes(p.breakMinutes);
  const derivedInterval = defaultPromptInterval(p.workMinutes);

  // ── Effects ──

  useEffect(() => {
    getHostRooms()
      .then((rooms) => {
        setHostedRooms(rooms);
        setHostedRoomsLoaded(true);
        if (!hostRoomName) {
          const baseName = generateRoomName(settings);
          const dupes = rooms.filter((r) => r.name === baseName).length;
          setHostRoomName(dupes > 0 ? `${baseName} ${dupes + 1}` : baseName);
        }
      })
      .catch(() => setHostedRoomsLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (openDropdownPreset === null && openDropdownRoom === null && !openDropdownSolo) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-dropdown]')) {
        setOpenDropdownPreset(null);
        setOpenDropdownRoom(null);
        setOpenDropdownSolo(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdownPreset, openDropdownRoom, openDropdownSolo]);

  // ── Preset handlers ──

  const refreshPresets = () => setPresets(listPresets());

  const handleLoadPreset = (slot: PresetSlot) => {
    const preset = presets.find((pr) => pr.slot === slot);
    if (preset) {
      onLoadPreset(preset.preset.settings, slot, preset.preset.name);
    }
  };

  const handleSaveRename = (slot: PresetSlot) => {
    const trimmed = renameValue.trim();
    if (trimmed) { renamePreset(slot, trimmed); refreshPresets(); }
    setRenamingSlot(null);
  };

  const handleDeletePreset = (slot: PresetSlot) => {
    deletePreset(slot);
    refreshPresets();
    setConfirmDeleteSlot(null);
  };

  // ── Room handlers ──

  const handleDeleteRoom = async (code: string) => {
    try {
      await deleteFirebaseRoom(code);
      setHostedRooms((prev) => prev.filter((r) => r.code !== code));
    } catch (e) { console.error(e); }
    setDeletingRoom(null);
  };

  const handleRenameRoom = async (code: string) => {
    const trimmed = renameRoomValue.trim();
    if (trimmed) {
      try {
        await updateFirebaseRoom(code, { name: trimmed });
        setHostedRooms((prev) => prev.map((r) => r.code === code ? { ...r, name: trimmed } : r));
      } catch (e) { console.error(e); }
    }
    setRenamingRoomCode(null);
  };

  const handleRenameSolo = (id: string) => {
    const trimmed = renameSoloValue.trim();
    const session = soloSchedules.find((s) => s.id === id);
    if (session) {
      updateSoloSchedule({ ...session, name: trimmed || undefined });
      setSoloSchedules(getSoloSchedules());
    }
    setRenamingSolo(null);
  };

  // ── Join handlers ──

  const handleLoadSession = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) { setJoinError('Please enter a 6-character code.'); return; }
    setJoinLoading(true);
    setJoinError('');
    setJoinRoom(null);
    try {
      const room = await getRoom(code);
      if (!room) { setJoinError('Session not found. Check the code and try again.'); return; }
      setJoinRoom(room);
      const isHost = hostedRooms.some((r) => r.code === code);
      setJoinIsHost(isHost);
      setJoinMode(room.sharePrompts ? 'host-prompts' : 'own-prompts');
      // Load session settings into Main (shows what you're joining)
      onLoadSession(room);
    } catch {
      setJoinError('Error looking up session. Check your connection and try again.');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleJoinSession = () => {
    if (!joinRoom) return;
    const timing = computeRoomTiming(joinRoom);
    if (!timing) { setJoinError('Could not determine session timing.'); return; }
    if (joinIsHost) {
      onJoinAsHost(joinRoom, timing.startMs);
    } else {
      onCoworkGuestStart(joinRoom, joinMode, timing.startMs);
    }
  };

  // ── Schedule handler ──

  const handleSaveRecurring = () => {
    const tz = p.startTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!p.startDays?.length || !p.startTime) return;
    const result = addSoloSchedule({ id: '', type: 'recurring', days: p.startDays, time: p.startTime, timezone: tz, settings: p });
    if (!result) { setSoloScheduleError('You already have 5 solo sessions. Delete one first.'); return; }
    setSoloSchedules(getSoloSchedules());
    setSoloScheduleError('');
    setScheduleSaved(true);
    setTimeout(() => setScheduleSaved(false), 3000);
  };

  // ── Host new session ──

  const handleCreateAndHost = async () => {
    if (hostedRooms.length >= 5) {
      setHostError('You already have 5 sessions. Delete one first.');
      return;
    }
    setHostGenerating(true);
    setHostError('');
    try {
      const timingSettings = {
        workMinutes: p.workMinutes,
        breakMinutes: p.breakMinutes,
        sessionsPerSet: p.sessionsPerSet,
        multipleSets: p.multipleSets,
        longBreakMinutes: p.longBreakMinutes,
        numberOfSets: p.numberOfSets,
        hardBreak: p.hardBreak ?? false,
        playSound: p.playSound,
      };
      const shareP = p.useMindfulness ? p.sharePrompts : false;
      const promptSettings = shareP
        ? {
            promptText: p.promptText,
            promptIntervalMinutes: p.promptIntervalMinutes,
            dismissSeconds: p.dismissSeconds,
            promptCount: p.promptCount,
            bothMindfulnessScope: p.bothMindfulnessScope ?? 'work-only' as const,
          }
        : undefined;

      let startMs: number | null = null;
      let input: NewRoomInput;

      if (p.startType === 'recurring' && p.startDays?.length && p.startTime) {
        const tz = p.startTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
        const durationMinutes = computeSessionDurationMs(timingSettings) / 60000;
        input = {
          type: 'public',
          name: hostRoomName.trim() || generateRoomName(p),
          mindfulnessOnly: !p.useTimedWork,
          timingSettings,
          sharePrompts: shareP,
          promptSettings,
          hostSettings: p,
          recurrenceRule: { days: p.startDays, time: p.startTime, timezone: tz, durationMinutes },
        };
      } else {
        if (p.startType === 'specific' && specificDate && p.startTime) {
          const ms = new Date(`${specificDate}T${p.startTime}`).getTime();
          if (!isNaN(ms)) startMs = ms;
        }
        input = {
          type: 'public',
          name: hostRoomName.trim() || generateRoomName(p),
          mindfulnessOnly: !p.useTimedWork,
          timingSettings,
          sharePrompts: shareP,
          promptSettings,
          hostSettings: p,
          startTime: startMs ?? Date.now(),
        };
      }

      await onHostStart(input, startMs);
    } catch (e) {
      setHostError(String(e));
    } finally {
      setHostGenerating(false);
    }
  };

  // ── Main action button ──

  const handleMainAction = async () => {
    setIntervalError('');
    if (p.useMindfulness && p.useTimedWork) {
      if (!dividesEvenly(p.workMinutes, p.promptIntervalMinutes)) {
        setIntervalError(
          `Prosochai interval (${p.promptIntervalMinutes} min) doesn't fit into work period (${p.workMinutes} min). Try: ${formatDivisorList(p.workMinutes)}`
        );
        return;
      }
    }

    // Validate specific-time scheduling before doing anything
    if (p.startType === 'specific') {
      const ms = new Date(`${specificDate}T${p.startTime ?? ''}`).getTime();
      if (!p.startTime || isNaN(ms)) {
        setIntervalError('Please enter a start time before scheduling.');
        return;
      }
    }

    // Commit pending settings before acting
    onSettingsChange(p);
    setShowSavePreset(false);

    if (p.isCoworking && !loadedRoomCode) {
      await handleCreateAndHost();
    } else if (p.startType === 'now') {
      onStart();
    } else if (p.startType === 'specific') {
      const ms = new Date(`${specificDate}T${p.startTime ?? ''}`).getTime();
      const result = addSoloSchedule({ id: '', type: 'specific', date: specificDate, time: p.startTime ?? '', settings: p });
      if (!result) { setSoloScheduleError('You already have 5 solo sessions. Delete one first.'); return; }
      setSoloSchedules(getSoloSchedules());
      setSoloScheduleError('');
      onScheduledStart(ms);
    } else {
      // recurring
      handleSaveRecurring();
    }
  };

  const actionLabel = (() => {
    if (p.isCoworking && !loadedRoomCode) {
      if (p.startType === 'now') return 'Host Session Now';
      return 'Schedule Cowork Session';
    }
    if (p.startType === 'now') return 'Start Session Now';
    if (p.startType === 'specific') return 'Start Countdown';
    return 'Save Schedule';
  })();

  // ── Save option handlers ──

  const handleSaveAsDefault = () => {
    onSaveAsDefault(pendingSettings);
    setShowSavePreset(false);
  };

  const handleSavePresetAction = () => {
    const name = saveName.trim();
    if (!name) return;
    onSavePreset(saveSlot, name, pendingSettings);
    refreshPresets();
    setShowSavePreset(false);
    setSaveName('');
  };

  const handleSaveToRoom = async () => {
    await onSaveToRoom(pendingSettings);
  };

  const handleApply = () => {
    onSettingsChange(pendingSettings);
    setShowSavePreset(false);
  };

  // ── Rooms sorted / filtered ──

  const sortedRooms = [...hostedRooms]
    .sort((a, b) => {
      const ka = getRoomSortKey(a);
      const kb = getRoomSortKey(b);
      if (ka.group !== kb.group) return ka.group - kb.group;
      return ka.sortMs - kb.sortMs;
    });

  const hasActiveSessions = sortedRooms.length > 0 || soloSchedules.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Hero header ── */}
      <div className="text-center space-y-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.png" alt="Prosochai" className="mx-auto h-16 w-auto" />
        <h1 className="text-3xl font-bold text-gray-900">Prosochai</h1>
        <p className="text-base font-medium text-gray-800">
          <TaglineTooltip
            text="Mindfulness Prompts"
            tooltip={<>We call these <em>Prosochai</em> (pro-so-KAI) — the plural of <em>prosoche</em>, the ancient Stoic practice of self-attention: brief, scheduled interruptions to check whether what you&apos;re doing is what you mean to be doing.</>}
          />{' '}
          and{' '}
          <TaglineTooltip
            text="Pomodoros"
            tooltip="The Pomodoro Technique breaks work into focused intervals (typically 25 minutes) followed by short breaks. It helps maintain focus and avoid burnout."
          />{' '}
          with{' '}
          <TaglineTooltip
            text="behavioral nudges"
            tooltip="Nudge theory uses small prompts and reminders to guide behavior without forcing change. Prosochai are a form of behavioral nudge."
          />
          , alone or with others
        </p>
        {isGuest && (
          <p className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1 inline-block">
            Guest mode — Pomodoro &amp; timing set by host
          </p>
        )}
        {loadedRoomCode && !isGuest && (
          <p className="text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg px-3 py-1 inline-block">
            Session loaded: {loadedRoomCode}
          </p>
        )}
      </div>

      {/* ── Sound card ── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4">
          <Toggle
            checked={p.playSound}
            onChange={() => updatePending({ playSound: !p.playSound })}
          />
          <span className="text-xl shrink-0">{p.playSound ? '🔊' : '🔇'}</span>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900">Sound</div>
            <div className="text-xs text-gray-500">Audio cues for timers.</div>
          </div>
        </div>
      </div>

      {/* ── Settings ── */}
      <div className="space-y-5">

        {/* ── Pomodoro edit section ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 px-5 py-4">
              <Toggle
                checked={p.useTimedWork}
                onChange={() => {
                  if (!p.useTimedWork && !p.useMindfulness) return;
                  if (isFieldLocked('useTimedWork')) return;
                  if (p.useTimedWork) {
                    // Turning OFF — restore standalone interval
                    const stored = getStoredDefaults();
                    let interval = 15;
                    if (
                      typeof stored.promptIntervalMinutes === 'number' &&
                      stored.promptIntervalMinutes > 0 &&
                      dividesEvenly(60, stored.promptIntervalMinutes)
                    ) {
                      interval = stored.promptIntervalMinutes;
                    }
                    updatePending({
                      useTimedWork: false,
                      ...(p.useMindfulness ? { promptIntervalMinutes: interval, promptCount: 0 } : {}),
                    });
                  } else {
                    // Turning ON
                    updatePending({
                      useTimedWork: true,
                      ...(p.useMindfulness ? { promptIntervalMinutes: derivedInterval } : {}),
                    });
                  }
                }}
                disabled={isFieldLocked('useTimedWork') || (!p.useMindfulness && p.useTimedWork)}
                title={!p.useMindfulness ? 'Prosochai must be on if Pomodoros are off' : undefined}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/tomato.png" alt="" className="h-8 w-auto shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-gray-900">Pomodoros</div>
                <div className="text-xs text-gray-500">Focused work periods with scheduled breaks.</div>
              </div>
            </div>
            {p.useTimedWork && (
              <div className="border-t border-gray-100 px-5 pb-4 pt-3 space-y-5">
                <SettingField label="Work period" helper={`Default: ${formatNum(modeDefaults.workMinutes)} minutes`}>
                  <NumericInput
                    value={p.workMinutes}
                    defaultValue={modeDefaults.workMinutes}
                    unit="minutes"
                    min={0.015}
                    disabled={isFieldLocked('workMinutes')}
                    onChange={(v) => updatePending({
                      workMinutes: v,
                      breakMinutes: defaultBreakMinutes(v),
                      longBreakMinutes: defaultLongBreakMinutes(defaultBreakMinutes(v)),
                      ...(p.useMindfulness ? { promptIntervalMinutes: defaultPromptInterval(v) } : {}),
                    })}
                  />
                </SettingField>
                <SettingField label="Break" helper={`Default: ${formatNum(derivedBreak)} minutes`}>
                  <NumericInput
                    value={p.breakMinutes}
                    defaultValue={derivedBreak}
                    unit="minutes"
                    min={0.015}
                    disabled={isFieldLocked('breakMinutes')}
                    onChange={(v) => updatePending({ breakMinutes: v, longBreakMinutes: defaultLongBreakMinutes(v) })}
                  />
                </SettingField>
                <SettingField label="Work periods per set" helper={`Default: ${modeDefaults.sessionsPerSet}. Enter 0 for unlimited.`}>
                  <NumericInput
                    value={p.sessionsPerSet}
                    defaultValue={modeDefaults.sessionsPerSet}
                    unit="periods"
                    integerOnly
                    allowZero
                    disabled={isFieldLocked('sessionsPerSet')}
                    onChange={(v) => updatePending({ sessionsPerSet: v, ...(v === 0 ? { multipleSets: false } : {}) })}
                  />
                </SettingField>
                {p.sessionsPerSet !== 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Multiple sets with long break?</span>
                    <Toggle
                      checked={p.multipleSets}
                      disabled={isFieldLocked('multipleSets')}
                      onChange={() => updatePending({ multipleSets: !p.multipleSets, numberOfSets: !p.multipleSets ? Math.max(p.numberOfSets, 3) : 1 })}
                    />
                  </div>
                )}
                {p.multipleSets && p.sessionsPerSet !== 0 && (
                  <>
                    <SettingField label="Long break between sets" helper={`Default: ${formatNum(derivedLongBreak)} minutes`}>
                      <NumericInput
                        value={p.longBreakMinutes}
                        defaultValue={derivedLongBreak}
                        unit="minutes"
                        min={0.015}
                        disabled={isFieldLocked('longBreakMinutes')}
                        onChange={(v) => updatePending({ longBreakMinutes: v })}
                      />
                    </SettingField>
                    <SettingField label="Number of sets" helper="Default: 3. Enter 0 for unlimited.">
                      <NumericInput
                        value={p.numberOfSets}
                        defaultValue={3}
                        unit="sets"
                        integerOnly
                        allowZero
                        disabled={isFieldLocked('numberOfSets')}
                        onChange={(v) => updatePending({ numberOfSets: v })}
                      />
                    </SettingField>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Lock screen during breaks?</span>
                  <Toggle
                    checked={p.hardBreak ?? false}
                    disabled={isFieldLocked('hardBreak')}
                    onChange={() => updatePending({ hardBreak: !p.hardBreak })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Prosochai edit section ── */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 px-5 py-4">
              <Toggle
                checked={p.useMindfulness}
                onChange={() => {
                  if (!p.useMindfulness && !p.useTimedWork) return;
                  updatePending({ useMindfulness: !p.useMindfulness });
                }}
                disabled={!p.useTimedWork && p.useMindfulness}
                title={!p.useTimedWork ? 'Pomodoros must be on if Prosochai is off' : undefined}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/bowl.png" alt="" className="h-8 w-auto shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-gray-900">Prosochai</div>
                <div className="text-xs text-gray-500">Timed pop-up reminders that make you stop and reflect.</div>
              </div>
            </div>
            {p.useMindfulness && (
              <div className="border-t border-gray-100 px-5 pb-4 pt-3 space-y-5">
                <SettingField label="Prosochai text" helper={`Default: "${modeDefaults.promptText}"`}>
                  <textarea
                    value={p.promptText}
                    onChange={(e) => updatePending({ promptText: e.target.value || modeDefaults.promptText })}
                    placeholder={modeDefaults.promptText}
                    rows={3}
                    className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none"
                  />
                </SettingField>
                <SettingField
                  label="Prompt frequency"
                  helper={p.useTimedWork
                    ? `Must fit evenly into your ${formatNum(p.workMinutes)}-minute work period. Default: ${formatNum(derivedInterval)} minutes.`
                    : `Must divide evenly into 60 minutes.`}
                >
                  <NumericInput
                    value={p.promptIntervalMinutes}
                    defaultValue={p.useTimedWork ? derivedInterval : modeDefaults.promptIntervalMinutes}
                    unit="minutes"
                    min={0.015}
                    onChange={(v) => updatePending({ promptIntervalMinutes: v })}
                  />
                </SettingField>
                <SettingField label="Dismiss delay" helper={`How long the popup stays before you can dismiss it.`}>
                  <NumericInput
                    value={p.dismissSeconds}
                    defaultValue={modeDefaults.dismissSeconds}
                    unit="seconds"
                    integerOnly
                    min={0}
                    allowZero
                    onChange={(v) => updatePending({ dismissSeconds: v })}
                  />
                </SettingField>
                {!p.useTimedWork && (
                  <SettingField label="Number of prompts" helper="Enter 0 to run indefinitely.">
                    <NumericInput
                      value={p.promptCount}
                      defaultValue={modeDefaults.promptCount}
                      unit="prompts"
                      integerOnly
                      allowZero
                      onChange={(v) => updatePending({ promptCount: v })}
                    />
                  </SettingField>
                )}
                {p.useTimedWork && (
                  <SettingField label="Which popups show Prosochai?">
                    <div className="space-y-2">
                      {SCOPE_OPTIONS.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="bothScope"
                            value={opt.value}
                            checked={(p.bothMindfulnessScope ?? 'work-only') === opt.value}
                            onChange={() => updatePending({ bothMindfulnessScope: opt.value })}
                            className="text-indigo-600"
                          />
                          <span className="text-sm text-gray-700">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </SettingField>
                )}
              </div>
            )}
          </div>

      </div>

      {/* ── Timing section ── */}
      <WhenSection
          startType={isFieldLocked('startType') ? settings.startType : p.startType}
          onStartTypeChange={(t) => { if (!isFieldLocked('startType')) updatePending({ startType: t }); }}
          specificDate={specificDate}
          specificTime={isFieldLocked('startTime') ? (settings.startTime ?? '') : (p.startTime ?? '')}
          onSpecificDateChange={setSpecificDate}
          onSpecificTimeChange={(v) => { if (!isFieldLocked('startTime')) { updatePending({ startTime: v }); setIntervalError(''); } }}
          recurringDays={isFieldLocked('startDays') ? (settings.startDays ?? []) : (p.startDays ?? [])}
          recurringTime={isFieldLocked('startTime') ? (settings.startTime ?? '') : (p.startTime ?? '')}
          onRecurringDaysChange={(days) => { if (!isFieldLocked('startDays')) updatePending({ startDays: days }); }}
          onRecurringTimeChange={(v) => { if (!isFieldLocked('startTime')) updatePending({ startTime: v }); }}
          hostCowork={p.isCoworking}
          onStartNow={() => {}}
          onSchedule={() => {}}
          onSaveRecurring={() => {}}
          showActions={false}
          heading={isFieldLocked('startType') ? 'When (set by host)' : 'When should this session start?'}
        />

      {/* ── Coworking section ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <Toggle
            checked={p.isCoworking}
            disabled={isFieldLocked('isCoworking')}
            onChange={() => {
              if (isFieldLocked('isCoworking')) return;
              updatePending({ isCoworking: !p.isCoworking });
            }}
          />
          <span className="text-sm font-medium text-gray-700">
            Make this a{' '}
            <TaglineTooltip
              text="Coworking Session"
              tooltip="Start a shared session that others can join using a room code. Everyone syncs to your timer — and optionally your Prosochai."
            />
          </span>
          {isFieldLocked('isCoworking') && (
            <span className="text-xs text-gray-400 italic">(set by host)</span>
          )}
        </div>

        {p.isCoworking && !isFieldLocked('isCoworking') && (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session name</label>
              <input
                type="text"
                value={hostRoomName}
                onChange={(e) => setHostRoomName(e.target.value)}
                placeholder={generateRoomName(settings)}
                className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            {p.useMindfulness && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={p.sharePrompts}
                  onChange={() => updatePending({ sharePrompts: !p.sharePrompts })}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Share my Prosochai with guests</span>
              </label>
            )}
          </div>
        )}

        {isGuest && (
          <p className="text-xs text-gray-500 italic">You&apos;re joining as a guest — Pomodoro &amp; timing settings are set by the host.</p>
        )}
      </div>

      {/* ── Scheduled & Active Sessions ── */}
      {hostedRoomsLoaded && hasActiveSessions && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <button
            type="button"
            onClick={() => setExpandSessions((v) => !v)}
            className="w-full flex items-center justify-between text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
          >
            <span>{expandSessions ? '−' : '+'} Scheduled &amp; active sessions ({sortedRooms.length + soloSchedules.length})</span>
          </button>
          {expandSessions && (
            <div className="mt-3 space-y-3">

              {/* ── Solo subsection ── */}
              {soloSchedules.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandSolo((v) => !v)}
                    className="w-full flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors mb-2"
                  >
                    {expandSolo ? '−' : '+'} Solo
                  </button>
                  {expandSolo && (
                    <div className="space-y-2">
                      {soloScheduleError && (
                        <p className="text-xs text-red-600">{soloScheduleError}</p>
                      )}
                      {soloSchedules.map((soloSchedule) => (
                        <div key={soloSchedule.id} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 space-y-2">
                          {renamingSolo === soloSchedule.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={renameSoloValue}
                                onChange={(e) => setRenameSoloValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSolo(soloSchedule.id); if (e.key === 'Escape') setRenamingSolo(null); }}
                                autoFocus
                                className="flex-1 rounded border border-emerald-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                              />
                              <button onClick={() => handleRenameSolo(soloSchedule.id)} className="text-xs font-medium text-emerald-600 hover:text-emerald-800">Save</button>
                              <button onClick={() => setRenamingSolo(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 bg-indigo-100 text-indigo-700 cursor-pointer hover:bg-indigo-200"
                                onClick={() => {
                                  const base = soloSchedule.settings ?? modeDefaults;
                                  const updates: Partial<Settings> = {
                                    isCoworking: false,
                                    startType: soloSchedule.type,
                                    startTime: soloSchedule.time,
                                    ...(soloSchedule.type === 'recurring' ? {
                                      startDays: soloSchedule.days,
                                      startTimezone: soloSchedule.timezone,
                                    } : {}),
                                  };
                                  onSettingsChange({ ...base, ...updates });
                                  if (soloSchedule.type === 'specific') setSpecificDate(soloSchedule.date);
                                }}
                              >
                                {soloSchedule.type === 'specific'
                                  ? formatDate(soloSchedule.date, soloSchedule.time)
                                  : formatRecurring(soloSchedule.days, soloSchedule.time) + ' ↻'}
                              </span>
                              {soloSchedule.name && (
                                <span className="flex-1 text-sm font-semibold text-indigo-600 min-w-0 truncate">
                                  {soloSchedule.name}
                                </span>
                              )}
                              <div className="relative" data-dropdown>
                                <button
                                  onClick={() => setOpenDropdownSolo(openDropdownSolo === soloSchedule.id ? null : soloSchedule.id)}
                                  className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-1 bg-white hover:bg-gray-50"
                                >
                                  Options ▾
                                </button>
                                {openDropdownSolo === soloSchedule.id && (
                                  <div className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                                    <button
                                      onClick={() => { setOpenDropdownSolo(null); setRenameSoloValue(soloSchedule.name ?? (soloSchedule.type === 'specific' ? formatDate(soloSchedule.date, soloSchedule.time) : formatRecurring(soloSchedule.days, soloSchedule.time))); setRenamingSolo(soloSchedule.id); }}
                                      className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                                    >
                                      Rename
                                    </button>
                                    <button
                                      onClick={() => { setOpenDropdownSolo(null); setDeletingSolo(soloSchedule.id); }}
                                      className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {deletingSolo === soloSchedule.id && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex items-center justify-between gap-3">
                              <p className="text-xs text-red-800">Delete this schedule permanently?</p>
                              <div className="flex gap-2 shrink-0">
                                <button onClick={() => setDeletingSolo(null)} className="text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
                                <button onClick={() => { onDeleteSoloSchedule(soloSchedule.id); deleteSoloSchedule(soloSchedule.id); setSoloSchedules(getSoloSchedules()); setDeletingSolo(null); }} className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">Confirm</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Coworking Sessions subsection ── */}
              {sortedRooms.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandCowork((v) => !v)}
                    className="w-full flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors mb-2"
                  >
                    {expandCowork ? '−' : '+'} Coworking
                  </button>
                  {expandCowork && (
                    <div className="space-y-2">
                      {sortedRooms.map((room) => {
                        const timing = computeRoomTiming(room);
                        const badge = formatRoomBadge(room);
                        const isActive = timing?.isActive ?? false;
                        const now = Date.now();
                        const FIVE_MIN_MS = 5 * 60 * 1000;
                        const futureStartMs = timing?.nextStartMs ?? timing?.startMs ?? 0;
                        const isSoon = !isActive && (timing?.isFuture || !!timing?.nextStartMs) && (futureStartMs - now <= FIVE_MIN_MS);
                        const joinable = isActive || isSoon;
                        const joinStartMs = isActive ? (timing?.startMs ?? Date.now()) : futureStartMs;
                        const joinTooltip = !joinable ? 'You can join 5 minutes before it starts' : undefined;

                        return (
                          <div key={room.code} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 space-y-2">
                            {renamingRoomCode === room.code ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={renameRoomValue}
                                  onChange={(e) => setRenameRoomValue(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleRenameRoom(room.code); if (e.key === 'Escape') setRenamingRoomCode(null); }}
                                  autoFocus
                                  className="flex-1 rounded border border-emerald-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                                />
                                <button onClick={() => handleRenameRoom(room.code)} className="text-xs font-medium text-emerald-600 hover:text-emerald-800">Save</button>
                                <button onClick={() => setRenamingRoomCode(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${badge.colorClass}`}>{badge.label}</span>
                                <span
                                  className="flex-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer min-w-0"
                                  onClick={() => {
                                    onLoadSession(room);
                                    setExpandSessions(true);
                                    if (!room.recurrenceRule && timing?.startMs) {
                                      const d = new Date(timing.startMs);
                                      setSpecificDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                                    }
                                  }}
                                >
                                  {room.name ?? room.code}
                                </span>
                                <div className="relative" data-dropdown>
                                  <button
                                    onClick={() => setOpenDropdownRoom(openDropdownRoom === room.code ? null : room.code)}
                                    className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-1 bg-white hover:bg-gray-50"
                                  >
                                    Options ▾
                                  </button>
                                  {openDropdownRoom === room.code && (
                                    <div className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                                      <button
                                        onClick={() => { setOpenDropdownRoom(null); setRenamingRoomCode(room.code); setRenameRoomValue(room.name ?? ''); }}
                                        className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                                      >
                                        Rename
                                      </button>
                                      <button
                                        onClick={() => { setOpenDropdownRoom(null); setShowRoomCodes((prev) => ({ ...prev, [room.code]: !prev[room.code] })); }}
                                        className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                                      >
                                        {showRoomCodes[room.code] ? 'Hide code' : 'Show code'}
                                      </button>
                                      <button
                                        onClick={() => { setOpenDropdownRoom(null); setDeletingRoom(room.code); }}
                                        className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {deletingRoom === room.code && (
                              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex items-center justify-between gap-3">
                                <p className="text-xs text-red-800">Delete this session permanently?</p>
                                <div className="flex gap-2 shrink-0">
                                  <button onClick={() => setDeletingRoom(null)} className="text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
                                  <button onClick={() => handleDeleteRoom(room.code)} className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">Confirm</button>
                                </div>
                              </div>
                            )}
                            {showRoomCodes[room.code] && (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-lg font-bold tracking-widest text-emerald-700">{room.code}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(room.code);
                                    setCopiedRoomCode(room.code);
                                    setTimeout(() => setCopiedRoomCode(null), 2000);
                                  }}
                                  className="text-xs text-gray-400 hover:text-emerald-600"
                                >
                                  {copiedRoomCode === room.code ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* ── Saved Presets ── */}
      {presets.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <button
            type="button"
            onClick={() => setExpandPresets((v) => !v)}
            className="w-full flex items-center justify-between text-sm font-semibold text-indigo-700 hover:text-indigo-900 transition-colors"
          >
            <span>{expandPresets ? '−' : '+'} Saved presets ({presets.length})</span>
          </button>
          {expandPresets && (
            <div className="mt-3 space-y-2">
              {presets.map(({ slot, preset }) => (
                <div key={slot} className="rounded-lg border border-indigo-200 bg-white px-3 py-2 space-y-2">
                  {renamingSlot === slot ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(slot); if (e.key === 'Escape') setRenamingSlot(null); }}
                        autoFocus
                        className="flex-1 rounded border border-indigo-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                      <button onClick={() => handleSaveRename(slot)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Save</button>
                      <button onClick={() => setRenamingSlot(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { handleLoadPreset(slot); onStart(); }}
                        className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
                      >
                        Start
                      </button>
                      <span
                        className="flex-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        onClick={() => handleLoadPreset(slot)}
                      >
                        {slot} — {preset.name}
                      </span>
                      <div className="relative" data-dropdown>
                        <button
                          onClick={() => setOpenDropdownPreset(openDropdownPreset === slot ? null : slot)}
                          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-1 bg-white hover:bg-gray-50"
                        >
                          Options ▾
                        </button>
                        {openDropdownPreset === slot && (
                          <div className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                            <button
                              onClick={() => { setOpenDropdownPreset(null); setRenamingSlot(slot); setRenameValue(preset.name); setConfirmDeleteSlot(null); }}
                              className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => { setOpenDropdownPreset(null); setConfirmDeleteSlot(slot); setRenamingSlot(null); }}
                              className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {confirmDeleteSlot === slot && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex items-center justify-between gap-3">
                      <p className="text-xs text-red-800">Delete this preset? Cannot be undone.</p>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setConfirmDeleteSlot(null)} className="text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button onClick={() => handleDeletePreset(slot)} className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Save options ── */}
      {isDirty && (
        <div className="rounded-2xl border border-indigo-300 bg-indigo-50 p-4 space-y-3">
          {confirmSaveAsDefault ? (
            <>
              <p className="text-sm font-semibold text-gray-900">Replace your saved defaults?</p>
              <p className="text-xs text-gray-600">This will overwrite your current default settings. You can always change them again later.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmSaveAsDefault(false)}
                  className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirmSaveAsDefault(false); handleSaveAsDefault(); }}
                  className="rounded-lg border-2 border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:border-red-500 transition-colors"
                >
                  Yes, replace defaults
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-indigo-800">Save changes?</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleApply}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  For next session
                </button>
                <button
                  onClick={() => setShowSavePreset((v) => !v)}
                  className="rounded-lg border-2 border-indigo-300 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:border-indigo-500 transition-colors"
                >
                  As preset…
                </button>
                {loadedRoomCode && (
                  <button
                    onClick={handleSaveToRoom}
                    className="rounded-lg border-2 border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-500 transition-colors"
                  >
                    Save to session
                  </button>
                )}
                <button
                  onClick={() => setConfirmSaveAsDefault(true)}
                  className="rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:border-gray-400 transition-colors"
                >
                  As default
                </button>
              </div>
            </>
          )}
          {showSavePreset && (
            <div className="flex gap-2 items-center flex-wrap pt-1">
              <select
                value={saveSlot}
                onChange={(e) => setSaveSlot(e.target.value as PresetSlot)}
                className="rounded-lg border-2 border-indigo-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {(['S1', 'S2', 'S3', 'S4', 'S5'] as PresetSlot[]).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSavePresetAction(); }}
                placeholder="Preset name"
                className="flex-1 min-w-32 rounded-lg border-2 border-indigo-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={handleSavePresetAction}
                disabled={!saveName.trim()}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}


      {/* ── Main action button ── */}
      <Button onClick={handleMainAction} disabled={hostGenerating} className="w-full text-base">
        {hostGenerating ? 'Creating session…' : actionLabel}
      </Button>

      {intervalError && (
        <p className="text-sm text-red-600 text-center">{intervalError}</p>
      )}

      {scheduleSaved && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 text-center">
          Schedule saved! You&rsquo;ll be notified when your session is about to start.
        </p>
      )}

      {hostError && (
        <p className="text-sm text-red-600 text-center">{hostError}</p>
      )}

      {/* ── Join a Coworking Session ── */}
      <div className="border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={() => setExpandJoin((v) => !v)}
          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 hover:border-indigo-300 transition-colors text-left"
        >
          Join a{' '}
          <TaglineTooltip
            text="Coworking Session"
            tooltip="Sync to a shared session hosted by someone else. Enter their session code to join their timer in real time."
          />
          {' '}{expandJoin ? '▲' : '▼'}
        </button>

        {expandJoin && (
          <div className="mt-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLoadSession(); }}
                placeholder="ABCXYZ"
                maxLength={6}
                className="flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 font-mono text-lg uppercase tracking-widest focus:border-indigo-500 focus:outline-none"
              />
              <Button onClick={handleLoadSession} disabled={joinLoading}>
                {joinLoading ? '…' : 'Load Session'}
              </Button>
            </div>
            {joinError && <p className="text-sm text-red-600">{joinError}</p>}

            {joinRoom && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Session details</p>
                  <dl className="space-y-1.5">
                    <SettingRow label="Session" value={joinRoom.name ?? joinRoom.code} />
                    <SettingRow label="Work period" value={`${joinRoom.timingSettings.workMinutes} min`} />
                    <SettingRow label="Break" value={`${joinRoom.timingSettings.breakMinutes} min`} />
                    <SettingRow label="Prosochai" value={joinRoom.sharePrompts ? 'Shared by host' : 'Not shared'} />
                  </dl>
                  <p className="mt-3 text-xs text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">
                    Settings have been loaded above — you can review them before joining.
                  </p>
                </div>

                {joinIsHost ? (
                  <div className="space-y-3">
                    <p className="text-sm text-emerald-700 font-medium bg-emerald-50 rounded-lg px-3 py-2">
                      This is your session — you&rsquo;ll join as the host.
                    </p>
                    <Button onClick={handleJoinSession} className="w-full">
                      Join as Host
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Your Prosochai:</p>
                    {joinRoom.sharePrompts && (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="radio" name="joinMode" value="host-prompts" checked={joinMode === 'host-prompts'} onChange={() => setJoinMode('host-prompts')} className="text-indigo-600" />
                        <span className="text-sm text-gray-700">Use host&rsquo;s Prosochai</span>
                      </label>
                    )}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="joinMode" value="own-prompts" checked={joinMode === 'own-prompts'} onChange={() => setJoinMode('own-prompts')} className="text-indigo-600" />
                      <span className="text-sm text-gray-700">
                        {joinRoom.sharePrompts ? `Use my own Prosochai` : 'Add my own Prosochai'}
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="joinMode" value="no-prompts" checked={joinMode === 'no-prompts'} onChange={() => setJoinMode('no-prompts')} className="text-indigo-600" />
                      <span className="text-sm text-gray-700">No Prosochai</span>
                    </label>
                    <Button onClick={handleJoinSession} className="w-full">
                      Join Session
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 text-sm">{label}</dt>
      <dd className="font-medium text-gray-800 text-sm text-right">{value}</dd>
    </div>
  );
}
