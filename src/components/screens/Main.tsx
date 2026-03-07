'use client';

import { useState, useEffect, useRef } from 'react';
import type { Settings, PresetSlot, MindfulnessScope, CoworkRoom, GuestContentMode } from '@/lib/types';
import { listPresets, renamePreset, deletePreset } from '@/lib/storage';
import { formatNum } from '@/lib/format';
import {
  createRoom,
  getRoom,
  deleteRoom as deleteFirebaseRoom,
  getHostRooms,
  computeRoomTiming,
} from '@/lib/cowork';
import Button from '../ui/Button';

interface MainProps {
  settings: Settings;
  onStart: () => void;
  onScheduledStart: (startMs: number) => void;
  onCustomize: () => void;
  onLoadPreset: (settings: Settings) => void;
  onSettingsChange: (settings: Settings) => void;
  onCoworkHostStart: (room: CoworkRoom, startMs: number) => void;
  onCoworkGuestStart: (room: CoworkRoom, mode: GuestContentMode, startMs: number) => void;
}

// ── Timezone picker data ──────────────────────────────────────────────────────

const IANA_ZONES = [
  'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Denver',
  'America/Chicago', 'America/New_York', 'America/Halifax', 'America/St_Johns',
  'America/Sao_Paulo', 'Atlantic/Azores', 'Europe/London', 'Europe/Paris',
  'Europe/Helsinki', 'Europe/Moscow', 'Asia/Dubai', 'Asia/Kolkata',
  'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Tokyo',
  'Australia/Sydney', 'Pacific/Auckland',
];

interface TzOption {
  zone: string;
  offsetMinutes: number;
  label: string;
}

