'use client';

import { useState } from 'react';
import type { Settings, PresetSlot } from '@/lib/types';
import { listPresetsForMode, renamePreset, deletePreset, clearDefaultsForMode } from '@/lib/storage';
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
  // Local copy of presets so rename/delete updates are reflected immediately
  const [presets, setPresets] = useState(() => listPresetsForMode(mode));

  // Rename state
  const [renamingSlot, setRenamingSlot] = useState<PresetSlot | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Delete confirmation state
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<PresetSlot | null>(null);

  const refreshPresets = () => setPresets(listPresetsForMode(mode));

  const handleLoad = (slot: PresetSlot) => {
    const preset = presets.find((p) => p.slot === slot);
    if (preset) {
      onLoadPreset(preset.preset.settings);
      setShowPresets(false);
    }
  };

  const handleStartRename = (slot: PresetSlot, currentName: string) => {
    setRenamingSlot(slot);
    setRenameValue(currentName);
    setConfirmDeleteSlot(null);
  };

  const handleSaveRename = (slot: PresetSlot) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      renamePreset(slot, trimmed);
      refreshPresets();
    }
    setRenamingSlot(null);
  };

  const handleDelete = (slot: PresetSlot) => {
    if (confirmDeleteSlot === slot) {
      deletePreset(slot);
      refreshPresets();
      setConfirmDeleteSlot(null);
    } else {
      setConfirmDeleteSlot(slot);
      setRenamingSlot(null);
    }
  };

  const handleFactoryReset = () => {
    clearDefaultsForMode(mode);
    onBack();
  };

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
                  <SettingRow
                    label="Number of sets"
                    value={settings.numberOfSets === 0 ? 'Unlimited' : String(settings.numberOfSets)}
                  />
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
              {mode === 'mindfulness' && (
                <SettingRow
                  label="Runs"
                  value={settings.promptCount > 0
                    ? `${settings.promptCount} prompt${settings.promptCount !== 1 ? 's' : ''} then stops`
                    : 'Indefinitely (until stopped)'}
                />
              )}
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
                <div
                  key={slot}
                  className="rounded-lg border border-indigo-200 bg-white px-3 py-2"
                >
                  {renamingSlot === slot ? (
                    /* Inline rename editor */
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(slot);
                          if (e.key === 'Escape') setRenamingSlot(null);
                        }}
                        autoFocus
                        className="flex-1 rounded border border-indigo-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(slot)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setRenamingSlot(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    /* Normal row */
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLoad(slot)}
                        className="flex-1 text-left text-sm"
                      >
                        <span className="font-medium text-gray-700">{slot}</span>
                        <span className="mx-2 text-gray-400">&mdash;</span>
                        <span className="text-gray-600">{preset.name}</span>
                      </button>
                      <button
                        onClick={() => handleStartRename(slot, preset.name)}
                        className="text-xs text-gray-400 hover:text-indigo-600"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => handleDelete(slot)}
                        className={`text-xs font-medium ${
                          confirmDeleteSlot === slot
                            ? 'text-red-600 hover:text-red-800'
                            : 'text-gray-400 hover:text-red-500'
                        }`}
                      >
                        {confirmDeleteSlot === slot ? 'Confirm?' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              setShowPresets(false);
              setRenamingSlot(null);
              setConfirmDeleteSlot(null);
            }}
            className="mt-3 text-sm text-indigo-600 hover:text-indigo-800"
          >
            Close
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
        <button
          onClick={handleFactoryReset}
          className="text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Reset to factory defaults
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
