'use client';

import { useState } from 'react';
import type { Settings } from '@/lib/types';
import {
  defaultBreakMinutes,
  defaultLongBreakMinutes,
  defaultPromptInterval,
  getDefaults,
} from '@/lib/defaults';
import { getDefaultsForMode } from '@/lib/storage';
import { formatNum } from '@/lib/format';
import { dividesEvenly, formatDivisorList } from '@/lib/validation';
import Button from '../ui/Button';

interface CustomizeProps {
  settings: Settings;
  onDone: (settings: Settings) => void;           // "Review Changes" → settings-updated
  onStartDirectly: (settings: Settings) => void;  // "No changes — Start Session"
  onResetToOriginal: () => void;                  // After reset confirmation → defaults-review
  onBack: () => void;
}

export default function Customize({
  settings: initial,
  onDone,
  onStartDirectly,
  onResetToOriginal,
  onBack,
}: CustomizeProps) {
  const [s, setS] = useState<Settings>({ ...initial });
  const [intervalError, setIntervalError] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const { mode } = s;

  const update = (partial: Partial<Settings>) => {
    setS((prev) => ({ ...prev, ...partial }));
    setIntervalError('');
  };

  // Is already on original (factory) defaults? True if no custom defaults are saved.
  const isOriginalDefaults = Object.keys(getDefaultsForMode(mode)).length === 0;

  // Has anything changed from what was loaded?
  const hasChanges = JSON.stringify(s) !== JSON.stringify(initial);

  // Derived defaults (update as dependent fields change)
  const derivedBreak = defaultBreakMinutes(s.workMinutes);
  const derivedLongBreak = defaultLongBreakMinutes(s.breakMinutes);
  const derivedInterval = defaultPromptInterval(s.workMinutes);

  // Factory defaults for placeholder hints
  const factory = getDefaults(mode);

  const handleAction = () => {
    // Validate prompt interval
    if (mode === 'both' && !dividesEvenly(s.workMinutes, s.promptIntervalMinutes)) {
      const suggestions = formatDivisorList(s.workMinutes);
      setIntervalError(
        `That doesn't fit evenly into your ${formatNum(s.workMinutes)}-minute work session. Try: ${suggestions}`
      );
      return;
    }
    if (mode === 'mindfulness' && !dividesEvenly(60, s.promptIntervalMinutes)) {
      const suggestions = formatDivisorList(60);
      setIntervalError(
        `That doesn't divide evenly into 60 minutes. Try: ${suggestions}`
      );
      return;
    }

    if (!hasChanges) {
      onStartDirectly(s);
    } else {
      onDone(s);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-indigo-600 hover:text-indigo-800">
          &larr; Back
        </button>
        {isOriginalDefaults ? (
          <span
            className="text-sm text-gray-300 cursor-default select-none"
            title="Already using original defaults."
          >
            Reset to original defaults
          </span>
        ) : (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-sm text-gray-400 hover:text-red-500 underline"
          >
            Reset to original defaults
          </button>
        )}
      </div>

      {/* Reset confirmation */}
      {showResetConfirm && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm text-red-800">
            This will reset all defaults for this mode to their original values. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowResetConfirm(false);
                onResetToOriginal();
              }}
              className="flex-1 !bg-red-600 hover:!bg-red-700"
            >
              Confirm
            </Button>
            <Button
              onClick={() => setShowResetConfirm(false)}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Pomodoro Settings ── */}
      {(mode === 'pomodoro' || mode === 'both') && (
        <Section title="Pomodoro Settings">
          <SettingField
            label="Work session length"
            helper={`Default: ${formatNum(factory.workMinutes)} minutes`}
          >
            <NumericInput
              value={s.workMinutes}
              defaultValue={factory.workMinutes}
              unit="minutes"
              onChange={(v) =>
                update({
                  workMinutes: v,
                  breakMinutes: defaultBreakMinutes(v),
                  longBreakMinutes: defaultLongBreakMinutes(defaultBreakMinutes(v)),
                  promptIntervalMinutes:
                    mode === 'both' ? defaultPromptInterval(v) : s.promptIntervalMinutes,
                })
              }
            />
          </SettingField>

          <SettingField
            label="Break length"
            helper={`Default: ${formatNum(derivedBreak)} minutes`}
          >
            <NumericInput
              value={s.breakMinutes}
              defaultValue={derivedBreak}
              unit="minutes"
              onChange={(v) =>
                update({ breakMinutes: v, longBreakMinutes: defaultLongBreakMinutes(v) })
              }
            />
          </SettingField>

          <SettingField
            label='Work sessions ("pomodoros") per set'
            helper="Default: 4"
          >
            <NumericInput
              value={s.sessionsPerSet}
              defaultValue={4}
              unit="sessions"
              integerOnly
              onChange={(v) => update({ sessionsPerSet: v })}
            />
          </SettingField>

          <SettingField label="Multiple sets with a longer break between?">
            <YesNoToggle
              value={s.multipleSets}
              yesLabel="Yes, multiple sets"
              noLabel="No, just one set"
              onChange={(v) => update({ multipleSets: v, numberOfSets: v ? 3 : 1 })}
            />
          </SettingField>

          {s.multipleSets && (
            <>
              <SettingField
                label="Long break between sets"
                helper={`Default: ${formatNum(derivedLongBreak)} minutes`}
              >
                <NumericInput
                  value={s.longBreakMinutes}
                  defaultValue={derivedLongBreak}
                  unit="minutes"
                  onChange={(v) => update({ longBreakMinutes: v })}
                />
              </SettingField>

              <SettingField
                label="Number of sets"
                helper="Default: 3. Enter 0 to run until you stop."
              >
                <NumericInput
                  value={s.numberOfSets}
                  defaultValue={3}
                  unit="sets"
                  integerOnly
                  allowZero
                  onChange={(v) => update({ numberOfSets: v })}
                />
                {s.numberOfSets === 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Session cycles sets indefinitely until you click Stop.
                  </p>
                )}
              </SettingField>
            </>
          )}
        </Section>
      )}

      {/* ── Mindfulness Prompt Settings ── */}
      {(mode === 'mindfulness' || mode === 'both') && (
        <Section title="Mindfulness Prompt Settings">
          <SettingField
            label="Mindfulness prompt"
            helper='Default: "Are you doing what you should be doing?"'
          >
            <textarea
              value={s.promptText}
              onChange={(e) => update({ promptText: e.target.value })}
              placeholder="Are you doing what you should be doing?"
              rows={3}
              className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-base transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </SettingField>

          <SettingField
            label="Prompt frequency"
            helper={
              mode === 'both'
                ? `Must fit evenly into your ${formatNum(s.workMinutes)}-minute work session. Default: ${formatNum(derivedInterval)} minutes.`
                : 'Must divide evenly into 60 minutes. Default: 15 minutes.'
            }
          >
            <NumericInput
              value={s.promptIntervalMinutes}
              defaultValue={mode === 'both' ? derivedInterval : 15}
              unit="minutes"
              onChange={(v) => {
                update({ promptIntervalMinutes: v });
                setIntervalError('');
              }}
            />
            {intervalError && <p className="mt-1 text-sm text-red-600">{intervalError}</p>}
          </SettingField>

          <SettingField
            label="Dismiss delay"
            helper="How long the prompt stays on screen before you can dismiss it. Default: 15 seconds."
          >
            <NumericInput
              value={s.dismissSeconds}
              defaultValue={15}
              unit="seconds"
              integerOnly
              onChange={(v) => update({ dismissSeconds: v })}
            />
          </SettingField>

          {mode === 'mindfulness' && (
            <SettingField
              label="Number of prompts"
              helper="Default: 0 (runs indefinitely). Enter a number to stop after that many prompts."
            >
              <NumericInput
                value={s.promptCount}
                defaultValue={0}
                unit="prompts"
                integerOnly
                allowZero
                onChange={(v) => update({ promptCount: v })}
              />
              {s.promptCount > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Session ends after {s.promptCount} prompt{s.promptCount !== 1 ? 's' : ''}.
                </p>
              )}
              {s.promptCount === 0 && (
                <p className="mt-1 text-xs text-gray-500">Session runs until you click Stop.</p>
              )}
            </SettingField>
          )}
        </Section>
      )}

      {/* ── Sound ── */}
      <Section title="Sound">
        <SettingField label="Play a sound when prompts and alerts appear?">
          <YesNoToggle
            value={s.playSound}
            onChange={(v) => update({ playSound: v })}
          />
        </SettingField>
      </Section>

      {/* Bottom action */}
      <Button onClick={handleAction} className="w-full text-lg">
        {hasChanges ? 'Review Changes' : 'No changes made — Start Session'}
      </Button>
    </div>
  );
}

