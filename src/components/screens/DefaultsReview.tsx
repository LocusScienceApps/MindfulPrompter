'use client';

import { useState } from 'react';
import type { Settings } from '@/lib/types';
import { listPresetsForMode } from '@/lib/storage';
import { formatNum } from '@/lib/format';
import Button from '../ui/Button';

interface DefaultsReviewProps {
  settings: Settings;
  onStart: () => void;
  onCustomize: () => void;
  onEditDefaults: () => void;
  onLoadPreset: (settings: Settings) => void;
  onBack: () => void;
}

export default function DefaultsReview({
  settings,
  onStart,
  onCustomize,
  onEditDefaults,
  onLoadPreset,
  onBack,
}: DefaultsReviewProps) {
  const { mode } = settings;
  const [showPresets, setShowPresets] = useState(false);

  const presets = listPresetsForMode(mode);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm text-indigo-600 hover:text-indigo-800"
      >
        &larr; Back
      </button>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {mode === 'mindfulness' && 'Mindfulness Mode'}
          {mode === 'pomodoro' && 'Pomodoro Mode'}
          {mode === 'both' && 'Pomodoro + Mindfulness'}
        </h2>
        <p className="mt-1 text-gray-500">Current settings</p>
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

      {/* Preset list (inline, shown when toggled) */}
      {showPresets && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="mb-3 text-sm font-semibold text-indigo-700">Saved presets</p>
          {presets.length === 0 ? (
            <p className="text-sm text-gray-500">No presets saved for this mode yet.</p>
          ) : (
            <div className="space-y-2">
              {presets.map(({ slot, preset }) => (
                <button
                  key={slot}
                  onClick={() => {
                    onLoadPreset(preset.settings);
                    setShowPresets(false);
                  }}
                  className="w-full rounded-lg border border-indigo-200 bg-white px-4 py-2 text-left text-sm hover:border-indigo-400 hover:bg-indigo-50"
                >
                  <span className="font-medium text-gray-800">{slot}</span>
                  <span className="mx-2 text-gray-400">&mdash;</span>
                  <span className="text-gray-600">{preset.name}</span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowPresets(false)}
            className="mt-3 text-sm text-indigo-600 hover:text-indigo-800"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button onClick={onStart} className="w-full text-lg">
          Start
        </Button>
        <Button onClick={onCustomize} variant="secondary" className="w-full">
          Customize for this session
        </Button>
        {presets.length > 0 && !showPresets && (
          <Button
            onClick={() => setShowPresets(true)}
            variant="secondary"
            className="w-full"
          >
            Load preset
          </Button>
        )}
        <button
          onClick={onEditDefaults}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Edit defaults for this mode
        </button>
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
