'use client';

import type { Settings, SessionStats } from '@/lib/types';
import { formatSummaryTime, formatNum } from '@/lib/format';
import Button from '../ui/Button';

interface SessionCompleteProps {
  settings: Settings;
  stats: SessionStats | null;
  onStartAgain: () => void;
  onNewSession: () => void;
}

export default function SessionComplete({
  settings,
  stats,
  onStartAgain,
  onNewSession,
}: SessionCompleteProps) {
  const isPomoMode = settings.useTimedWork;

  return (
    <div className="space-y-8 text-center">

      {/* Heading */}
      {isPomoMode ? (
        <PomoHeading setsCompleted={stats?.setsCompleted ?? 0} />
      ) : (
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Great Work!</h2>
          <p className="mt-2 text-gray-500">Your session is complete.</p>
        </div>
      )}


      {/* Summary */}
      {isPomoMode ? (
        <PomoSummary settings={settings} stats={stats} />
      ) : (
        /* Mindfulness-only stats */
        stats && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <dl className="space-y-3">
              {stats.promptsCompleted > 0 && (
                <StatRow
                  label="Prompts completed"
                  value={String(stats.promptsCompleted)}
                />
              )}
              {stats.totalElapsedSeconds > 0 && (
                <StatRow
                  label="Total time"
                  value={formatSummaryTime(stats.totalElapsedSeconds)}
                />
              )}
            </dl>
          </div>
        )
      )}

      <div className="flex flex-col gap-3">
        <Button onClick={onStartAgain} className="w-full text-lg">
          Start again (same settings)
        </Button>
        <Button onClick={onNewSession} variant="secondary" className="w-full">
          New session
        </Button>
      </div>
    </div>
  );
}

// ── Pomodoro / Both heading ───────────────────────────────────────────────────

function PomoHeading({ setsCompleted }: { setsCompleted: number }) {
  if (setsCompleted > 1) {
    return (
      <h2 className="text-2xl font-bold text-gray-900">
        Congratulations! You&apos;ve just completed a{' '}
        <strong>{setsCompleted}-set</strong> Pomodoro session!
      </h2>
    );
  }
  return (
    <h2 className="text-2xl font-bold text-gray-900">
      Congratulations! You&apos;ve just completed a Pomodoro session!
    </h2>
  );
}

// ── Pomodoro / Both summary text ──────────────────────────────────────────────

function PomoSummary({
  settings,
  stats,
}: {
  settings: Settings;
  stats: SessionStats | null;
}) {
  if (!stats) return null;

  const { workMinutes, breakMinutes, longBreakMinutes, sessionsPerSet } = settings;
  const { setsCompleted, totalElapsedSeconds } = stats;

  const multiSet = setsCompleted > 1;
  const multiPeriod = sessionsPerSet > 1;

  // Set duration: N periods × work + (N-1) breaks
  const setDurationSec =
    sessionsPerSet * workMinutes * 60 + (sessionsPerSet - 1) * breakMinutes * 60;

  const workLabel = `${formatNum(workMinutes)}-min`;
  const breakLabel = `${formatNum(breakMinutes)}-min`;
  const longBreakLabel = `${formatNum(longBreakMinutes)}-min`;
  const periodWord = sessionsPerSet === 1 ? 'period' : 'periods';
  const breakCount = sessionsPerSet - 1;
  const longBreakCount = setsCompleted - 1;

  const totalStr = formatSummaryTime(totalElapsedSeconds);
  const setTotalStr = formatSummaryTime(setDurationSec);

  return (
    <div className="space-y-2 text-gray-700 text-base leading-relaxed">
      {multiSet ? (
        <>
          {/* Line 1: set period description */}
          {multiPeriod ? (
            <p>
              Each set comprised <strong>{sessionsPerSet}</strong>{' '}
              <em>{workLabel}</em> work {periodWord} separated by{' '}
              <strong>{breakCount}</strong> <em>{breakLabel}</em>{' '}
              {breakCount === 1 ? 'break' : 'breaks'}.
            </p>
          ) : (
            <p>
              Each set comprised <strong>1</strong>{' '}
              <em>{workLabel}</em> work period.
            </p>
          )}

          {/* Line 2: set total */}
          <p>That&apos;s a total of <strong>{setTotalStr}</strong> per set.</p>

          {/* Line 3: sets + long breaks */}
          <p>
            The Pomodoro session comprised <strong>{setsCompleted}</strong> sets
            separated by <strong>{longBreakCount}</strong>{' '}
            <em>{longBreakLabel}</em>{' '}
            {longBreakCount === 1 ? 'long break' : 'long breaks'}.
          </p>

          {/* Line 4: session total */}
          <p>
            That&apos;s a total of <strong>{totalStr}</strong>.{' '}
            Congratulations again!
          </p>
        </>
      ) : multiPeriod ? (
        <>
          {/* Single set, multiple periods */}
          <p>
            Your Pomodoro session comprised <strong>{sessionsPerSet}</strong>{' '}
            <em>{workLabel}</em> work {periodWord} separated by{' '}
            <strong>{breakCount}</strong> <em>{breakLabel}</em>{' '}
            {breakCount === 1 ? 'break' : 'breaks'}.
          </p>
          <p>
            That&apos;s a total of <strong>{totalStr}</strong>.{' '}
            Congratulations again!
          </p>
        </>
      ) : (
        /* Single set, single period */
        <p>
          Your Pomodoro session comprised <strong>1</strong>{' '}
          <em>{workLabel}</em> work period. Congratulations again!
        </p>
      )}
    </div>
  );
}

// ── Shared stat row (mindfulness mode only) ───────────────────────────────────

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-800">{value}</dd>
    </div>
  );
}
