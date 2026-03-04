'use client';

import { useState } from 'react';
import type { Settings, PresetSlot, MindfulnessScope } from '@/lib/types';
import { formatNum } from '@/lib/format';
import { getPresetSlots, savePreset, listPresetsForMode, renamePreset, deletePreset } from '@/lib/storage';
import { generatePresetName } from '@/lib/defaults';
import Button from '../ui/Button';

interface SettingsUpdatedProps {
  settings: Settings;
  onBegin: () => void;
  onSchedule: () => void;
  onSaveAsDefault: (s: Settings) => void;
  onBack: () => void;
  onCustomize: () => void;
  onLoadPreset: (settings: Settings) => void;
}

const MODE_NAMES: Record<string, string> = {
  mindfulness: 'Mindfulness Prompts',
  pomodoro: 'Pomodoro Timer',
  both: 'Mindfulness Prompts in Work Sessions',
};

type SubView = null | 'preset-naming' | 'preset-slots' | 'save-default-confirm';

export default function SettingsUpdated({
  settings: s,
  onBegin,
  onSchedule,
  onSaveAsDefault,
  onBack,
  onCustomize,
  onLoadPreset,
}: SettingsUpdatedProps) {
  const { mode } = s;
  const modeName = MODE_NAMES[mode] ?? mode;

  const autoName = generatePresetName(s.mode, s);

  const [subView, setSubView] = useState<SubView>(null);
  const [presetName, setPresetName] = useState(autoName);
  const [savedSlot, setSavedSlot] = useState<PresetSlot | null>(null);
  const [savedPresetName, setSavedPresetName] = useState('');
  const [confirmOverwrite, setConfirmOverwrite] = useState<PresetSlot | null>(null);
  const presetSlots = (subView === 'preset-slots' || confirmOverwrite !== null) ? getPresetSlots(mode) : [];

  // Post-save preset list state
  const [postSavePresets, setPostSavePresets] = useState<ReturnType<typeof listPresetsForMode>>([]);
  const [postSaveRenamingSlot, setPostSaveRenamingSlot] = useState<PresetSlot | null>(null);
  const [postSaveRenameValue, setPostSaveRenameValue] = useState('');
  const [postSaveConfirmDeleteSlot, setPostSaveConfirmDeleteSlot] = useState<PresetSlot | null>(null);
  const [postSaveSelectedSlot, setPostSaveSelectedSlot] = useState<PresetSlot | null>(null);
  const [postSaveSelectedName, setPostSaveSelectedName] = useState('');

  const refreshPostSavePresets = () => setPostSavePresets(listPresetsForMode(mode));

  const handleSavePreset = (slot: PresetSlot) => {
    const name = presetName.trim() || autoName;
    savePreset(slot, { name, mode: s.mode, settings: s });
    setSavedSlot(slot);
    setSavedPresetName(name);
    setPostSaveSelectedSlot(slot);
    setPostSaveSelectedName(name);
    setPostSavePresets(listPresetsForMode(s.mode));
    setConfirmOverwrite(null);
    setSubView(null);
  };

  const handleSlotClick = (slot: PresetSlot, hasExisting: boolean) => {
    if (hasExisting) {
      setConfirmOverwrite(slot);
    } else {
      handleSavePreset(slot);
    }
  };

  // ── Overwrite confirmation ──
  if (confirmOverwrite !== null) {
    const existing = presetSlots.find(({ slot }) => slot === confirmOverwrite);
    return (
      <div className="space-y-6">
        <button
          onClick={() => setConfirmOverwrite(null)}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          &larr; Back
        </button>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
          <p className="text-sm font-semibold text-amber-900">Overwrite existing preset?</p>
          <p className="text-sm text-amber-800">
            Slot <strong>{confirmOverwrite}</strong> already contains{' '}
            <strong>&ldquo;{existing?.preset?.name ?? 'a preset'}&rdquo;</strong>.
            This will permanently replace it.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => handleSavePreset(confirmOverwrite)}
              className="flex-1 !bg-amber-600 hover:!bg-amber-700"
            >
              Overwrite
            </Button>
            <Button
              onClick={() => setConfirmOverwrite(null)}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Preset naming step ──
  if (subView === 'preset-naming') {
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
          <p className="mt-1 text-gray-500">Step 1 of 2: Name your preset</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preset name</label>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder={autoName}
            className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <Button onClick={() => setSubView('preset-slots')} className="w-full">
          Next: Choose a slot &rarr;
        </Button>
      </div>
    );
  }

  // ── Preset slot picker step ──
  if (subView === 'preset-slots') {
    const displayName = presetName.trim() || autoName;
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSubView('preset-naming')}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          &larr; Back to naming
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Save Preset</h2>
          <p className="mt-1 text-gray-500">Step 2 of 2: Choose a slot</p>
          <p className="mt-1 text-sm font-medium text-indigo-600">Saving as: &ldquo;{displayName}&rdquo;</p>
        </div>

        <div className="space-y-2">
          {presetSlots.map(({ slot, preset }) => (
            <button
              key={slot}
              onClick={() => handleSlotClick(slot, !!preset)}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-left hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
            >
              <span className="font-medium text-gray-700">{slot}</span>
              {preset ? (
                <span className="ml-3 text-sm text-amber-600">
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

  // ── Post-save view (DefaultsReview-style layout) ──
  if (savedSlot !== null) {
    const indicator = { slot: postSaveSelectedSlot ?? savedSlot, name: postSaveSelectedName || savedPresetName };

    const handlePostSaveLoad = (slot: PresetSlot) => {
      const preset = postSavePresets.find((p) => p.slot === slot);
      if (preset) {
        onLoadPreset(preset.preset.settings);
        setPostSaveSelectedSlot(slot);
        setPostSaveSelectedName(preset.preset.name);
      }
    };

    const handlePostSaveStartRename = (slot: PresetSlot, currentName: string) => {
      setPostSaveRenamingSlot(slot);
      setPostSaveRenameValue(currentName);
      setPostSaveConfirmDeleteSlot(null);
    };

    const handlePostSaveSaveRename = (slot: PresetSlot) => {
      const trimmed = postSaveRenameValue.trim();
      if (trimmed) {
        renamePreset(slot, trimmed);
        if (slot === indicator.slot) setPostSaveSelectedName(trimmed);
        refreshPostSavePresets();
      }
      setPostSaveRenamingSlot(null);
    };

    const handlePostSaveDelete = (slot: PresetSlot) => {
      if (postSaveConfirmDeleteSlot === slot) {
        deletePreset(slot);
        if (slot === indicator.slot) {
          setPostSaveSelectedSlot(null);
          setPostSaveSelectedName('');
        }
        refreshPostSavePresets();
        setPostSaveConfirmDeleteSlot(null);
      } else {
        setPostSaveConfirmDeleteSlot(slot);
        setPostSaveRenamingSlot(null);
      }
    };

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
            <span className="text-gray-400 font-normal text-xl"> Mode</span>
          </h2>
          <p className="mt-1 text-gray-500">Current settings</p>
          {indicator.slot && indicator.name && (
            <p className="mt-1 text-sm text-indigo-600">
              Preset selected: {indicator.slot} — {indicator.name}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <dl className="space-y-3">
            {(mode === 'pomodoro' || mode === 'both') && (
              <>
                <SettingRow label="Work periods" value={`${formatNum(s.workMinutes)} minutes`} />
                <SettingRow label="Breaks" value={`${formatNum(s.breakMinutes)} minutes`} />
                {s.hardBreak && <SettingRow label="Lock screen during breaks" value="Yes" />}
                <SettingRow label="Periods per set" value={s.sessionsPerSet === 0 ? '∞ (unlimited)' : String(s.sessionsPerSet)} />
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
                {mode === 'both' && (
                  <SettingRow label="Mindfulness shows" value={scopeLabel(s.bothMindfulnessScope)} />
                )}
              </>
            )}
            <SettingRow label="Sound" value={s.playSound ? 'On' : 'Off'} />
          </dl>
        </div>

        {postSavePresets.length > 0 && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="mb-3 text-sm font-semibold text-indigo-700">Saved presets</p>
            <div className="space-y-2">
              {postSavePresets.map(({ slot, preset }) => (
                <div
                  key={slot}
                  className="rounded-lg border border-indigo-200 bg-white px-3 py-2"
                >
                  {postSaveRenamingSlot === slot ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={postSaveRenameValue}
                        onChange={(e) => setPostSaveRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handlePostSaveSaveRename(slot);
                          if (e.key === 'Escape') setPostSaveRenamingSlot(null);
                        }}
                        autoFocus
                        className="flex-1 rounded border border-indigo-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        onClick={() => handlePostSaveSaveRename(slot)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setPostSaveRenamingSlot(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePostSaveLoad(slot)}
                        className="flex-1 text-left text-sm"
                      >
                        <span className="font-medium text-gray-700">{slot}</span>
                        <span className="mx-2 text-gray-400">&mdash;</span>
                        <span className="text-gray-600">{preset.name}</span>
                      </button>
                      <button
                        onClick={() => handlePostSaveStartRename(slot, preset.name)}
                        className="text-xs text-gray-400 hover:text-indigo-600"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => handlePostSaveDelete(slot)}
                        className={`text-xs font-medium ${
                          postSaveConfirmDeleteSlot === slot
                            ? 'text-red-600 hover:text-red-800'
                            : 'text-gray-400 hover:text-red-500'
                        }`}
                      >
                        {postSaveConfirmDeleteSlot === slot ? 'Confirm?' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button onClick={onBegin} className="w-full text-lg">
            Start Session
          </Button>
          <Button onClick={onSchedule} variant="secondary" className="w-full">
            Schedule Start Time
          </Button>
          <Button onClick={onCustomize} variant="secondary" className="w-full">
            Change Settings
          </Button>
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

      {/* Settings summary */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <dl className="space-y-3">
          {(mode === 'pomodoro' || mode === 'both') && (
            <>
              <SettingRow label="Work periods" value={`${formatNum(s.workMinutes)} minutes`} />
              <SettingRow label="Breaks" value={`${formatNum(s.breakMinutes)} minutes`} />
              {s.hardBreak && <SettingRow label="Lock screen during breaks" value="Yes" />}
              <SettingRow label="Periods per set" value={s.sessionsPerSet === 0 ? '∞ (unlimited)' : String(s.sessionsPerSet)} />
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
        {!savedSlot && (
          <Button
            onClick={() => {
              setPresetName(autoName);
              setSavedSlot(null);
              setConfirmOverwrite(null);
              setSubView('preset-naming');
            }}
            variant="secondary"
            className="w-full"
          >
            Save as a Preset
          </Button>
        )}

        {!savedSlot && subView !== 'save-default-confirm' && (
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

function scopeLabel(scope: MindfulnessScope | undefined): string {
  switch (scope) {
    case 'breaks':      return 'Intervals + at each break';
    case 'work-starts': return 'Intervals + returning from breaks';
    case 'all':         return 'All popups';
    default:            return 'At work intervals only';
  }
}
