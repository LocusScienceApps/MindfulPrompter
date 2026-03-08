'use client';

import { useState, useEffect, useRef } from 'react';
import type { Settings, PresetSlot, CoworkRoom, GuestContentMode, CoworkDay } from '@/lib/types';
import { listPresets, renamePreset, deletePreset, saveSoloSchedule } from '@/lib/storage';
import {
  createRoom,
  getRoom,
  deleteRoom as deleteFirebaseRoom,
  getHostRooms,
  updateRoom as updateFirebaseRoom,
  computeRoomTiming,
  computeSessionDurationMs,
} from '@/lib/cowork';
import { generateRoomName } from '@/lib/defaults';
import Button from '../ui/Button';
import SettingsDisplay from '../ui/SettingsDisplay';
import WhenSection from '../ui/WhenSection';

interface MainProps {
  settings: Settings;
  onStart: () => void;
  onScheduledStart: (startMs: number) => void;
  onCustomize: () => void;
  onLoadPreset: (settings: Settings, slot?: PresetSlot, name?: string) => void;
  onLoadRoom?: (room: CoworkRoom) => void;
  onSettingsChange: (settings: Settings) => void;
  onCoworkHostStart: (room: CoworkRoom, startMs: number) => void;
  onCoworkGuestStart: (room: CoworkRoom, mode: GuestContentMode, startMs: number) => void;
  isAtDefaults: boolean;
  onLoadDefaults: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  text,
  tooltip,
  wikiUrl,
}: {
  text: string;
  tooltip: string;
  wikiUrl: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block">
      <span
        className="underline decoration-dotted cursor-help text-gray-700 hover:text-indigo-600 transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        tabIndex={0}
        role="button"
      >
        {text}
      </span>
      {show && (
        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-64 rounded-lg bg-gray-900 p-3 text-xs text-gray-100 shadow-lg text-left">
          {tooltip}{' '}
          <a
            href={wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-300 hover:text-indigo-100 underline"
          >
            Learn more on Wikipedia →
          </a>
        </span>
      )}
    </span>
  );
}

function getRoomSortKey(room: CoworkRoom): { group: 0 | 1 | 2; sortMs: number } {
  const timing = computeRoomTiming(room);
  if (timing?.isActive) return { group: 0, sortMs: timing.startMs };
  if (timing?.isFuture || timing?.nextStartMs) return { group: 1, sortMs: timing?.nextStartMs ?? timing?.startMs ?? 0 };
  return { group: 2, sortMs: -(timing?.startMs ?? 0) };
}

