'use client';

import type { CoworkDay } from '@/lib/types';
import Button from './Button';

// ── Timezone inline label ─────────────────────────────────────────────────────

/**
 * Returns a human-friendly inline timezone label for display next to a time input.
 * Prefers a named abbreviation ("CET", "JST") when the browser provides one.
 * Falls back to "City (UTC+X)" (e.g. "Prague (UTC+1)") on platforms like Windows
 * where Chromium returns a generic offset instead of a named abbreviation.
 */
function getTzInlineLabel(zone: string): string {
  try {
    const now = new Date();
    const shortParts = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' }).formatToParts(now);
    const abbr = shortParts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    // Use the abbreviation only if it's a real one (CET, JST, EST…), not a generic offset
    if (abbr && !abbr.startsWith('GMT') && !abbr.startsWith('UTC')) return abbr;
    // Fallback: "City (UTC+X)" so users see a recognisable location alongside the offset
    const offsetParts = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' }).formatToParts(now);
    const offset = (offsetParts.find((p) => p.type === 'timeZoneName')?.value ?? '').replace('GMT', 'UTC');
    const city = zone.split('/').pop()?.replace(/_/g, ' ') ?? '';
    return city ? `${city} (${offset})` : offset;
  } catch {
    return '';
  }
}

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
  onRecurringDaysChange: (days: CoworkDay[]) => void;
  onRecurringTimeChange: (v: string) => void;
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
  onRecurringDaysChange,
  onRecurringTimeChange,
  hostCowork,
  onStartNow,
  onSchedule,
  onSaveRecurring,
}: WhenSectionProps) {
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userTzAbbr = getTzInlineLabel(userTz);

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
              <div className="flex gap-3 items-center flex-wrap">
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
                {userTzAbbr && (
                  <span className="text-sm font-medium text-gray-500">{userTzAbbr}</span>
                )}
              </div>
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
                {userTzAbbr && (
                  <span className="text-sm font-medium text-gray-500">{userTzAbbr}</span>
                )}
                <span className="text-sm text-gray-500">each selected day</span>
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
