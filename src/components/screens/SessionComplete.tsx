'use client';

import { useState, useEffect } from 'react';
import type { Settings, SessionStats } from '@/lib/types';
import { formatDuration } from '@/lib/format';
import Button from '../ui/Button';

const AUTO_DISMISS_SECONDS = 60;

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
  const [countdown, setCountdown] = useState(AUTO_DISMISS_SECONDS);

  // 60-second auto-dismiss countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Navigate away once countdown hits 0 (kept separate so the state updater above
  // doesn't call a parent setter mid-render, which React 18 forbids)
  useEffect(() => {
    if (countdown === 0) onNewSession();
  }, [countdown, onNewSession]);

  const { mode } = settings;
  const showPomoStats = (mode === 'pomodoro' || mode === 'both') && stats && stats.sessionsCompleted > 0;
  const showPromptStats = (mode === 'mindfulness' || mode === 'both') && stats && stats.promptsCompleted > 0;
  const elapsedMinutes = stats ? stats.totalElapsedSeconds / 60 : 0;

  return (
    <div className="space-y-8 text-center">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Great Work!
        </h2>
        <p className="mt-2 text-gray-500">Your session is complete.</p>
      </div>

      {/* Show the mindfulness prompt */}
      {(mode === 'mindfulness' || mode === 'both') && settings.promptText && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <p className="text-lg italic text-indigo-800">
            &ldquo;{settings.promptText}&rdquo;
          </p>
        </div>
      )}

      {/* Session stats */}
      {stats && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <dl className="space-y-3">
            {showPomoStats && (
              <>
                <StatRow
                  label="Sessions completed"
                  value={
                    stats.setsCompleted > 1
                      ? `${stats.sessionsCompleted} (${stats.setsCompleted} sets)`
                      : String(stats.sessionsCompleted)
                  }
                />
                {stats.totalWorkMinutes > 0 && (
                  <StatRow
                    label="Total work time"
                    value={formatDuration(stats.totalWorkMinutes)}
                  />
                )}
              </>
            )}
            {showPromptStats && (
              <StatRow
                label="Prompts completed"
                value={String(stats.promptsCompleted)}
              />
            )}
            {elapsedMinutes > 0 && (
              <StatRow
                label="Total elapsed"
                value={formatDuration(elapsedMinutes)}
              />
            )}
          </dl>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button onClick={onStartAgain} className="w-full text-lg">
          Start again (same settings)
        </Button>
        <Button onClick={onNewSession} variant="secondary" className="w-full">
          New session
        </Button>
      </div>

      <p className="text-xs text-gray-400">
        Auto-closing in {countdown}s
      </p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-800">{value}</dd>
    </div>
  );
}
