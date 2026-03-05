'use client';

import { useState } from 'react';
import type { CoworkDay, CoworkRoom, CoworkTimingSettings, Settings } from '@/lib/types';
import { createRoom } from '@/lib/cowork';
import Button from '../ui/Button';
import Card from '../ui/Card';
import NumberInput from '../ui/NumberInput';
import ToggleSwitch from '../ui/ToggleSwitch';

interface CoworkSetupProps {
  currentSettings: Settings;
  onHostStart: (room: CoworkRoom, startMs: number) => void;
  onBack: () => void;
}

const DAYS: CoworkDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const COMMON_TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto', 'America/Vancouver',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
  'Europe/Rome', 'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/Helsinki',
  'Europe/Moscow', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok',
  'Asia/Singapore', 'Asia/Tokyo', 'Asia/Seoul', 'Australia/Sydney',
  'Pacific/Auckland',
];

function toDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseDatetimeLocal(value: string): number {
  return new Date(value).getTime();
}

export default function CoworkSetup({ currentSettings, onHostStart, onBack }: CoworkSetupProps) {
  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Timing settings — pre-fill from current settings
  const [work, setWork] = useState(
    currentSettings.workMinutes > 0 ? currentSettings.workMinutes : 25
  );
  const [brk, setBrk] = useState(
    currentSettings.breakMinutes > 0 ? currentSettings.breakMinutes : 5
  );
  const [sessions, setSessions] = useState(
    currentSettings.sessionsPerSet > 0 ? currentSettings.sessionsPerSet : 4
  );
  const [multipleSets, setMultipleSets] = useState(currentSettings.multipleSets ?? false);
  const [longBreak, setLongBreak] = useState(
    currentSettings.longBreakMinutes > 0 ? currentSettings.longBreakMinutes : 20
  );
  const [numSets, setNumSets] = useState(
    currentSettings.numberOfSets > 1 ? currentSettings.numberOfSets : 3
  );
  const [hardBreak, setHardBreak] = useState(currentSettings.hardBreak ?? false);

  // Schedule type
  const [scheduleType, setScheduleType] = useState<'now' | 'onetime' | 'recurring'>('now');

  // One-time schedule
  const defaultStartMs = Date.now() + 5 * 60 * 1000; // 5 min from now
  const [startDatetime, setStartDatetime] = useState(toDatetimeLocal(defaultStartMs));

  // Recurring schedule
  const [recurDays, setRecurDays] = useState<CoworkDay[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [recurTime, setRecurTime] = useState('09:00');
  const [recurTz, setRecurTz] = useState(detectedTz);

  // Sharing
  const [sharePrompts, setSharePrompts] = useState(false);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdRoom, setCreatedRoom] = useState<CoworkRoom | null>(null);

  const toggleDay = (day: CoworkDay) => {
    setRecurDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const timingSettings: CoworkTimingSettings = {
        workMinutes: work,
        breakMinutes: brk,
        sessionsPerSet: sessions,
        multipleSets,
        longBreakMinutes: multipleSets ? longBreak : 20,
        numberOfSets: multipleSets ? numSets : 1,
        hardBreak,
        playSound: currentSettings.playSound,
      };

      // Compute session duration in minutes for recurrence rule
      const setDurationMin = work * sessions + brk * (sessions - 1);
      const durationMinutes = multipleSets
        ? setDurationMin * numSets + longBreak * (numSets - 1)
        : setDurationMin;

      const roomInput: Omit<CoworkRoom, 'code' | 'hostUid' | 'createdAt'> = {
        type: 'private',
        timingSettings,
        sharePrompts,
        ...(sharePrompts && currentSettings.promptText ? {
          promptSettings: {
            promptText: currentSettings.promptText,
            promptIntervalMinutes: currentSettings.promptIntervalMinutes || 12.5,
            dismissSeconds: currentSettings.dismissSeconds || 15,
            promptCount: currentSettings.promptCount || 0,
            bothMindfulnessScope: currentSettings.bothMindfulnessScope || 'work-only',
          },
        } : {}),
        ...(scheduleType === 'onetime' ? { startTime: parseDatetimeLocal(startDatetime) } : {}),
        ...(scheduleType === 'recurring' ? {
          recurrenceRule: {
            days: recurDays.length > 0 ? recurDays : ['Mon'],
            time: recurTime,
            timezone: recurTz,
            durationMinutes,
          },
        } : {}),
        ...(scheduleType === 'now' ? { startTime: Date.now() + 3000 } : {}),
      };

      const code = await createRoom(roomInput);
      const room: CoworkRoom = {
        ...roomInput,
        code,
        hostUid: '', // will be set by Firebase
        createdAt: Date.now(),
      };
      setCreatedRoom(room);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinAsHost = async () => {
    if (!createdRoom) return;
    let startMs: number;
    if (createdRoom.startTime !== undefined) {
      startMs = createdRoom.startTime;
    } else if (createdRoom.recurrenceRule) {
      // For recurring: join starting now (the next occurrence may be in the future)
      const { computeMostRecentOccurrence, computeNextOccurrence } = await import('@/lib/cowork');
      const now = Date.now();
      const recent = computeMostRecentOccurrence(createdRoom.recurrenceRule, now);
      const next = computeNextOccurrence(createdRoom.recurrenceRule, now);
      startMs = recent ?? next ?? now;
    } else {
      startMs = Date.now();
    }
    onHostStart(createdRoom, startMs);
  };

  // ── Render: room created ───────────────────────────────────────────────────

  if (createdRoom) {
    const scheduleDesc =
      createdRoom.startTime !== undefined
        ? scheduleType === 'now'
          ? 'Starting now'
          : `Starting at ${new Date(createdRoom.startTime).toLocaleString()}`
        : createdRoom.recurrenceRule
          ? `${createdRoom.recurrenceRule.days.join(', ')} at ${createdRoom.recurrenceRule.time} (${createdRoom.recurrenceRule.timezone})`
          : '';

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-3">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Room Created</h2>
          <p className="text-sm text-gray-500 mt-1">{scheduleDesc}</p>
        </div>

        <Card>
          <div className="text-center py-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Room Code</p>
            <p className="text-5xl font-bold font-mono text-indigo-600 tracking-widest">
              {createdRoom.code}
            </p>
            <p className="text-xs text-gray-400 mt-2">Share this code with people you want to join</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-1 text-sm text-gray-600">
            <p><span className="font-medium">Work:</span> {createdRoom.timingSettings.workMinutes} min</p>
            <p><span className="font-medium">Break:</span> {createdRoom.timingSettings.breakMinutes} min</p>
            <p><span className="font-medium">Sessions:</span> {createdRoom.timingSettings.sessionsPerSet} per set
              {createdRoom.timingSettings.multipleSets && ` × ${createdRoom.timingSettings.numberOfSets} sets`}</p>
            <p><span className="font-medium">Prompts shared:</span> {createdRoom.sharePrompts ? 'Yes' : 'No'}</p>
          </div>
        </Card>

        <Button onClick={handleJoinAsHost} className="w-full">
          Join as Host
        </Button>
        <Button onClick={onBack} variant="ghost" className="w-full">
          Back to Home
        </Button>
      </div>
    );
  }

  // ── Render: setup form ─────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Host a Cowork Session</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure the timer settings that everyone will share.
        </p>
      </div>

      {/* Timing */}
      <Card>
        <div className="space-y-5">
          <h3 className="text-base font-semibold text-gray-700">Timer Settings</h3>
          <NumberInput label="Work period" value={work} defaultValue={25} unit="min"
            onChange={setWork} min={1} step={1} integerOnly />
          <NumberInput label="Break" value={brk} defaultValue={5} unit="min"
            onChange={setBrk} min={1} step={1} integerOnly />
          <NumberInput label="Sessions per set" value={sessions} defaultValue={4} unit="sessions"
            onChange={setSessions} min={1} step={1} integerOnly />
          <ToggleSwitch label="Multiple sets" checked={multipleSets} onChange={setMultipleSets} />
          {multipleSets && (
            <>
              <NumberInput label="Long break between sets" value={longBreak} defaultValue={20}
                unit="min" onChange={setLongBreak} min={1} step={1} integerOnly />
              <NumberInput label="Number of sets" value={numSets} defaultValue={3}
                unit="sets" onChange={setNumSets} min={2} step={1} integerOnly />
            </>
          )}
          <ToggleSwitch
            label="Hard breaks"
            description="Break popups fill the full break duration and can't be dismissed early."
            checked={hardBreak}
            onChange={setHardBreak}
          />
        </div>
      </Card>

      {/* Schedule */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-700">When does it start?</h3>
          <div className="space-y-2">
            {(['now', 'onetime', 'recurring'] as const).map((opt) => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={scheduleType === opt}
                  onChange={() => setScheduleType(opt)}
                  className="accent-indigo-600"
                />
                <span className="text-sm text-gray-700">
                  {opt === 'now' && 'Start immediately (when I click Join)'}
                  {opt === 'onetime' && 'Schedule a specific date & time'}
                  {opt === 'recurring' && 'Repeat on a weekly schedule'}
                </span>
              </label>
            ))}
          </div>

          {scheduleType === 'onetime' && (
            <div className="pt-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date & time</label>
              <input
                type="datetime-local"
                value={startDatetime}
                onChange={e => setStartDatetime(e.target.value)}
                className="rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {scheduleType === 'recurring' && (
            <div className="space-y-3 pt-1">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Days</p>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        recurDays.includes(day)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={recurTime}
                  onChange={e => setRecurTime(e.target.value)}
                  className="rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  value={recurTz}
                  onChange={e => setRecurTz(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  {COMMON_TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Sharing */}
      <Card>
        <ToggleSwitch
          label="Share my mindfulness prompts"
          description="Guests who want them can opt in to see your prompt text."
          checked={sharePrompts}
          onChange={setSharePrompts}
        />
        {sharePrompts && !currentSettings.promptText && (
          <p className="mt-2 text-xs text-amber-600">
            You don't have a prompt configured. Set one in your regular Combo or Mindfulness settings first.
          </p>
        )}
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={handleCreate} disabled={loading} className="w-full">
        {loading ? 'Creating room…' : 'Create Room'}
      </Button>
      <Button onClick={onBack} variant="ghost" className="w-full">
        Back
      </Button>
    </div>
  );
}
