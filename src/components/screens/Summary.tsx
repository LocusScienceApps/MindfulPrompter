'use client';

import { useState, useEffect } from 'react';
import type { Settings, PresetSlot, CoworkRoom, EditContext, CoworkDay } from '@/lib/types';
import { getPresetSlots, savePreset, listPresets, renamePreset, deletePreset, saveSoloSchedule } from '@/lib/storage';
import { generatePresetName, generateRoomName } from '@/lib/defaults';
import {
  createRoom,
  getRoom,
  getHostRooms,
  deleteRoom as deleteFirebaseRoom,
  updateRoom as updateFirebaseRoom,
  computeRoomTiming,
  computeSessionDurationMs,
} from '@/lib/cowork';
import Button from '../ui/Button';
import SettingsDisplay from '../ui/SettingsDisplay';
import WhenSection from '../ui/WhenSection';

interface SettingsUpdatedProps {
  settings: Settings;
  onBegin: () => void;
  onScheduledStart: (startMs: number) => void;
  onSaveAsDefault: (s: Settings) => void;
  onBack: () => void;
  onCustomize: () => void;
  onLoadPreset: (settings: Settings, slot?: PresetSlot, name?: string) => void;
  onLoadRoom?: (room: CoworkRoom) => void;
  onCoworkHostStart: (room: CoworkRoom, startMs: number) => void;
  onSettingsChange: (s: Settings) => void;
  editContext?: EditContext | null;
  onSaveToContext?: (s: Settings) => Promise<void>;
}

type SubView = null | 'preset-naming' | 'preset-slots' | 'save-default-confirm';

// ── Room badge helpers (same as Main.tsx) ──

function getRoomSortKey(room: CoworkRoom): { group: 0 | 1 | 2; sortMs: number } {
  const timing = computeRoomTiming(room);
  if (timing?.isActive) return { group: 0, sortMs: timing.startMs };
  if (timing?.isFuture || timing?.nextStartMs) return { group: 1, sortMs: timing?.nextStartMs ?? timing?.startMs ?? 0 };
  return { group: 2, sortMs: -(timing?.startMs ?? 0) };
}

