'use client';

import { useState, useEffect, useRef } from 'react';
import Button from '../ui/Button';

interface ScheduledStartProps {
  startMs: number;   // absolute UTC timestamp when session should begin
  onStart: () => void;
  onBack: () => void;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSecs = Math.ceil(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatStartTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function ScheduledStart({ startMs, onStart, onBack }: ScheduledStartProps) {
  const [msLeft, setMsLeft] = useState(() => Math.max(0, startMs - Date.now()));
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = startMs - Date.now();
      if (remaining <= 0) {
        clearInterval(interval);
        setMsLeft(0);
        setTimeout(() => onStartRef.current(), 0);
      } else {
        setMsLeft(remaining);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [startMs]);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-indigo-600 hover:text-indigo-800">
        &larr; Back
      </button>

      <div className="text-center">
        <h2 className="text-2xl font-bold leading-tight text-gray-800">Waiting to start</h2>
        <p className="mt-1 text-gray-500">Session begins at {formatStartTime(startMs)}</p>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center space-y-2">
        <p className="text-sm font-medium text-emerald-700">Starting in</p>
        <p className="text-6xl font-bold text-emerald-600 font-mono tabular-nums">
          {formatCountdown(msLeft)}
        </p>
      </div>

      <Button onClick={onBack} variant="secondary" className="w-full">
        Cancel
      </Button>
    </div>
  );
}
