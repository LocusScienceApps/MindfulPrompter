'use client';

import { useState } from 'react';
import type { Settings, PresetSlot } from '@/lib/types';
import { formatNum } from '@/lib/format';
import { getPresetSlots, savePreset } from '@/lib/storage';
import { generatePresetName } from '@/lib/defaults';
import Button from '../ui/Button';

interface SettingsUpdatedProps {
  settings: Settings;
  onBegin: () => void;
  onSchedule: () => void;
  onSaveAsDefault: (s: Settings) => void;
  onBack: () => void;
}

const MODE_NAMES: Record<string, string> = {
  mindfulness: 'Mindfulness Prompts',
  pomodoro: 'Pomodoro Timer',
  both: 'Both Together',
};

type SubView = null | 'preset-picker' | 'save-default-confirm';

export default function SettingsUpdated({
  settings: s,
  onBegin,
  onSchedule,
  onSaveAsDefault,
  onBack,
}: SettingsUpdatedProps) {
  const { mode } = s;
  const modeName = MODE_NAMES[mode] ?? mode;

  const [subView, setSubView] = useState<SubView>(null);
  const [presetName, setPresetName] = useState('');
  const [savedSlot, setSavedSlot] = useState<PresetSlot | null>(null);

  const presetSlots = subView === 'preset-picker' ? getPresetSlots(mode) : [];

  const handleSavePreset = (slot: PresetSlot) => {
    const name = presetName.trim() || generatePresetName(s.mode, s);
    savePreset(slot, { name, mode: s.mode, settings: s });
    setSavedSlot(slot);
    setSubView(null);
  };

  // ── Preset picker sub-view ──
  if (subView === 'preset-picker') {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSubView(null)}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          &larr; Back
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Save Preset</h2>
          <p className="mt-1 text-gray-500">Choose a slot and give it a name</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preset name</label>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder={generatePresetName(s.mode, s)}
            className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-2">
          {presetSlots.map(({ slot, preset }) => (
            <button
              key={slot}
              onClick={() => handleSavePreset(slot)}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-left hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
            >
              <span className="font-medium text-gray-700">{slot}</span>
              {preset ? (
                <span className="ml-3 text-sm text-gray-500">
                  Overwrite &ldquo;{preset.name}&rdquo;
                </span>
              ) : (
                <span className="ml-3 text-sm text-gray-400">Empty slot</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Main view ──
  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm text-indigo-600 hover:text-indigo-800"
      >
        &larr; Back to settings
      </button>

      <div className="text-center">
        <h2 className="text-2xl font-bold leading-tight">
          <span className="text-indigo-600">{modeName}</span>
          <span className="text-gray-700 font-medium"> Mode Settings Updated</span>
        </h2>
        <p className="mt-1 text-gray-500">
          Here are your updated {modeName} Mode settings:
        </p>
      </div>

      {savedSlot && (
        <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-200">
          Preset saved to slot {savedSlot}.
        </p>
      )}

      {/* Settings summary */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <dl className="space-y-3">
          {(mode === 'pomodoro' || mode === 'both') && (
            <>
              <SettingRow label="Work sessions" value={`${formatNum(s.workMinutes)} minutes`} />
              <SettingRow label="Breaks" value={`${formatNum(s.breakMinutes)} minutes`} />
              <SettingRow label="Sessions before finishing" value={String(s.sessionsPerSet)} />
              {s.multipleSets && (
                <>
                  <SettingRow label="Long break" value={`${formatNum(s.longBreakMinutes)} minutes`} />
                  <SettingRow
                    label="Number of sets"
                    value={s.numberOfSets === 0 ? 'Unlimited' : String(s.numberOfSets)}
                  />
                </>
              )}
            </>
          )}

          {(mode === 'mindfulness' || mode === 'both') && (
            <>
              <SettingRow label="Mindfulness prompt" value={`"${s.promptText}"`} />
              <SettingRow label="Prompt every" value={`${formatNum(s.promptIntervalMinutes)} minutes`} />
              <SettingRow label="Dismiss delay" value={`${s.dismissSeconds} seconds`} />
              {mode === 'mindfulness' && (
                <SettingRow
                  label="Runs"
                  value={
                    s.promptCount > 0
                      ? `${s.promptCount} prompt${s.promptCount !== 1 ? 's' : ''} then stops`
                      : 'Indefinitely (until stopped)'
                  }
                />
              )}
            </>
          )}

          <SettingRow label="Sound" value={s.playSound ? 'On' : 'Off'} />
        </dl>
      </div>

      <p className="text-center text-sm font-medium text-gray-600">
        What would you like to do?
      </p>

      {/* Save as Default confirmation */}
      {subView === 'save-default-confirm' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm text-amber-900">
            This will replace your current defaults for this mode. Your new defaults will be used
            for all future sessions unless you reset them.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setSubView(null);
                onSaveAsDefault(s);
              }}
              className="flex-1"
            >
              Confirm
            </Button>
            <Button
              onClick={() => setSubView(null)}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button
          onClick={() => {
            setPresetName(generatePresetName(s.mode, s));
            setSavedSlot(null);
            setSubView('preset-picker');
          }}
          variant="secondary"
          className="w-full"
        >
          Save as a Preset
        </Button>

        {subView !== 'save-default-confirm' && (
          <Button
            onClick={() => setSubView('save-default-confirm')}
            variant="secondary"
            className="w-full"
          >
            Save as Default
          </Button>
        )}

        <Button onClick={onBegin} className="w-full">
          Start Session (use new settings for this session only)
        </Button>

        <Button onClick={onSchedule} variant="secondary" className="w-full">
          Schedule Start Time (use new settings for this session only)
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