function formatRoomBadge(room: CoworkRoom): { label: string; colorClass: string } {
  const timing = computeRoomTiming(room);
  if (timing?.isActive) return { label: 'Live', colorClass: 'bg-emerald-100 text-emerald-700' };
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

export default function SettingsUpdated({
  settings,
  onBegin,
  onScheduledStart,
  onSaveAsDefault,
  onBack,
  onCustomize,
  onLoadPreset,
  onLoadRoom,
  onCoworkHostStart,
  onSettingsChange,
  editContext,
  onSaveToContext,
}: SettingsUpdatedProps) {
  const [localS, setLocalS] = useState<Settings>(settings);
  const [savingContext, setSavingContext] = useState(false);
  const [saveContextError, setSaveContextError] = useState('');

  const handleLocalChange = (s: Settings) => {
    setLocalS(s);
    onSettingsChange(s);
  };

  const autoName = generatePresetName(localS);

  const [subView, setSubView] = useState<SubView>(null);
  const [presetName, setPresetName] = useState(autoName);
  const [savedSlot, setSavedSlot] = useState<PresetSlot | null>(null);
  const [savedPresetName, setSavedPresetName] = useState('');
  const [confirmOverwrite, setConfirmOverwrite] = useState<PresetSlot | null>(null);
  const presetSlots = (subView === 'preset-slots' || confirmOverwrite !== null) ? getPresetSlots() : [];

  // Preset list (collapsible — shown in main view and post-save view)
  const [presetList, setPresetList] = useState<ReturnType<typeof listPresets>>([]);
  const [expandPresets, setExpandPresets] = useState(false);
  const [renamingSlot, setRenamingSlot] = useState<PresetSlot | null>(null);
  const [renameSlotValue, setRenameSlotValue] = useState('');
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<PresetSlot | null>(null);
  const [openDropdownPreset, setOpenDropdownPreset] = useState<PresetSlot | null>(null);

  // Post-save indicator
  const [postSaveSelectedSlot, setPostSaveSelectedSlot] = useState<PresetSlot | null>(null);
  const [postSaveSelectedName, setPostSaveSelectedName] = useState('');
  const [expandPostSavePresets, setExpandPostSavePresets] = useState(false);

  // Hosted rooms state
  const [hostedRooms, setHostedRooms] = useState<CoworkRoom[]>([]);
  const [hostedRoomsLoaded, setHostedRoomsLoaded] = useState(false);
  const [expandRooms, setExpandRooms] = useState(false);
  const [showRoomCodes, setShowRoomCodes] = useState<Record<string, boolean>>({});
  const [deletingRoom, setDeletingRoom] = useState<string | null>(null);
  const [renamingRoomCode, setRenamingRoomCode] = useState<string | null>(null);
  const [renameRoomValue, setRenameRoomValue] = useState('');
  const [openDropdownRoom, setOpenDropdownRoom] = useState<string | null>(null);

  // Cowork toggle — defaults ON if editing a cowork room
  const [hostCowork, setHostCowork] = useState(() => editContext?.type === 'cowork-room');
  const [hostRoomName, setHostRoomName] = useState(() => generateRoomName(settings));
  const [hostSharePrompts, setHostSharePrompts] = useState(true);
  const [hostGenerating, setHostGenerating] = useState(false);
  const [hostError, setHostError] = useState('');
  const [generatedRoom, setGeneratedRoom] = useState<CoworkRoom | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Scheduling state
  const [startType, setStartType] = useState<'now' | 'specific' | 'recurring'>('now');
  const [specificDate, setSpecificDate] = useState(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  });
  const [specificTime, setSpecificTime] = useState('');
  const [recurringDays, setRecurringDays] = useState<CoworkDay[]>([]);
  const [recurringTime, setRecurringTime] = useState('');
  const [recurringTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  // Load preset list and rooms on mount
  useEffect(() => {
    setPresetList(listPresets());
    getHostRooms().then((rooms) => {
      setHostedRooms(rooms);
      setHostedRoomsLoaded(true);
    }).catch(() => setHostedRoomsLoaded(true));
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

  const refreshPresetList = () => setPresetList(listPresets());

  // ── Preset row handlers ──

  const handlePresetRenameSlot = (slot: PresetSlot) => {
    const trimmed = renameSlotValue.trim();
    if (trimmed) {
      renamePreset(slot, trimmed);
      if (slot === postSaveSelectedSlot) setPostSaveSelectedName(trimmed);
      refreshPresetList();
    }
    setRenamingSlot(null);
  };

  const handlePresetDelete = (slot: PresetSlot) => {
    deletePreset(slot);
    if (slot === postSaveSelectedSlot) { setPostSaveSelectedSlot(null); setPostSaveSelectedName(''); }
    refreshPresetList();
    setConfirmDeleteSlot(null);
  };

  const handlePresetLoad = (slot: PresetSlot) => {
    const p = presetList.find((x) => x.slot === slot);
    if (p) {
      onLoadPreset(p.preset.settings, slot, p.preset.name);
      setPostSaveSelectedSlot(slot);
      setPostSaveSelectedName(p.preset.name);
    }
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

  // ── Save preset ──

  const handleSavePreset = (slot: PresetSlot) => {
    const name = presetName.trim() || autoName;
    savePreset(slot, { name, settings: localS });
    setSavedSlot(slot);
    setSavedPresetName(name);
    setPostSaveSelectedSlot(slot);
    setPostSaveSelectedName(name);
    setPresetList(listPresets());
    setConfirmOverwrite(null);
    setSubView(null);
  };

  const handleSlotClick = (slot: PresetSlot, hasExisting: boolean) => {
    if (hasExisting) { setConfirmOverwrite(slot); }
    else { handleSavePreset(slot); }
  };

  // ── Room generation ──

  const handleGenerateRoom = async () => {
    setHostGenerating(true);
    setHostError('');
    try {
      const timingSettings = {
        workMinutes: localS.workMinutes,
        breakMinutes: localS.breakMinutes,
        sessionsPerSet: localS.sessionsPerSet,
        multipleSets: localS.multipleSets,
        longBreakMinutes: localS.longBreakMinutes,
        numberOfSets: localS.numberOfSets,
        hardBreak: localS.hardBreak ?? false,
        playSound: localS.playSound,
      };

      let roomInput: Parameters<typeof createRoom>[0];
      if (startType === 'recurring' && recurringDays.length > 0 && recurringTime) {
        const durationMinutes = computeSessionDurationMs(timingSettings) / 60000;
        roomInput = {
          type: 'public',
          name: hostRoomName.trim() || generateRoomName(localS),
          mindfulnessOnly: !localS.useTimedWork,
          timingSettings,
          sharePrompts: localS.useMindfulness ? hostSharePrompts : false,
          promptSettings: (localS.useMindfulness && hostSharePrompts) ? {
            promptText: localS.promptText,
            promptIntervalMinutes: localS.promptIntervalMinutes,
            dismissSeconds: localS.dismissSeconds,
            promptCount: localS.promptCount,
            bothMindfulnessScope: localS.bothMindfulnessScope ?? 'work-only',
          } : undefined,
          hostSettings: localS,
          recurrenceRule: { days: recurringDays, time: recurringTime, timezone: recurringTimezone, durationMinutes },
        };
      } else {
        const startMs =
          startType === 'specific' && specificDate && specificTime
            ? new Date(`${specificDate}T${specificTime}`).getTime()
            : Date.now();
        roomInput = {
          type: 'public',
          name: hostRoomName.trim() || generateRoomName(localS),
          mindfulnessOnly: !localS.useTimedWork,
          timingSettings,
          sharePrompts: localS.useMindfulness ? hostSharePrompts : false,
          promptSettings: (localS.useMindfulness && hostSharePrompts) ? {
            promptText: localS.promptText,
            promptIntervalMinutes: localS.promptIntervalMinutes,
            dismissSeconds: localS.dismissSeconds,
            promptCount: localS.promptCount,
            bothMindfulnessScope: localS.bothMindfulnessScope ?? 'work-only',
          } : undefined,
          hostSettings: localS,
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

  const handleHostJoinSession = (room: CoworkRoom) => {
    const timing = computeRoomTiming(room);
    onCoworkHostStart(room, timing?.startMs ?? Date.now());
  };

  const handleSaveRecurring = () => {
    if (recurringDays.length === 0 || !recurringTime) return;
    saveSoloSchedule({ type: 'recurring', days: recurringDays, time: recurringTime, timezone: recurringTimezone });
    setScheduleSaved(true);
    setTimeout(() => setScheduleSaved(false), 3000);
  };

  // ── Shared sub-sections ──

  const PresetList = ({ forPostSave }: { forPostSave?: boolean }) => {
    const expand = forPostSave ? expandPostSavePresets : expandPresets;
    const setExpand = forPostSave ? setExpandPostSavePresets : setExpandPresets;
    if (presetList.length === 0) return null;
    return (
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
        <button
          type="button"
          onClick={() => setExpand((v) => !v)}
          className="w-full flex items-center justify-between text-sm font-semibold text-indigo-700 hover:text-indigo-900 transition-colors"
        >
          <span>{expand ? '−' : '+'} Saved presets ({presetList.length})</span>
        </button>
        {expand && (
          <div className="mt-3 space-y-2">
            {presetList.map(({ slot, preset }) => (
              <div key={slot} className={`rounded-lg border px-3 py-2 space-y-2 transition-colors ${postSaveSelectedSlot === slot ? 'border-indigo-400 bg-indigo-50' : 'border-indigo-200 bg-white'}`}>
                {renamingSlot === slot ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={renameSlotValue}
                      onChange={(e) => setRenameSlotValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handlePresetRenameSlot(slot); if (e.key === 'Escape') setRenamingSlot(null); }}
                      autoFocus
                      className="flex-1 rounded border border-indigo-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                    <button onClick={() => handlePresetRenameSlot(slot)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Save</button>
                    <button onClick={() => setRenamingSlot(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { handlePresetLoad(slot); onBegin(); }}
                      className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
                    >
                      Start
                    </button>
                    <span
                      className="flex-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      onClick={() => handlePresetLoad(slot)}
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
                            onClick={() => { setOpenDropdownPreset(null); handlePresetLoad(slot); onCustomize(); }}
                            className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                          >
                            Change Settings
                          </button>
                          <button
                            onClick={() => { setOpenDropdownPreset(null); setRenamingSlot(slot); setRenameSlotValue(preset.name); setConfirmDeleteSlot(null); }}
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
                    <p className="text-xs text-red-800">Delete this preset permanently? This cannot be undone.</p>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setConfirmDeleteSlot(null)} className="text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
                      <button onClick={() => handlePresetDelete(slot)} className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">Confirm delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const RoomList = () => {
    if (!hostedRoomsLoaded || hostedRooms.length === 0) return null;
    const sortedRooms = [...hostedRooms].sort((a, b) => {
      const ka = getRoomSortKey(a);
      const kb = getRoomSortKey(b);
      if (ka.group !== kb.group) return ka.group - kb.group;
      return ka.sortMs - kb.sortMs;
    });
    return (
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
              const now = Date.now();
              const FIVE_MIN_MS = 5 * 60 * 1000;
              const futureStartMs = timing?.nextStartMs ?? timing?.startMs ?? 0;
              const isSoon = !isActive && (timing?.isFuture || !!timing?.nextStartMs) && (futureStartMs - now <= FIVE_MIN_MS);
              const joinable = isActive || isSoon;
              const isEnded = !isActive && !timing?.isFuture && !timing?.nextStartMs;
              const joinStartMs = isActive ? (timing?.startMs ?? Date.now()) : futureStartMs;
              const joinTooltip = !joinable ? (isEnded ? 'This session has ended' : 'You can join 5 minutes before it starts') : undefined;
              return (
                <div key={room.code} className={`rounded-lg border px-3 py-2 space-y-2 transition-colors ${editContext?.type === 'cowork-room' && editContext.code === room.code ? 'border-emerald-400 bg-emerald-50' : 'border-emerald-200 bg-white'}`}>
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
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${badge.colorClass}`}>{badge.label}</span>
                        <span
                          className="flex-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer min-w-0"
                          onClick={() => onLoadRoom?.(room)}
                        >
                          {room.name ?? room.code}
                          {room.recurrenceRule && (
                            <span title="Recurring session" className="ml-1 text-xs text-gray-400 cursor-help">↻</span>
                          )}
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
                                onClick={() => { setOpenDropdownRoom(null); onLoadRoom?.(room); onCustomize(); }}
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
                                onClick={() => { setOpenDropdownRoom(null); setDeletingRoom(room.code); }}
                                className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        disabled={!joinable}
                        onClick={joinable ? () => onCoworkHostStart(room, joinStartMs) : undefined}
                        title={joinTooltip}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Join
                      </button>
                    </div>
                  )}
                  {deletingRoom === room.code && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex items-center justify-between gap-3">
                      <p className="text-xs text-red-800">Delete this room permanently? This cannot be undone.</p>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setDeletingRoom(null)} className="text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button onClick={() => handleDeleteRoom(room.code)} className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">Confirm delete</button>
                      </div>
                    </div>
                  )}
                  {showRoomCodes[room.code] && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold tracking-widest text-emerald-700">{room.code}</span>
                      <button onClick={() => navigator.clipboard.writeText(room.code)} className="text-xs text-gray-400 hover:text-emerald-600">Copy</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Cowork form (standard generate-room flow)
  const CoworkForm = () => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      {generatedRoom ? (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-700">Room created!</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-3xl font-bold tracking-widest text-indigo-600">{generatedRoom.code}</span>
            <button onClick={() => { navigator.clipboard.writeText(generatedRoom.code); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }} className="text-xs text-gray-400 hover:text-indigo-600">
              {copiedCode ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-500">Share this code with anyone you want to invite.</p>
          {(() => {
            const timing = computeRoomTiming(generatedRoom);
            const startsWithin5Min = timing && (timing.isActive || (timing.isFuture && timing.startMs - Date.now() <= 5 * 60 * 1000));
            return startsWithin5Min ? (
              <Button onClick={() => handleHostJoinSession(generatedRoom)} className="w-full">Join Room Now</Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Room saved. You can join later from your rooms list.</p>
                <Button onClick={() => handleHostJoinSession(generatedRoom)} variant="secondary" className="w-full">Join as Host &amp; Start Session</Button>
              </div>
            );
          })()}
          <button onClick={() => setGeneratedRoom(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">Create a different room</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room name</label>
            <input type="text" value={hostRoomName} onChange={(e) => setHostRoomName(e.target.value)} placeholder="Room 1" className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
          </div>
          {localS.useMindfulness && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={!hostSharePrompts} onChange={(e) => setHostSharePrompts(!e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
              <span className="text-sm text-gray-700">Do NOT share my Prosochai with guests</span>
            </label>
          )}
          <Button onClick={handleGenerateRoom} disabled={hostGenerating} className="w-full">
            {hostGenerating ? 'Creating room…' : 'Generate Room Code'}
          </Button>
          {hostError && <p className="text-sm text-red-600">{hostError}</p>}
          <p className="text-xs text-gray-400">Make sure your settings are correct before generating — the room will be created immediately.</p>
        </div>
      )}
    </div>
  );

  // ── Overwrite confirmation ──
  if (confirmOverwrite !== null) {
    const existing = presetSlots.find(({ slot }) => slot === confirmOverwrite);
    return (
      <div className="space-y-6">
        <button onClick={() => setConfirmOverwrite(null)} className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back</button>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
          <p className="text-sm font-semibold text-amber-900">Overwrite existing preset?</p>
          <p className="text-sm text-amber-800">
            Slot <strong>{confirmOverwrite}</strong> already contains{' '}
            <strong>&ldquo;{existing?.preset?.name ?? 'a preset'}&rdquo;</strong>. This will permanently replace it.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => handleSavePreset(confirmOverwrite)} className="flex-1 !bg-amber-600 hover:!bg-amber-700">Overwrite</Button>
            <Button onClick={() => setConfirmOverwrite(null)} variant="secondary" className="flex-1">Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Preset naming step ──
  if (subView === 'preset-naming') {
    return (
      <div className="space-y-6">
        <button onClick={() => setSubView(null)} className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back</button>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Save Preset</h2>
          <p className="mt-1 text-gray-500">Step 1 of 2: Name your preset</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preset name</label>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder={autoName}
            className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <Button onClick={() => setSubView('preset-slots')} className="w-full">Next: Choose a slot &rarr;</Button>
      </div>
    );
  }

  // ── Preset slot picker step ──
  if (subView === 'preset-slots') {
    const displayName = presetName.trim() || autoName;
    return (
      <div className="space-y-6">
        <button onClick={() => setSubView('preset-naming')} className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back to naming</button>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Save Preset</h2>
          <p className="mt-1 text-gray-500">Step 2 of 2: Choose a slot</p>
          <p className="mt-1 text-sm font-medium text-indigo-600">Saving as: &ldquo;{displayName}&rdquo;</p>
        </div>
        <div className="space-y-2">
          {presetSlots.map(({ slot, preset }) => (
            <button
              key={slot}
              onClick={() => handleSlotClick(slot, !!preset)}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-left hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
            >
              <span className="font-medium text-gray-700">{slot}</span>
              {preset ? (
                <span className="ml-3 text-sm text-amber-600">Overwrite &ldquo;{preset.name}&rdquo;</span>
              ) : (
                <span className="ml-3 text-sm text-gray-400">Empty slot</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Post-save view ──
  if (savedSlot !== null) {
    const indicator = { slot: postSaveSelectedSlot ?? savedSlot, name: postSaveSelectedName || savedPresetName };

    return (
      <div className="space-y-6">
        <button onClick={onBack} className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back to settings</button>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Current Settings</h2>
          {indicator.slot && indicator.name && (
            <p className="mt-1 text-sm text-indigo-600">Preset selected: {indicator.slot} — {indicator.name}</p>
          )}
        </div>

        <SettingsDisplay settings={localS} onChange={handleLocalChange} />

        <PresetList forPostSave />
        <RoomList />

        <div className="flex flex-col gap-3">
          {/* Cowork toggle */}
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
              {editContext?.type === 'cowork-room' ? 'Make this a NEW ' : 'Make this a '}
              Hosted Coworking Session
            </span>
          </div>

          {/* Save options — only when cowork OFF */}
          {!hostCowork && (
            <Button onClick={onCustomize} variant="secondary" className="w-full">Change Settings</Button>
          )}

          {/* WhenSection */}
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
            onStartNow={onBegin}
            onSchedule={onScheduledStart}
            onSaveRecurring={handleSaveRecurring}
            heading={hostCowork ? 'Schedule a new coworking room' : 'Start a solo session'}
          />

          {scheduleSaved && (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 text-center">
              Schedule saved! You&rsquo;ll be notified when your session is about to start.
            </p>
          )}

          {/* Cowork form — only when cowork ON */}
          {hostCowork && <CoworkForm />}

          {!hostCowork && (
            <Button onClick={onCustomize} variant="secondary" className="w-full">Change Settings</Button>
          )}
        </div>
      </div>
    );
  }

  // ── Main view ──
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back to settings</button>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Settings Updated</h2>
        <p className="mt-1 text-gray-500">Here are your updated settings:</p>
      </div>

      <SettingsDisplay settings={localS} onChange={handleLocalChange} />

      <div className="flex flex-col gap-3">
        {/* Cowork toggle — first */}
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
            {editContext?.type === 'cowork-room' ? 'Make this a NEW ' : 'Make this a '}
            Hosted Coworking Session
          </span>
        </div>

        {/* Save options — only when cowork OFF */}
        {!hostCowork && (
          <>
            {subView === 'save-default-confirm' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <p className="text-sm text-amber-900">This will replace your current defaults. Your new defaults will be used for all future sessions unless you reset them.</p>
                <div className="flex gap-3">
                  <Button onClick={() => { setSubView(null); onSaveAsDefault(localS); }} className="flex-1">Confirm</Button>
                  <Button onClick={() => setSubView(null)} variant="secondary" className="flex-1">Cancel</Button>
                </div>
              </div>
            )}

            {saveContextError && <p className="text-sm text-red-600">{saveContextError}</p>}

            {/* Save Changes to [preset/room] */}
            {editContext && onSaveToContext && (
              <Button
                onClick={async () => {
                  setSavingContext(true);
                  setSaveContextError('');
                  try {
                    await onSaveToContext(localS);
                  } catch (e) {
                    setSaveContextError(String(e));
                    setSavingContext(false);
                  }
                }}
                disabled={savingContext}
                variant="save"
                className="w-full"
              >
                {savingContext
                  ? 'Saving…'
                  : editContext.type === 'preset'
                    ? `Save Changes to Preset: ${editContext.name}`
                    : `Save Changes to Coworking Room: ${editContext.name}`}
              </Button>
            )}

            {/* Save as a Preset */}
            {!savedSlot && (
              <Button onClick={() => { setPresetName(autoName); setSavedSlot(null); setConfirmOverwrite(null); setSubView('preset-naming'); }} variant="secondary" className="w-full">
                {editContext?.type === 'preset' ? 'Save as a NEW Preset' : 'Save as a Preset'}
              </Button>
            )}

            {/* Save as Default */}
            {!savedSlot && subView !== 'save-default-confirm' && (
              <Button onClick={() => setSubView('save-default-confirm')} variant="secondary" className="w-full">
                Save as Default
              </Button>
            )}
          </>
        )}

        {/* WhenSection — always shown */}
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
          onStartNow={onBegin}
          onSchedule={onScheduledStart}
          onSaveRecurring={handleSaveRecurring}
        />

        {scheduleSaved && (
          <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 text-center">
            Schedule saved! You&rsquo;ll be notified when your session is about to start.
          </p>
        )}

        {/* Cowork form — only when cowork ON */}
        {hostCowork && <CoworkForm />}
      </div>
    </div>
  );
}
