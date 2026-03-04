'use client';

import { useState, useEffect, useRef } from 'react';
import type { Settings, PresetSlot } from '@/lib/types';
import { listPresetsForMode, renamePreset, deletePreset } from '@/lib/storage';
import { formatNum } from '@/lib/format';
import Button from '../ui/Button';

interface DefaultsReviewProps {
  settings: Settings;
  onStart: () => void;
  onSchedule: () => void;
  onCustomize: () => void;
  onLoadPreset: (settings: Settings) => void;
  onBack: () => void;
}

const MODE_NAMES: Record<string, string> = {
  mindfulness: 'Mindfulness Prompts',
  pomodoro: 'Pomodoro Timer',
  both: 'Mindfulness Prompts in Work Sessions',
};

export default function DefaultsReview({
  settings,
  onStart,
  onSchedule,
  onCustomize,
  onLoadPreset,
  onBack,
}: DefaultsReviewProps) {
  const { mode } = settings;
  const [presets, setPresets] = useState(() => listPresetsForMode(mode));
  const [renamingSlot, setRenamingSlot] = useState<PresetSlot | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<PresetSlot | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<{ slot: PresetSlot; name: string } | null>(null);

  const refreshPresets = () => setPresets(listPresetsForMode(mode));

  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
      onStartRef.current();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleLoad = (slot: PresetSlot) => {
    const preset = presets.find((p) => p.slot === slot);
    if (preset) {
      onLoadPreset(preset.preset.settings);
      setSelectedPreset({ slot, name: preset.preset.name });
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

  const modeName = MODE_NAMES[mode] ?? mode;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm text-indigo-600 hover:text-indigo-800"
      >
        &larr; Back
      </button>

      <div className="text-center">
        <h2 className="text-2xl font-bold leading-tight">
          <span className="text-indigo-600">{modeName}</span>
          <span className="text-gray-400 font-normal text-xl"> Mode</span>
        </h2>
        <p className="mt-1 text-gray-500">Current settings</p>
        {selectedPreset && (
          <p className="mt-1 text-sm text-indigo-600">
            Preset selected: {selectedPreset.slot} — {selectedPreset.name}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <dl className="space-y-3">
          {(mode === 'pomodoro' || mode === 'both') && (
            <>
              <SettingRow label="Work periods" value={`${formatNum(settings.workMinutes)} minutes`} />
              <SettingRow label="Breaks" value={`${formatNum(settings.breakMinutes)} minutes`} />
              {settings.hardBreak && <SettingRow label="Lock screen during breaks" value="Yes" />}
              <SettingRow label="Periods per set" value={settings.sessionsPerSet === 0 ? '∞ (unlimited)' : String(settings.sessionsPerSet)} />
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

          {(mode === 'mindfulness' || mode === 'both') && (
            <>
              <SettingRow label="Mindfulness prompt" value={`"${settings.promptText}"`} />
              <SettingRow label="Prompt every" value={`${formatNum(settings.promptIntervalMinutes)} minutes`} />
              <SettingRow label="Dismiss delay" value={`${settings.dismissSeconds} seconds`} />
              {mode === 'mindfulness' && (
                <SettingRow
                  label="Runs"
                  value={
                    settings.promptCount > 0
                      ? `${settings.promptCount} prompt${settings.promptCount !== 1 ? 's' : ''} then stops`
                      : 'Indefinitely (until stopped)'
                  }
                />
              )}
            </>
          )}

          <SettingRow label="Sound" value={settings.playSound ? 'On' : 'Off'} />

          {/* Popup labels — only shown when at least one is customized */}
          {(() => {
            const labels: { label: string; value: string }[] = [];
            if (mode === 'mindfulness' || mode === 'both') {
              if (settings.popupLabelMindfulness) labels.push({ label: 'Mindfulness prompt popup', value: settings.popupLabelMindfulness });
            }
            if (mode === 'pomodoro' || mode === 'both') {
              if (settings.popupLabelWorkStart) labels.push({ label: 'Work period start popup', value: settings.popupLabelWorkStart });
              if (settings.popupLabelShortBreak) labels.push({ label: 'Short break popup', value: settings.popupLabelShortBreak });
              if (settings.multipleSets && settings.popupLabelLongBreak) labels.push({ label: 'Long break popup', value: settings.popupLabelLongBreak });
              if (settings.popupLabelSessionDone) labels.push({ label: 'Session finished popup', value: settings.popupLabelSessionDone });
            }
            if (labels.length === 0) return null;
            return (
              <>
                <div className="pt-1 pb-0.5">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Popup labels</span>
                </div>
                {labels.map(({ label, value }) => (
                  <SettingRow key={label} label={label} value={`"${value}"`} />
                ))}
              </>
            );
          })()}
        </dl>
      </div>

      {/* Preset list — always visible when presets exist */}
      {presets.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="mb-3 text-sm font-semibold text-indigo-700">Saved presets</p>
          <div className="space-y-2">
            {presets.map(({ slot, preset }) => (
              <div
                key={slot}
                className="rounded-lg border border-indigo-200 bg-white px-3 py-2"
              >
                {renamingSlot === slot ? (
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
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button onClick={onStart} className="w-full text-lg">
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

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-800 text-right">{value}</dd>
    </div>
  );
}
