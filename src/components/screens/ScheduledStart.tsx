'use client';

import { useState, useEffect, useRef } from 'react';
import type { Settings } from '@/lib/types';
import { formatNum } from '@/lib/format';
import Button from '../ui/Button';

interface ScheduledStartProps {
  settings: Settings;
  onStart: () => void;
  onBack: () => void;
}

const MODE_NAMES: Record<string, string> = {
  mindfulness: 'Mindfulness Prompts',
  pomodoro: 'Pomodoro Timer',
  both: 'Both Together',
};

function getSecondsUntil(timeStr: string): number | null {
  if (!timeStr) return null;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;

  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);

  let diff = Math.round((target.getTime() - now.getTime()) / 1000);
  // If time is in the past today, try tomorrow
  if (diff <= 0) {
    target.setDate(target.getDate() + 1);
    diff = Math.round((target.getTime() - now.getTime()) / 1000);
  }
  return diff;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime12(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

export default function ScheduledStart({ settings, onStart, onBack }: ScheduledStartProps) {
  const [timeStr, setTimeStr] = useState('');
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;

  const { mode } = settings;
  const modeName = MODE_NAMES[mode] ?? mode;

  const clearCountdown = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleTimeChange = (val: string) => {
    setTimeStr(val);
    setError('');
    clearCountdown();

    if (!val) {
      setSecondsLeft(null);
      return;
    }

    const secs = getSecondsUntil(val);
    if (secs === null || secs <= 0) {
      setSecondsLeft(null);
      setError('Please pick a time in the future.');
      return;
    }
    if (secs > 7200) {
      setSecondsLeft(null);
      setError('Please pick a time within the next 2 hours.');
      return;
    }

    setSecondsLeft(secs);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearCountdown();
          setTimeout(() => onStartRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => clearCountdown();
  }, []);

  const isWaiting = secondsLeft !== null && secondsLeft > 0;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-indigo-600 hover:text-indigo-800">
        &larr; Back
      </button>

      <div className="text-center">
        <h2 className="text-2xl font-bold leading-tight">
          <span className="text-indigo-600">{modeName}</span>
          <span className="text-gray-400 font-normal text-xl"> Mode</span>
        </h2>
        <p className="mt-1 text-gray-500">Schedule a start time</p>
      </div>

      {/* Time picker */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <label className="block text-sm font-medium text-gray-700">Start at</label>
        <input
          type="time"
          value={timeStr}
          onChange={(e) => handleTimeChange(e.target.value)}
          className="rounded-lg border-2 border-gray-300 px-3 py-2 text-lg font-mono focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Countdown */}
      {isWaiting && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-2">
          <p className="text-sm font-medium text-emerald-700">Session starts in</p>
          <p className="text-5xl font-bold text-emerald-600 font-mono tabular-nums">
            {formatCountdown(secondsLeft!)}
          </p>
          <p className="text-sm text-emerald-600">at {formatTime12(timeStr)}</p>
        </div>
      )}

      {/* Settings summary */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Upcoming session
        </p>
        <dl className="space-y-2">
          {(mode === 'pomodoro' || mode === 'both') && (
            <>
              <SummaryRow label="Work period" value={`${formatNum(settings.workMinutes)} min`} />
              <SummaryRow label="Break" value={`${formatNum(settings.breakMinutes)} min`} />
              <SummaryRow
                label="Sets"
                value={
                  !settings.multipleSets
                    ? '1'
                    : settings.numberOfSets === 0
                    ? 'Unlimited'
                    : String(settings.numberOfSets)
                }
              />
            </>
          )}
          {(mode === 'mindfulness' || mode === 'both') && (
            <>
              <SummaryRow
                label="Prompt every"
                value={`${formatNum(settings.promptIntervalMinutes)} min`}
              />
              <SummaryRow label="Dismiss delay" value={`${settings.dismissSeconds}s`} />
            </>
          )}
          <SummaryRow label="Sound" value={settings.playSound ? 'On' : 'Off'} />
        </dl>
      </div>

      <div className="flex flex-col gap-3">
        <Button onClick={onStart} className="w-full text-lg">
          Start Now
        </Button>
        <Button onClick={onBack} variant="secondary" className="w-full">
          Cancel
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 text-sm">{label}</dt>
      <dd className="font-medium text-gray-800 text-sm text-right">{value}</dd>
    </div>
  );
}
