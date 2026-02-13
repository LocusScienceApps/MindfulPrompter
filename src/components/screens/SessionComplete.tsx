'use client';

import type { Settings } from '@/lib/types';
import Button from '../ui/Button';

interface SessionCompleteProps {
  settings: Settings;
  onStartAgain: () => void;
  onNewSession: () => void;
}

export default function SessionComplete({
  settings,
  onStartAgain,
  onNewSession,
}: SessionCompleteProps) {
  return (
    <div className="space-y-8 text-center">
      <div>
        <div className="text-5xl">🎉</div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          Great Work!
        </h2>
        <p className="mt-2 text-gray-500">Your session is complete.</p>
      </div>

      {/* Show the mindfulness prompt one last time */}
      {(settings.mode === 'mindfulness' || settings.mode === 'both') &&
        settings.promptText && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
            <p className="text-lg italic text-indigo-800">
              &ldquo;{settings.promptText}&rdquo;
            </p>
          </div>
        )}

      <div className="flex flex-col gap-3">
        <Button onClick={onStartAgain} className="w-full text-lg">
          Start Again (same settings)
        </Button>
        <Button onClick={onNewSession} variant="secondary" className="w-full">
          New Session
        </Button>
      </div>
    </div>
  );
}