function buildTzOptions(): TzOption[] {
  const now = new Date();
  return IANA_ZONES.map((zone) => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        timeZoneName: 'shortOffset',
      });
      const parts = formatter.formatToParts(now);
      const offsetStr = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'UTC';
      // Parse offset: "GMT+5:30" or "GMT-5"
      const match = offsetStr.match(/GMT([+-])(\d+)(?::(\d+))?/);
      let offsetMinutes = 0;
      if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        offsetMinutes = sign * (parseInt(match[2], 10) * 60 + parseInt(match[3] ?? '0', 10));
      }
      const h = Math.floor(Math.abs(offsetMinutes) / 60);
      const m = Math.abs(offsetMinutes) % 60;
      const utcStr = `UTC${offsetMinutes >= 0 ? '+' : '−'}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
      const cityName = zone.split('/').pop()!.replace(/_/g, ' ');
      const region = zone.split('/')[0];
      return { zone, offsetMinutes, label: `${utcStr} — ${region.replace('_', ' ')}: ${cityName}` };
    } catch {
      return { zone, offsetMinutes: 0, label: zone };
    }
  }).sort((a, b) => a.offsetMinutes - b.offsetMinutes);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scopeLabel(scope: MindfulnessScope | undefined): string {
  switch (scope) {
    case 'breaks':      return 'Intervals + at each break';
    case 'work-starts': return 'Intervals + returning from breaks';
    case 'all':         return 'All popups';
    default:            return 'At work intervals only';
  }
}

function settingsLabel(s: Settings): string {
  if (s.useTimedWork && s.useMindfulness) return 'Timed Work + Mindfulness Prompts';
  if (s.useTimedWork) return 'Timed Work Sessions';
  return 'Mindfulness Prompts Only';
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="ml-1 text-gray-400 hover:text-indigo-500 transition-colors text-xs align-middle"
        aria-label="What is this?"
      >
        ⓘ
      </button>
      {show && (
        <span className="absolute left-6 top-0 z-50 w-64 rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-600 shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Main({
  settings,
  onStart,
  onScheduledStart,
  onCustomize,
  onLoadPreset,
  onSettingsChange,
  onCoworkHostStart,
  onCoworkGuestStart,
}: MainProps) {
  const [presets, setPresets] = useState(() => listPresets());
  const [renamingSlot, setRenamingSlot] = useState<PresetSlot | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<PresetSlot | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<{ slot: PresetSlot; name: string } | null>(null);

  // Panel expansion state
  const [expandHost, setExpandHost] = useState(false);
  const [expandSchedule, setExpandSchedule] = useState(false);
  const [expandJoin, setExpandJoin] = useState(false);

  // Hosted rooms
  const [hostedRooms, setHostedRooms] = useState<CoworkRoom[]>([]);
  const [showRoomCodes, setShowRoomCodes] = useState<Record<string, boolean>>({});
  const [deletingRoom, setDeletingRoom] = useState<string | null>(null);
  const [hostedRoomsLoaded, setHostedRoomsLoaded] = useState(false);

  // Host panel state
  const [hostRoomName, setHostRoomName] = useState('');
  const [hostSharePrompts, setHostSharePrompts] = useState(true);
  const [hostScheduleType, setHostScheduleType] = useState<'now' | 'specific' | 'recurring'>('now');
  const [hostGenerating, setHostGenerating] = useState(false);
  const [hostError, setHostError] = useState('');
  const [generatedRoom, setGeneratedRoom] = useState<CoworkRoom | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Schedule panel state (shared between host and solo)
  const [scheduleType, setScheduleType] = useState<'specific' | 'recurring'>('specific');
  const [specificDate, setSpecificDate] = useState('');
  const [specificTime, setSpecificTime] = useState('');
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [recurringTime, setRecurringTime] = useState('');
  const [recurringTimezone, setRecurringTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [tzFilter, setTzFilter] = useState('');
  const tzOptions = useRef<TzOption[]>(buildTzOptions());

  // Join panel state
  const [joinCode, setJoinCode] = useState('');
  const [joinRoom, setJoinRoom] = useState<CoworkRoom | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinMode, setJoinMode] = useState<GuestContentMode>('host-prompts');

  // Load hosted rooms
  useEffect(() => {
    getHostRooms().then((rooms) => {
      setHostedRooms(rooms);
      setHostedRoomsLoaded(true);
      // Default room name
      if (!hostRoomName) setHostRoomName(`Room ${rooms.length + 1}`);
    }).catch(() => {
      setHostedRoomsLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshPresets = () => setPresets(listPresets());

  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
      onStartRef.current();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Preset handlers ──

  const handleLoad = (slot: PresetSlot) => {
    const preset = presets.find((p) => p.slot === slot);
    if (preset) {
      onLoadPreset(preset.preset.settings);
      setSelectedPreset({ slot, name: preset.preset.name });
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

  // ── Schedule helpers ──

  function getScheduledStartMs(): number | null {
    if (scheduleType === 'specific') {
      if (!specificDate || !specificTime) return null;
      const ms = new Date(`${specificDate}T${specificTime}`).getTime();
      return isNaN(ms) ? null : ms;
    }
    // Recurring — not a one-time ms, handled separately
    return null;
  }

  // ── Host handlers ──

  const handleGenerateRoom = async () => {
    if (hostedRooms.length >= 5) { setHostError('You already have 5 hosted rooms. Delete one to create a new room.'); return; }
    setHostGenerating(true);
    setHostError('');
    try {
      const code = await createRoom({
        type: 'public',
        name: hostRoomName.trim() || `Room ${hostedRooms.length + 1}`,
        mindfulnessOnly: !settings.useTimedWork,
        timingSettings: {
          workMinutes: settings.workMinutes,
          breakMinutes: settings.breakMinutes,
          sessionsPerSet: settings.sessionsPerSet,
          multipleSets: settings.multipleSets,
          longBreakMinutes: settings.longBreakMinutes,
          numberOfSets: settings.numberOfSets,
          hardBreak: settings.hardBreak ?? false,
          playSound: settings.playSound,
        },
        sharePrompts: settings.useMindfulness ? hostSharePrompts : false,
        promptSettings: (settings.useMindfulness && hostSharePrompts) ? {
          promptText: settings.promptText,
          promptIntervalMinutes: settings.promptIntervalMinutes,
          dismissSeconds: settings.dismissSeconds,
          promptCount: settings.promptCount,
          bothMindfulnessScope: settings.bothMindfulnessScope ?? 'work-only',
        } : undefined,
        startTime: Date.now(), // default: now; TODO: tie into schedule panel
      });
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
      // Default guest mode
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

  // ── Filtered timezone options ──
  const filteredTz = tzFilter
    ? tzOptions.current.filter((t) => t.label.toLowerCase().includes(tzFilter.toLowerCase()))
    : tzOptions.current;

  // ── Detected timezone label ──
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userTzOption = tzOptions.current.find((t) => t.zone === userTz);
  const userTzLabel = userTzOption
    ? userTzOption.label.split('—')[0].trim()
    : userTz;

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold leading-tight">
          <span className="text-indigo-600">{settingsLabel(settings)}</span>
        </h2>
        <p className="mt-1 text-gray-500">Current settings</p>
        {selectedPreset && (
          <p className="mt-1 text-sm text-indigo-600">
            Preset selected: {selectedPreset.slot} — {selectedPreset.name}
          </p>
        )}
      </div>

      {/* Settings summary */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <dl className="space-y-3">
          {settings.useTimedWork && (
            <>
              <SettingRow label="Work periods" value={`${formatNum(settings.workMinutes)} minutes`} />
              <SettingRow label="Breaks" value={`${formatNum(settings.breakMinutes)} minutes`} />
              {settings.hardBreak && <SettingRow label="Lock screen during breaks" value="Yes" />}
              <SettingRow label="Periods per set" value={settings.sessionsPerSet === 0 ? '∞ (unlimited)' : String(settings.sessionsPerSet)} />
              {settings.multipleSets && (
                <>
                  <SettingRow label="Long break" value={`${formatNum(settings.longBreakMinutes)} minutes`} />
                  <SettingRow label="Number of sets" value={settings.numberOfSets === 0 ? 'Unlimited' : String(settings.numberOfSets)} />
                </>
              )}
            </>
          )}
          {settings.useMindfulness && (
            <>
              <SettingRow label="Mindfulness prompts" value="On" />
              <SettingRow label="Prompt" value={`"${settings.promptText}"`} />
              <SettingRow label="Prompt every" value={`${formatNum(settings.promptIntervalMinutes)} minutes`} />
              <SettingRow label="Dismiss delay" value={`${settings.dismissSeconds} seconds`} />
              {!settings.useTimedWork && (
                <SettingRow
                  label="Runs"
                  value={settings.promptCount > 0 ? `${settings.promptCount} prompt${settings.promptCount !== 1 ? 's' : ''} then stops` : 'Indefinitely (until stopped)'}
                />
              )}
              {settings.useTimedWork && (
                <SettingRow label="Mindfulness shows" value={scopeLabel(settings.bothMindfulnessScope)} />
              )}
            </>
          )}
          {!settings.useMindfulness && <SettingRow label="Mindfulness prompts" value="Off" />}
          <SettingRow label="Sound" value={settings.playSound ? 'On' : 'Off'} />
        </dl>
      </div>

      {/* Presets */}
      {presets.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="mb-3 text-sm font-semibold text-indigo-700">Saved presets</p>
          <div className="space-y-2">
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
                    <button onClick={() => handleLoad(slot)} className="flex-1 text-left text-sm">
                      <span className="font-medium text-gray-700">{slot}</span>
                      <span className="mx-2 text-gray-400">&mdash;</span>
                      <span className="text-gray-600">{preset.name}</span>
                    </button>
                    <button onClick={() => { setRenamingSlot(slot); setRenameValue(preset.name); setConfirmDeleteSlot(null); }} className="text-xs text-gray-400 hover:text-indigo-600">Rename</button>
                    <button
                      onClick={() => handleDelete(slot)}
                      className={`text-xs font-medium ${confirmDeleteSlot === slot ? 'text-red-600 hover:text-red-800' : 'text-gray-400 hover:text-red-500'}`}
                    >
                      {confirmDeleteSlot === slot ? 'Confirm?' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hosted rooms */}
      {hostedRoomsLoaded && hostedRooms.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="mb-3 text-sm font-semibold text-emerald-700">Your coworking rooms</p>
          <div className="space-y-2">
            {hostedRooms.map((room) => (
              <div key={room.code} className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex-1 text-sm font-medium text-gray-700">{room.name ?? room.code}</span>
                  <button
                    onClick={() => setShowRoomCodes((prev) => ({ ...prev, [room.code]: !prev[room.code] }))}
                    className="text-xs text-gray-400 hover:text-emerald-600"
                  >
                    {showRoomCodes[room.code] ? 'Hide code' : 'Show code'}
                  </button>
                  <button
                    onClick={() => handleDeleteRoom(room.code)}
                    className={`text-xs font-medium ${deletingRoom === room.code ? 'text-red-600 hover:text-red-800' : 'text-gray-400 hover:text-red-500'}`}
                  >
                    {deletingRoom === room.code ? 'Confirm delete?' : 'Delete'}
                  </button>
                </div>
                {showRoomCodes[room.code] && (
                  <div className="mt-2 flex items-center gap-2">
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
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        <Button onClick={onStart} className="w-full text-lg">
          Start Session
        </Button>

        {/* ── Host a Coworking Session ▼ ── */}
        <button
          type="button"
          onClick={() => { setExpandHost((v) => !v); setExpandSchedule(false); setExpandJoin(false); }}
          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:border-indigo-300 transition-colors text-left flex items-center justify-between"
        >
          <span>
            Make this a Hosted{' '}
            <span className="underline decoration-dotted cursor-help">
              Coworking Session
              <Tooltip text="Start a shared session that others can join using a room code. Everyone syncs to your timer — and optionally your mindfulness prompts." />
            </span>
            {' '}▼
          </span>
        </button>

        {expandHost && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            {generatedRoom ? (
              // ── Post-generation view ──
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
                <Button onClick={handleHostJoinSession} className="w-full">
                  Join as Host &amp; Start Session
                </Button>
                <button onClick={() => setGeneratedRoom(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">
                  Create a different room
                </button>
              </div>
            ) : (
              // ── Room creation form ──
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room name</label>
                  <input
                    type="text"
                    value={hostRoomName}
                    onChange={(e) => setHostRoomName(e.target.value)}
                    placeholder={`Room ${hostedRooms.length + 1}`}
                    className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Prompt sharing toggle — only if mindfulness is on */}
                {settings.useMindfulness && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!hostSharePrompts}
                      onChange={(e) => setHostSharePrompts(!e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Do NOT share my mindfulness prompts with guests</span>
                  </label>
                )}

                {/* Mindfulness-only: sharing is mandatory, show notice */}
                {!settings.useTimedWork && settings.useMindfulness && (
                  <p className="text-xs text-gray-500 italic">
                    Mindfulness prompts are always shared in a mindfulness-only coworking session.
                  </p>
                )}

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

        {/* ── Schedule Start Time ▼ ── */}
        <button
          type="button"
          onClick={() => { setExpandSchedule((v) => !v); setExpandJoin(false); }}
          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:border-indigo-300 transition-colors text-left"
        >
          Schedule Start Time ▼
        </button>

        {expandSchedule && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="scheduleType" value="specific" checked={scheduleType === 'specific'} onChange={() => setScheduleType('specific')} className="text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">Schedule a specific date &amp; time</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="scheduleType" value="recurring" checked={scheduleType === 'recurring'} onChange={() => setScheduleType('recurring')} className="text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">Repeat on a weekly schedule</span>
              </label>
            </div>

            {scheduleType === 'specific' && (
              <div className="space-y-3">
                <div className="flex gap-3 flex-wrap">
                  <input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <input
                    type="time"
                    value={specificTime}
                    onChange={(e) => setSpecificTime(e.target.value)}
                    className="rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-gray-400">Your time zone: {userTzLabel}</p>
                {specificDate && specificTime && (
                  <Button
                    onClick={() => {
                      const ms = getScheduledStartMs();
                      if (ms) onScheduledStart(ms);
                    }}
                    className="w-full"
                  >
                    Schedule Session
                  </Button>
                )}
              </div>
            )}

            {scheduleType === 'recurring' && (
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setRecurringDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])}
                      className={`rounded-full px-3 py-1 text-xs font-medium border-2 transition-colors ${recurringDays.includes(day) ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-gray-300 bg-white text-gray-600'}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 items-center flex-wrap">
                  <input
                    type="time"
                    value={recurringTime}
                    onChange={(e) => setRecurringTime(e.target.value)}
                    className="rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-sm text-gray-500">at</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Time zone</label>
                  <input
                    type="text"
                    value={tzFilter}
                    onChange={(e) => setTzFilter(e.target.value)}
                    placeholder="Filter by city, region, or UTC offset…"
                    className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <select
                    value={recurringTimezone}
                    onChange={(e) => setRecurringTimezone(e.target.value)}
                    className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    size={5}
                  >
                    {filteredTz.map((t) => (
                      <option key={t.zone} value={t.zone}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        <Button onClick={onCustomize} variant="secondary" className="w-full">
          Change Settings
        </Button>

        {/* ── Join a Coworking Session ▼ ── */}
        <div className="border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => { setExpandJoin((v) => !v); setExpandHost(false); setExpandSchedule(false); }}
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 hover:border-indigo-300 transition-colors text-left"
          >
            Join a{' '}
            <span className="underline decoration-dotted cursor-help">
              Coworking Session
              <Tooltip text="Sync to a shared session hosted by someone else. Enter their room code to join their timer in real time." />
            </span>
            {' '}▼
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
                  {/* Room settings summary */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Room settings</p>
                    <dl className="space-y-1.5">
                      <SettingRow label="Room" value={joinRoom.name ?? joinRoom.code} />
                      <SettingRow label="Work period" value={`${joinRoom.timingSettings.workMinutes} min`} />
                      <SettingRow label="Break" value={`${joinRoom.timingSettings.breakMinutes} min`} />
                      <SettingRow label="Mindfulness prompts" value={joinRoom.sharePrompts ? 'Shared by host' : 'Not shared'} />
                    </dl>
                  </div>

                  {/* Guest mode options */}
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
                        {joinRoom.sharePrompts ? 'Use my own prompts (instead of host\'s)' : 'Add my own mindfulness prompts'}
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="joinMode" value="no-prompts" checked={joinMode === 'no-prompts'} onChange={() => setJoinMode('no-prompts')} className="text-indigo-600" />
                      <span className="text-sm text-gray-700">No mindfulness prompts</span>
                    </label>

                    {/* Warning: can't mix prompt-only coworking with hybrid */}
                    {joinRoom.mindfulnessOnly && joinMode === 'no-prompts' && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
                        This is a mindfulness-only room. Joining without prompts means you&rsquo;ll just see a running timer with no content.
                      </p>
                    )}
                  </div>

                  <Button onClick={handleJoinSession} className="w-full">
                    Join Session
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
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
