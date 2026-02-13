'use client';

import type { Settings } from '@/lib/types';
import { formatNum, formatDuration } from '@/lib/format';
import Button from '../ui/Button';

interface SummaryProps {
  settings: Settings;
  onBegin: () => void;
  onBack: () => void;
}

function computeTotalTime(s: Settings): string {
  if (s.mode === 'mindfulness') {
    return 'Runs until you stop it';
  }

  const workSec = s.workMinutes * 60;
  const breakSec = s.breakMinutes * 60;
  const longBreakSec = s.longBreakMinutes * 60;
  const sessionsPerSet = s.sessionsPerSet;

  // One set: (N) work sessions + (N-1) short breaks
  const oneSetSec = sessionsPerSet * workSec + (sessionsPerSet - 1) * breakSec;

  if (!s.multipleSets || s.numberOfSets <= 1) {
    return formatDuration(oneSetSec / 60);
  }

  // Multiple sets: (sets-1) * (oneSet + longBreak) + lastSet
  const totalSec =
    (s.numberOfSets - 1) * (oneSetSec + longBreakSec) + oneSetSec;
  return formatDuration(totalSec / 60);
}

export default function Summary({ settings: s, onBegin, onBack }: SummaryProps) {
  const totalTime = computeTotalTime(s);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm text-indigo-600 hover:text-indigo-800"
      >
        &larr; Back to settings
      </button>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Ready to Start</h2>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <dl className="space-y-3">
          {/* Pomodoro settings */}
          {(s.mode === 'pomodoro' || s.mode === 'both') && (
            <>
              <Row label="Work sessions" value={`${formatNum(s.workMinutes)} min`} />
              <Row label="Breaks" value={`${formatNum(s.breakMinutes)} min`} />
              <Row label="Sessions per set" value={String(s.sessionsPerSet)} />
              {s.multipleSets && s.numberOfSets > 1 && (
                <>
                  <Row label="Long break" value={`${formatNum(s.longBreakMinutes)} min`} />
                  <Row label="Number of sets" value={String(s.numberOfSets)} />
                </>
              )}
            </>
          )}

          {/* Mindfulness settings */}
          {(s.mode === 'mindfulness' || s.mode === 'both') && (
            <>
              <Row label="Mindfulness prompt" value={`"${s.promptText}"`} />
              <Row label="Prompt every" value={`${formatNum(s.promptIntervalMinutes)} min`} />
              <Row label="Dismiss delay" value={`${s.dismissSeconds}s`} />
            </>
          )}

          <Row label="Sound" value={s.playSound ? 'On' : 'Off'} />

          <div className="border-t border-gray-200 pt-3">
            <Row label="Total session" value={totalTime} bold />
          </div>
        </dl>
      </div>

      <Button onClick={onBegin} className="w-full py-4 text-xl">
        Begin Session
      </Button>
    </div>
  );
}

function Row({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={bold ? 'font-semibold text-gray-800' : 'text-gray-500'}>
        {label}
      </dt>
      <dd
        className={`text-right ${bold ? 'font-bold text-indigo-600' : 'font-medium text-gray-800'}`}
      >
        {value}
      </dd>
    </div>
  );
}
