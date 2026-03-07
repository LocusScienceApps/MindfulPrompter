'use client';

import type { CoworkDay } from '@/lib/types';
import Button from './Button';

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
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' });
      const parts = formatter.formatToParts(now);
      const offsetStr = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'UTC';
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

const tzOptionsCache: TzOption[] = buildTzOptions();

// ── WhenSection ───────────────────────────────────────────────────────────────

export interface WhenSectionProps {
  startType: 'now' | 'specific' | 'recurring';
  onStartTypeChange: (t: 'now' | 'specific' | 'recurring') => void;
  // specific
  specificDate: string;
  specificTime: string;
  onSpecificDateChange: (v: string) => void;
  onSpecificTimeChange: (v: string) => void;
  // recurring
  recurringDays: CoworkDay[];
  recurringTime: string;
  recurringTimezone: string;
  tzFilter: string;
  onRecurringDaysChange: (days: CoworkDay[]) => void;
  onRecurringTimeChange: (v: string) => void;
  onRecurringTimezoneChange: (v: string) => void;
  onTzFilterChange: (v: string) => void;
  // actions
  hostCowork: boolean;
  onStartNow: () => void;
  onSchedule: (ms: number) => void;
  onSaveRecurring: () => void;
}

export default function WhenSection({
  startType,
  onStartTypeChange,
  specificDate,
  specificTime,
  onSpecificDateChange,
  onSpecificTimeChange,
  recurringDays,
  recurringTime,
  recurringTimezone,
  tzFilter,
  onRecurringDaysChange,
  onRecurringTimeChange,
  onRecurringTimezoneChange,
  onTzFilterChange,
  hostCowork,
  onStartNow,
  onSchedule,
  onSaveRecurring,
}: WhenSectionProps) {
  const filteredTz = tzFilter
    ? tzOptionsCache.filter((t) => t.label.toLowerCase().includes(tzFilter.toLowerCase()))
    : tzOptionsCache;

  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userTzOption = tzOptionsCache.find((t) => t.zone === userTz);
  const userTzLabel = userTzOption ? userTzOption.label.split('—')[0].trim() : userTz;

  const specificMs =
    specificDate && specificTime
      ? (() => { const ms = new Date(`${specificDate}T${specificTime}`).getTime(); return isNaN(ms) ? null : ms; })()
      : null;

  const recurringReady = recurringDays.length > 0 && recurringTime;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">When should this session start?</h3>

      <div className="space-y-3">
        {/* ── Start Now ── */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="startType"
              value="now"
              checked={startType === 'now'}
              onChange={() => onStartTypeChange('now')}
              className="text-indigo-600"
            />
            <span className="text-sm font-medium text-gray-700">Start session now</span>
          </label>
          {startType === 'now' && !hostCowork && (
            <div className="mt-3 ml-6">
              <Button onClick={onStartNow} className="w-full text-base">
                Start Session
              </Button>
            </div>
          )}
        </div>

        {/* ── Specific date & time ── */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="startType"
              value="specific"
              checked={startType === 'specific'}
              onChange={() => onStartTypeChange('specific')}
              className="text-indigo-600"
            />
            <span className="text-sm font-medium text-gray-700">Schedule a specific date &amp; time</span>
          </label>
          {startType === 'specific' && (
            <div className="mt-3 ml-6 space-y-3">
              <div className="flex gap-3 flex-wrap">
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => onSpecificDateChange(e.target.value)}
                  className="rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
                <input
                  type="time"
                  value={specificTime}
                  onChange={(e) => onSpecificTimeChange(e.target.value)}
                  className="rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <p className="text-xs text-gray-400">Your time zone: {userTzLabel}</p>
              {specificMs && !hostCowork && (
                <Button onClick={() => onSchedule(specificMs)} className="w-full">
                  Schedule Session
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Recurring schedule ── */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="startType"
              value="recurring"
              checked={startType === 'recurring'}
              onChange={() => onStartTypeChange('recurring')}
              className="text-indigo-600"
            />
            <span className="text-sm font-medium text-gray-700">Repeat on a weekly schedule</span>
          </label>
          {startType === 'recurring' && (
            <div className="mt-3 ml-6 space-y-3">
              <div className="flex gap-2 flex-wrap">
                {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as CoworkDay[]).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      onRecurringDaysChange(
                        recurringDays.includes(day)
                          ? recurringDays.filter((d) => d !== day)
                          : [...recurringDays, day],
                      )
                    }
                    className={`rounded-full px-3 py-1 text-xs font-medium border-2 transition-colors ${
                      recurringDays.includes(day)
                        ? 'border-indigo-500 bg-indigo-600 text-white'
                        : 'border-gray-300 bg-white text-gray-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 items-center flex-wrap">
                <input
                  type="time"
                  value={recurringTime}
                  onChange={(e) => onRecurringTimeChange(e.target.value)}
                  className="rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-sm text-gray-500">each selected day</span>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Time zone</label>
                <input
                  type="text"
                  value={tzFilter}
                  onChange={(e) => onTzFilterChange(e.target.value)}
                  placeholder="Filter by city, region, or UTC offset…"
                  className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
                <select
                  value={recurringTimezone}
                  onChange={(e) => onRecurringTimezoneChange(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  size={5}
                >
                  {filteredTz.map((t) => (
                    <option key={t.zone} value={t.zone}>{t.label}</option>
                  ))}
                </select>
              </div>
              {recurringReady && !hostCowork && (
                <Button onClick={onSaveRecurring} className="w-full">
                  Save Schedule
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