// ── Sub-components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 px-1">{title}</p>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-5">
        {children}
      </div>
    </div>
  );
}

function SettingField({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {helper && <p className="text-xs text-gray-400 leading-snug">{helper}</p>}
      <div className="pt-1">{children}</div>
    </div>
  );
}

function YesNoToggle({
  value,
  yesLabel = 'Yes',
  noLabel = 'No',
  onChange,
}: {
  value: boolean;
  yesLabel?: string;
  noLabel?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
          value
            ? 'border-indigo-500 bg-indigo-600 text-white'
            : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'
        }`}
      >
        {yesLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
          !value
            ? 'border-indigo-500 bg-indigo-600 text-white'
            : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'
        }`}
      >
        {noLabel}
      </button>
    </div>
  );
}

function NumericInput({
  value,
  defaultValue,
  unit,
  integerOnly = false,
  allowZero = false,
  onChange,
}: {
  value: number;
  defaultValue: number;
  unit: string;
  integerOnly?: boolean;
  allowZero?: boolean;
  onChange: (v: number) => void;
}) {
  const [rawInput, setRawInput] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setRawInput(raw);
    if (raw === '') {
      onChange(defaultValue);
      return;
    }
    const parsed = integerOnly ? parseInt(raw, 10) : parseFloat(raw);
    if (!isNaN(parsed) && (allowZero ? parsed >= 0 : parsed > 0)) {
      onChange(parsed);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        type="number"
        value={rawInput}
        placeholder={defaultValue === 0 ? '0' : formatNum(defaultValue)}
        onChange={handleChange}
        min={allowZero ? 0 : integerOnly ? 1 : 0.5}
        step={integerOnly ? 1 : 0.5}
        className="w-28 rounded-lg border-2 border-gray-300 px-3 py-2 text-base transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <span className="text-sm text-gray-500">{unit}</span>
    </div>
  );
}
