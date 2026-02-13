'use client';

import type { Settings } from '@/lib/types';
import { formatNum } from '@/lib/format';
import Button from '../ui/Button';

interface DefaultsReviewProps {
  settings: Settings;
  onStart: () => void;
  onCustomize: () => void;
  onBack: () => void;
}

export default function DefaultsReview({
  settings,
  onStart,
  onCustomize,
  onBack,
}: DefaultsReviewProps) {
  const { mode } = settings;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm text-indigo-600 hover:text-indigo-800"
      >
        &larr; Back
      </button>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Default Settings</h2>
        <p className="mt-1 text-gray-500">
          {mode === 'mindfulness' && 'Mindfulness Prompts'}
          {mode === 'pomodoro' && 'Pomodoro Timer'}
          {mode === 'both' && 'Pomodoro + Mindfulness'}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <dl className="space-y-3">
          {/* Pomodoro settings */}
          {(mode === 'pomodoro' || mode === 'both') && (
            <>
              <SettingRow label="Work sessions" value={`${formatNum(settings.workMinutes)} minutes`} />
              <SettingRow label="Breaks" value={`${formatNum(settings.breakMinutes)} minutes`} />
              <SettingRow label="Sessions before finishing" value={String(settings.sessionsPerSet)} />
              {settings.multipleSets && (
                <>
                  <SettingRow label="Long break" value={`${formatNum(settings.longBreakMinutes)} minutes`} />
                  <SettingRow label="Number of sets" value={String(settings.numberOfSets)} />
                </>
              )}
            </>
          )}

          {/* Mindfulness settings */}
          {(mode === 'mindfulness' || mode === 'both') && (
            <>
              <SettingRow
                label="Mindfulness prompt"
                value={`"${settings.promptText}"`}
              />
              <SettingRow
                label="Prompt every"
                value={`${formatNum(settings.promptIntervalMinutes)} minutes`}
              />
              <SettingRow
                label="Dismiss delay"
                value={`${settings.dismissSeconds} seconds`}
              />
            </>
          )}

          <SettingRow label="Sound" value={settings.playSound ? 'On' : 'Off'} />
        </dl>
      </div>

      <div className="flex flex-col gap-3">
        <Button onClick={onStart} className="w-full text-lg">
          Start with these settings
        </Button>
        <Button onClick={onCustomize} variant="secondary" className="w-full">
          Customize
        </Button>
      </div>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-800 text-right">{value}</dd>
    </div>
  );
}