function formatRoomBadge(room: CoworkRoom): { label: string; colorClass: string } {
  const timing = computeRoomTiming(room);
  if (timing?.isActive) return { label: 'In progress', colorClass: 'bg-emerald-100 text-emerald-700' };
  const formatTime = (ms: number) => {
    const d = new Date(ms);
    const hhmm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    if (d.toDateString() === new Date().toDateString()) return `today at ${hhmm}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${hhmm}`;
  };
  if (timing?.isFuture || timing?.nextStartMs) {
    const ms = timing?.nextStartMs ?? timing?.startMs ?? 0;
    return { label: `Starts ${formatTime(ms)}`, colorClass: 'bg-indigo-100 text-indigo-700' };
  }
  const ms = timing?.startMs ?? 0;
  return { label: `Ended ${formatTime(ms)}`, colorClass: 'bg-gray-100 text-gray-500' };
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Main({
  settings,
  onStart,
  onScheduledStart,
  onCustomize,
  onLoadPreset,
  onLoadRoom,
  onSettingsChange,
  onCoworkHostStart,
  onCoworkGuestStart,
  isAtDefaults,
  onLoadDefaults,
}: MainProps) {
  const [presets, setPresets] = useState(() => listPresets());
  const [renamingSlot, setRenamingSlot] = useState<PresetSlot | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<PresetSlot | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<{ slot: PresetSlot; name: string } | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<{ code: string; name: string } | null>(null);

  // Collapsible sections
  const [expandPresets, setExpandPresets] = useState(false);
  const [expandRooms, setExpandRooms] = useState(false);
  const [expandJoin, setExpandJoin] = useState(false);

  // Dropdown state
  const [openDropdownPreset, setOpenDropdownPreset] = useState<PresetSlot | null>(null);
  const [openDropdownRoom, setOpenDropdownRoom] = useState<string | null>(null);

  // Cowork toggle
  const [hostCowork, setHostCowork] = useState(false);
  const [showShareLockedTip, setShowShareLockedTip] = useState(false);

  // Scheduling state (unified)
  const [startType, setStartType] = useState<'now' | 'specific' | 'recurring'>('now');
  const [specificDate, setSpecificDate] = useState(() => {
    const t = new Date();
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, '0');
    const dd = String(t.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [specificTime, setSpecificTime] = useState('');
  const [recurringDays, setRecurringDays] = useState<CoworkDay[]>([]);
  const [recurringTime, setRecurringTime] = useState('');
  const [recurringTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  // Hosted rooms
  const [hostedRooms, setHostedRooms] = useState<CoworkRoom[]>([]);
  const [showRoomCodes, setShowRoomCodes] = useState<Record<string, boolean>>({});
  const [deletingRoom, setDeletingRoom] = useState<string | null>(null);
  const [hostedRoomsLoaded, setHostedRoomsLoaded] = useState(false);
  const [renamingRoomCode, setRenamingRoomCode] = useState<string | null>(null);
  const [renameRoomValue, setRenameRoomValue] = useState('');

  // Host room creation form state
  const [hostRoomName, setHostRoomName] = useState('');
  const [hostSharePrompts, setHostSharePrompts] = useState(true);
  const [hostGenerating, setHostGenerating] = useState(false);
  const [hostError, setHostError] = useState('');
  const [generatedRoom, setGeneratedRoom] = useState<CoworkRoom | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Join panel state
  const [joinCode, setJoinCode] = useState('');
  const [joinRoom, setJoinRoom] = useState<CoworkRoom | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinMode, setJoinMode] = useState<GuestContentMode>('host-prompts');
  const [joinIsHost, setJoinIsHost] = useState(false);

  // Load hosted rooms
  useEffect(() => {
    getHostRooms().then((rooms) => {
      setHostedRooms(rooms);
      setHostedRoomsLoaded(true);
      if (!hostRoomName) {
        const baseName = generateRoomName(settings);
        const dupes = rooms.filter((r) => r.name === baseName).length;
        setHostRoomName(dupes > 0 ? `${baseName} ${dupes + 1}` : baseName);
      }
    }).catch(() => {
      setHostedRoomsLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    if (openDropdownPreset === null && openDropdownRoom === null) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-dropdown]')) {
        setOpenDropdownPreset(null);
        setOpenDropdownRoom(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdownPreset, openDropdownRoom]);

  const refreshPresets = () => setPresets(listPresets());

  // Enter key: start only when "now" + cowork OFF
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;
  const startTypeRef = useRef(startType);
  startTypeRef.current = startType;
  const hostCoworkRef = useRef(hostCowork);
  hostCoworkRef.current = hostCowork;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
      if (startTypeRef.current === 'now' && !hostCoworkRef.current) {
        onStartRef.current();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Preset handlers ──

  const handleLoad = (slot: PresetSlot) => {
    const preset = presets.find((p) => p.slot === slot);
    if (preset) {
      onLoadPreset(preset.preset.settings, slot, preset.preset.name);
      setSelectedPreset({ slot, name: preset.preset.name });
      setSelectedRoom(null);
    }
  };

  const handleSaveRename = (slot: PresetSlot) => {
    const trimmed = renameValue.trim();
    if (trimmed) { renamePreset(slot, trimmed); refreshPresets(); }
    setRenamingSlot(null);
  };

  const handleDelete = (slot: PresetSlot) => {
    if (confirmDeleteSlot === slot) {
      deletePreset(slot);
      refreshPresets();
      setConfirmDeleteSlot(null);
    } else {
      setConfirmDeleteSlot(slot);
      setRenamingSlot(null);
    }
  };

  // ── Host handlers ──

  const handleGenerateRoom = async () => {
    if (hostedRooms.length >= 5) { setHostError('You already have 5 hosted rooms. Delete one to create a new room.'); return; }
    setHostGenerating(true);
    setHostError('');
    try {
      const timingSettings = {
        workMinutes: settings.workMinutes,
        breakMinutes: settings.breakMinutes,
        sessionsPerSet: settings.sessionsPerSet,
        multipleSets: settings.multipleSets,
        longBreakMinutes: settings.longBreakMinutes,
        numberOfSets: settings.numberOfSets,
        hardBreak: settings.hardBreak ?? false,
        playSound: settings.playSound,
      };

      let roomInput: Parameters<typeof createRoom>[0];
      if (startType === 'recurring' && recurringDays.length > 0 && recurringTime) {
        const durationMinutes = computeSessionDurationMs(timingSettings) / 60000;
        roomInput = {
          type: 'public',
          name: hostRoomName.trim() || generateRoomName(settings),
          mindfulnessOnly: !settings.useTimedWork,
          timingSettings,
          sharePrompts: settings.useMindfulness ? hostSharePrompts : false,
          promptSettings: (settings.useMindfulness && hostSharePrompts) ? {
            promptText: settings.promptText,
            promptIntervalMinutes: settings.promptIntervalMinutes,
            dismissSeconds: settings.dismissSeconds,
            promptCount: settings.promptCount,
            bothMindfulnessScope: settings.bothMindfulnessScope ?? 'work-only',
          } : undefined,
          recurrenceRule: { days: recurringDays, time: recurringTime, timezone: recurringTimezone, durationMinutes },
        };
      } else {
        const startMs =
          startType === 'specific' && specificDate && specificTime
            ? new Date(`${specificDate}T${specificTime}`).getTime()
            : Date.now();
        roomInput = {
          type: 'public',
          name: hostRoomName.trim() || generateRoomName(settings),
          mindfulnessOnly: !settings.useTimedWork,
          timingSettings,
          sharePrompts: settings.useMindfulness ? hostSharePrompts : false,
          promptSettings: (settings.useMindfulness && hostSharePrompts) ? {
            promptText: settings.promptText,
            promptIntervalMinutes: settings.promptIntervalMinutes,
            dismissSeconds: settings.dismissSeconds,
            promptCount: settings.promptCount,
            bothMindfulnessScope: settings.bothMindfulnessScope ?? 'work-only',
          } : undefined,
          startTime: isNaN(startMs) ? Date.now() : startMs,
        };
      }

      const code = await createRoom(roomInput);
      const room = await getRoom(code);
      if (room) {
        setGeneratedRoom(room);
        setHostedRooms((prev) => [...prev, room]);
      }
    } catch (e) {
      setHostError(String(e));
    } finally {
      setHostGenerating(false);
    }
  };

  const handleHostJoinSession = () => {
    if (!generatedRoom) return;
    const timing = computeRoomTiming(generatedRoom);
    onCoworkHostStart(generatedRoom, timing?.startMs ?? Date.now());
  };

  const handleDeleteRoom = async (code: string) => {
    if (deletingRoom === code) {
      try {
        await deleteFirebaseRoom(code);
        setHostedRooms((prev) => prev.filter((r) => r.code !== code));
      } catch (e) {
        console.error(e);
      }
      setDeletingRoom(null);
    } else {
      setDeletingRoom(code);
    }
  };

  const handleRenameRoom = async (code: string) => {
    const trimmed = renameRoomValue.trim();
    if (trimmed) {
      try {
        await updateFirebaseRoom(code, { name: trimmed });
        setHostedRooms((prev) => prev.map((r) => r.code === code ? { ...r, name: trimmed } : r));
        if (selectedRoom?.code === code) setSelectedRoom({ code, name: trimmed });
      } catch (e) {
        console.error(e);
      }
    }
    setRenamingRoomCode(null);
  };

  // ── Schedule handlers ──

  const handleSaveRecurring = () => {
    if (recurringDays.length === 0 || !recurringTime) return;
    saveSoloSchedule({ type: 'recurring', days: recurringDays, time: recurringTime, timezone: recurringTimezone });
    setScheduleSaved(true);
    setTimeout(() => setScheduleSaved(false), 3000);
  };

  // ── Join handlers ──

  const handleJoinLookup = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) { setJoinError('Please enter a 6-character room code.'); return; }
    setJoinLoading(true);
    setJoinError('');
    setJoinRoom(null);
    try {
      const room = await getRoom(code);
      if (!room) { setJoinError('Room not found. Check the code and try again.'); return; }
      setJoinRoom(room);
      const isHost = hostedRooms.some((r) => r.code === code);
      setJoinIsHost(isHost);
      setJoinMode(room.sharePrompts ? 'host-prompts' : 'own-prompts');
    } catch {
      setJoinError('Error looking up room. Check your connection and try again.');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleJoinSession = () => {
    if (!joinRoom) return;
    const timing = computeRoomTiming(joinRoom);
    if (!timing) { setJoinError('Could not determine session timing.'); return; }
    onCoworkGuestStart(joinRoom, joinMode, timing.startMs);
  };

  // ── Render ──

  const sortedRooms = [...hostedRooms].sort((a, b) => {
    const ka = getRoomSortKey(a);
    const kb = getRoomSortKey(b);
    if (ka.group !== kb.group) return ka.group - kb.group;
    return ka.sortMs - kb.sortMs;
  });

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="text-center space-y-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.png" alt="MindfulPrompter" className="mx-auto h-16 w-auto" />
        <h1 className="text-3xl font-bold text-gray-900">MindfulPrompter</h1>
        <p className="text-base font-medium text-gray-800">Mindfulness Prompter and Work Session Timer</p>
        <p className="text-sm text-gray-600">
          — alone or with others, with{' '}
          <TaglineTooltip
            text="Pomodoro-style sessions"
            tooltip="The Pomodoro Technique breaks work into focused intervals (typically 25 minutes) followed by short breaks. It helps maintain focus and avoid burnout."
            wikiUrl="https://en.wikipedia.org/wiki/Pomodoro_Technique"
          />{' '}
          and{' '}
          <TaglineTooltip
            text="behavioral nudges"
            tooltip="Nudge theory uses small prompts and reminders to guide behavior without forcing change. Mindfulness prompts are a form of behavioral nudge."
            wikiUrl="https://en.wikipedia.org/wiki/Nudge_theory"
          />
        </p>
        {selectedPreset && !selectedRoom && (
          <p className="text-sm text-indigo-600">
            Preset selected: {selectedPreset.slot} — {selectedPreset.name}
          </p>
        )}
        {selectedRoom && (
          <p className="text-sm text-emerald-600">
            Room loaded: {selectedRoom.name}
          </p>
        )}
      </div>

      {/* Settings display */}
      <SettingsDisplay settings={settings} onChange={onSettingsChange} />

      {/* ── Saved Presets (collapsible) ── */}
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
                <div key={slot} className="rounded-lg border border-indigo-200 bg-white px-3 py-2">
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
                      <span className="flex-1 text-sm">
                        <span className="font-medium text-gray-700">{slot}</span>
                        <span className="mx-2 text-gray-400">&mdash;</span>
                        <span className="text-gray-600">{preset.name}</span>
                      </span>
                      <button
                        onClick={() => { handleLoad(slot); onStart(); }}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                      >
                        ▶ Start
                      </button>
                      <div className="relative" data-dropdown>
                        <button
                          onClick={() => setOpenDropdownPreset(openDropdownPreset === slot ? null : slot)}
                          className="text-xs text-gray-400 hover:text-gray-600 px-1"
                        >
                          ···
                        </button>
                        {openDropdownPreset === slot && (
                          <div className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                            <button
                              onClick={() => { setOpenDropdownPreset(null); handleLoad(slot); onCustomize(); }}
                              className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                            >
                              Change Settings
                            </button>
                            <button
                              onClick={() => { setOpenDropdownPreset(null); setRenamingSlot(slot); setRenameValue(preset.name); setConfirmDeleteSlot(null); }}
                              className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => { setOpenDropdownPreset(null); handleDelete(slot); }}
                              className={`w-full px-3 py-2 text-left text-xs ${confirmDeleteSlot === slot ? 'text-red-600 hover:bg-red-50' : 'text-red-500 hover:bg-red-50'}`}
                            >
                              {confirmDeleteSlot === slot ? 'Confirm delete?' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Your Coworking Rooms (collapsible) ── */}
      {hostedRoomsLoaded && hostedRooms.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <button
            type="button"
            onClick={() => setExpandRooms((v) => !v)}
            className="w-full flex items-center justify-between text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
          >
            <span>{expandRooms ? '−' : '+'} Your coworking rooms ({hostedRooms.length})</span>
          </button>
          {expandRooms && (
            <div className="mt-3 space-y-2">
              {sortedRooms.map((room) => {
                const timing = computeRoomTiming(room);
                const badge = formatRoomBadge(room);
                const isActive = timing?.isActive ?? false;
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
                        <span className="flex-1 text-sm font-medium text-gray-700 min-w-0">
                          {room.name ?? room.code}
                          {room.recurrenceRule && (
                            <span title="Recurring session" className="ml-1 text-xs text-gray-400 cursor-help">↻</span>
                          )}
                        </span>
                        {isActive && (
                          <button
                            onClick={() => onCoworkHostStart(room, timing!.startMs)}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-800 whitespace-nowrap"
                          >
                            ▶ Join Room
                          </button>
                        )}
                        <div className="relative" data-dropdown>
                          <button
                            onClick={() => setOpenDropdownRoom(openDropdownRoom === room.code ? null : room.code)}
                            className="text-xs text-gray-400 hover:text-gray-600 px-1"
                          >
                            ···
                          </button>
                          {openDropdownRoom === room.code && (
                            <div className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                              <button
                                onClick={() => { setOpenDropdownRoom(null); onLoadRoom?.(room); setSelectedRoom({ code: room.code, name: room.name ?? room.code }); setSelectedPreset(null); onCustomize(); }}
                                className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                              >
                                Change Settings
                              </button>
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
                                onClick={() => { setOpenDropdownRoom(null); handleDeleteRoom(room.code); }}
                                className={`w-full px-3 py-2 text-left text-xs ${deletingRoom === room.code ? 'text-red-600 hover:bg-red-50' : 'text-red-500 hover:bg-red-50'}`}
                              >
                                {deletingRoom === room.code ? 'Confirm delete?' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {showRoomCodes[room.code] && (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold tracking-widest text-emerald-700">{room.code}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(room.code)}
                          className="text-xs text-gray-400 hover:text-emerald-600"
                        >
                          Copy
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

      {/* ── Cowork toggle ── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={hostCowork}
          onClick={() => { setHostCowork((v) => !v); if (hostCowork) setGeneratedRoom(null); }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${hostCowork ? 'bg-indigo-600' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${hostCowork ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {selectedRoom ? 'Make this a NEW ' : 'Make this a '}
          <span className="underline decoration-dotted cursor-help">
            Hosted Coworking Session
            <Tooltip text="Start a shared session that others can join using a room code. Everyone syncs to your timer — and optionally your mindfulness prompts." />
          </span>
        </span>
      </div>

      {/* ── When Should This Session Start? ── */}
      <WhenSection
        startType={startType}
        onStartTypeChange={setStartType}
        specificDate={specificDate}
        specificTime={specificTime}
        onSpecificDateChange={setSpecificDate}
        onSpecificTimeChange={setSpecificTime}
        recurringDays={recurringDays}
        recurringTime={recurringTime}
        onRecurringDaysChange={setRecurringDays}
        onRecurringTimeChange={setRecurringTime}
        hostCowork={hostCowork}
        onStartNow={onStart}
        onSchedule={onScheduledStart}
        onSaveRecurring={handleSaveRecurring}
      />

      {scheduleSaved && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 text-center">
          Schedule saved! You&rsquo;ll be notified when your session is about to start.
        </p>
      )}

      {/* ── Cowork creation form (only when hostCowork ON) ── */}
      {hostCowork && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          {generatedRoom ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700">Room created!</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-3xl font-bold tracking-widest text-indigo-600">{generatedRoom.code}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedRoom.code);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="text-xs text-gray-400 hover:text-indigo-600"
                >
                  {copiedCode ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-gray-500">Share this code with anyone you want to invite.</p>
              {(() => {
                const timing = computeRoomTiming(generatedRoom);
                const startsWithin5Min = timing && (timing.isActive || (timing.isFuture && timing.startMs - Date.now() <= 5 * 60 * 1000));
                return startsWithin5Min ? (
                  <Button onClick={handleHostJoinSession} className="w-full">▶ Join Room Now</Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Room saved. You can join later from your rooms list.</p>
                    <Button onClick={handleHostJoinSession} variant="secondary" className="w-full">Join as Host &amp; Start Session</Button>
                  </div>
                );
              })()}
              <button onClick={() => setGeneratedRoom(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">
                Create a different room
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room name</label>
                <input
                  type="text"
                  value={hostRoomName}
                  onChange={(e) => setHostRoomName(e.target.value)}
                  placeholder={generateRoomName(settings)}
                  className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {settings.useMindfulness && (() => {
                const locked = !settings.useTimedWork;
                return (
                  <div className="relative">
                    <div
                      className={`flex items-center gap-3 ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={locked ? () => { setShowShareLockedTip(true); setTimeout(() => setShowShareLockedTip(false), 3500); } : undefined}
                    >
                      <input
                        type="checkbox"
                        checked={!hostSharePrompts}
                        onChange={(e) => setHostSharePrompts(!e.target.checked)}
                        disabled={locked}
                        className={`w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${locked ? 'opacity-40 pointer-events-none' : ''}`}
                      />
                      <span className={`text-sm ${locked ? 'text-gray-400' : 'text-gray-700'}`}>
                        Do NOT share my mindfulness prompts with guests
                      </span>
                    </div>
                    {locked && showShareLockedTip && (
                      <p className="mt-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                        In a mindfulness-only session, sharing prompts is the whole point — guests can&rsquo;t opt out.
                      </p>
                    )}
                  </div>
                );
              })()}

              {hostedRooms.length >= 5 ? (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                  You already have 5 hosted rooms. Delete one to create a new room.
                </p>
              ) : (
                <Button onClick={handleGenerateRoom} disabled={hostGenerating} className="w-full">
                  {hostGenerating ? 'Creating room…' : 'Generate Room Code'}
                </Button>
              )}

              {hostError && <p className="text-sm text-red-600">{hostError}</p>}

              <p className="text-xs text-gray-400">
                Make sure your settings are correct before generating the code — the room will be created immediately.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reset to saved defaults */}
      {!isAtDefaults && (
        <div className="text-center">
          <button
            onClick={onLoadDefaults}
            className="text-sm text-gray-400 underline hover:text-indigo-600 transition-colors"
          >
            Reset to my saved defaults
          </button>
        </div>
      )}

      {/* Change Settings */}
      <Button onClick={onCustomize} variant="secondary" className="w-full">
        Change Settings
      </Button>

      {/* ── Join a Coworking Session ▼ ── */}
      <div className="border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={() => setExpandJoin((v) => !v)}
          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 hover:border-indigo-300 transition-colors text-left"
        >
          Join a{' '}
          <span className="underline decoration-dotted cursor-help">
            Coworking Session
            <Tooltip text="Sync to a shared session hosted by someone else. Enter their room code to join their timer in real time." />
          </span>
          {' '}{expandJoin ? '▲' : '▼'}
        </button>

        {expandJoin && (
          <div className="mt-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABCXYZ"
                maxLength={6}
                className="flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 font-mono text-lg uppercase tracking-widest focus:border-indigo-500 focus:outline-none"
              />
              <Button onClick={handleJoinLookup} disabled={joinLoading}>
                {joinLoading ? '…' : 'Look Up'}
              </Button>
            </div>
            {joinError && <p className="text-sm text-red-600">{joinError}</p>}

            {joinRoom && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Room settings</p>
                  <dl className="space-y-1.5">
                    <SettingRow label="Room" value={joinRoom.name ?? joinRoom.code} />
                    <SettingRow label="Work period" value={`${joinRoom.timingSettings.workMinutes} min`} />
                    <SettingRow label="Break" value={`${joinRoom.timingSettings.breakMinutes} min`} />
                    <SettingRow label="Mindfulness prompts" value={joinRoom.sharePrompts ? 'Shared by host' : 'Not shared'} />
                  </dl>
                </div>

                {joinIsHost ? (
                  <div className="space-y-3">
                    <p className="text-sm text-emerald-700 font-medium bg-emerald-50 rounded-lg px-3 py-2">
                      This is your room — you&rsquo;ll join as the host.
                    </p>
                    <Button onClick={() => { const timing = computeRoomTiming(joinRoom); onCoworkHostStart(joinRoom, timing?.startMs ?? Date.now()); }} className="w-full">
                      Join as Host
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Your mindfulness prompts:</p>
                    {joinRoom.sharePrompts && (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="radio" name="joinMode" value="host-prompts" checked={joinMode === 'host-prompts'} onChange={() => setJoinMode('host-prompts')} className="text-indigo-600" />
                        <span className="text-sm text-gray-700">Use host&rsquo;s prompts</span>
                      </label>
                    )}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="joinMode" value="own-prompts" checked={joinMode === 'own-prompts'} onChange={() => setJoinMode('own-prompts')} className="text-indigo-600" />
                      <span className="text-sm text-gray-700">
                        {joinRoom.sharePrompts ? `Use my own prompts (instead of host's)` : 'Add my own mindfulness prompts'}
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="joinMode" value="no-prompts" checked={joinMode === 'no-prompts'} onChange={() => setJoinMode('no-prompts')} className="text-indigo-600" />
                      <span className="text-sm text-gray-700">No mindfulness prompts</span>
                    </label>
                    {joinRoom.mindfulnessOnly && joinMode === 'no-prompts' && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
                        This is a mindfulness-only room. Joining without prompts means you&rsquo;ll just see a running timer with no content.
                      </p>
                    )}
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

// ── Sub-components ──

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 text-sm">{label}</dt>
      <dd className="font-medium text-gray-800 text-sm text-right">{value}</dd>
    </div>
  );
}
