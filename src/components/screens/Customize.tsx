'use client';

import { useState, useEffect, useRef } from 'react';
import type { Settings, MindfulnessScope } from '@/lib/types';
import {
  getDefaults,
  defaultBreakMinutes,
  defaultLongBreakMinutes,
  defaultPromptInterval,
} from '@/lib/defaults';
import { getDefaults as getStoredDefaults } from '@/lib/storage';
import { formatNum } from '@/lib/format';
import { dividesEvenly, formatDivisorList } from '@/lib/validation';
import Button from '../ui/Button';

interface CustomizeProps {
  settings: Settings;
  onDone: (settings: Settings) => void;
  onStartDirectly: (settings: Settings) => void;
  onResetToOriginal: () => void;
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
  const [promptRaw, setPromptRaw] = useState(initial.promptText);
  const [showHardBreakConfirm, setShowHardBreakConfirm] = useState(false);

  const modeDefaults = { ...getDefaults(), ...getStoredDefaults() } as Settings;
  const isOriginalDefaults = Object.keys(getStoredDefaults()).length === 0;
  const hasChanges = JSON.stringify(s) !== JSON.stringify(initial);

  const update = (partial: Partial<Settings>) => {
    setS((prev) => ({ ...prev, ...partial }));
    setIntervalError('');
  };

  const derivedBreak = defaultBreakMinutes(s.workMinutes);
  const derivedLongBreak = defaultLongBreakMinutes(s.breakMinutes);
  const derivedInterval = defaultPromptInterval(s.workMinutes);

  const handleAction = () => {
    if (s.useMindfulness && s.useTimedWork) {
      if (!dividesEvenly(s.workMinutes, s.promptIntervalMinutes)) {
        setIntervalError(
          `That doesn't fit evenly into your ${formatNum(s.workMinutes)}-minute work period. Try: ${formatDivisorList(s.workMinutes)}`
        );
        return;
      }
    }
    if (s.useMindfulness && !s.useTimedWork) {
      if (!dividesEvenly(60, s.promptIntervalMinutes)) {
        setIntervalError(
          `That doesn't divide evenly into 60 minutes. Try: ${formatDivisorList(60)}`
        );
        return;
      }
    }
    if (!hasChanges) {
      onStartDirectly(s);
    } else {
      onDone(s);
    }
  };

  const handleActionRef = useRef(handleAction);
  handleActionRef.current = handleAction;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
      handleActionRef.current();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-indigo-600 hover:text-indigo-800">
          &larr; Back
        </button>
        {isOriginalDefaults ? (
          <span className="text-sm text-gray-300 cursor-default select-none" title="Already using original defaults.">
            Reset to original defaults
          </span>
        ) : (
          <button onClick={() => setShowResetConfirm(true)} className="text-sm text-gray-400 hover:text-red-500 underline">
            Reset to original defaults
          </button>
        )}
      </div>

      {showResetConfirm && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm text-red-800">This will reset all defaults to their original values. This cannot be undone.</p>
          <div className="flex gap-3">
            <Button onClick={() => { setShowResetConfirm(false); onResetToOriginal(); }} className="flex-1 !bg-red-600 hover:!bg-red-700">Confirm</Button>
            <Button onClick={() => setShowResetConfirm(false)} variant="secondary" className="flex-1">Cancel</Button>
          </div>
        </div>
      )}

      {/* ── Section A: Timed Work Sessions ── */}
      <CollapsibleSection
        title="Timed Work Sessions"
        isOn={s.useTimedWork}
        onToggle={(v) => {
          if (!v && !s.useMindfulness) return; // guard: both can't be off
          update({ useTimedWork: v });
        }}
        disabledReason={!s.useMindfulness ? 'Mindfulness prompts must be on if timed work is off' : undefined}
      >
        <SettingField label="Work period length" helper={`Default: ${formatNum(modeDefaults.workMinutes)} minutes`}>
          <NumericInput
            value={s.workMinutes}
            defaultValue={modeDefaults.workMinutes}
            unit="minutes"
            onChange={(v) =>
              update({
                workMinutes: v,
                breakMinutes: defaultBreakMinutes(v),
                longBreakMinutes: defaultLongBreakMinutes(defaultBreakMinutes(v)),
                promptIntervalMinutes: s.useMindfulness ? defaultPromptInterval(v) : s.promptIntervalMinutes,
              })
            }
          />
        </SettingField>

        <SettingField label="Break length" helper={`Default: ${formatNum(derivedBreak)} minutes`}>
          <NumericInput
            value={s.breakMinutes}
            defaultValue={derivedBreak}
            unit="minutes"
            onChange={(v) => update({ breakMinutes: v, longBreakMinutes: defaultLongBreakMinutes(v) })}
          />
        </SettingField>

        <SettingField label="Lock screen during breaks" helper="When enabled, the break popup cannot be dismissed early — it stays up for the full break duration.">
          <YesNoToggle
            value={s.hardBreak ?? false}
            yesLabel="Yes, lock it"
            noLabel="No, dismissible"
            onChange={(v) => {
              if (v && !s.hardBreak) { setShowHardBreakConfirm(true); }
              else { update({ hardBreak: v }); setShowHardBreakConfirm(false); }
            }}
          />
        </SettingField>

        {showHardBreakConfirm && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-900">Are you sure?</p>
            <p className="text-sm text-amber-800">When enabled, break popups will stay on screen for the full break duration. You won&rsquo;t be able to use your computer until the break ends, even if you&rsquo;re in the middle of something important.</p>
            <div className="flex gap-3">
              <Button onClick={() => { setShowHardBreakConfirm(false); update({ hardBreak: true }); }} className="flex-1 !bg-amber-600 hover:!bg-amber-700">Enable Hard Breaks</Button>
              <Button onClick={() => setShowHardBreakConfirm(false)} variant="secondary" className="flex-1">Cancel</Button>
            </div>
          </div>
        )}

        <SettingField label="Work periods per set" helper={`Default: ${modeDefaults.sessionsPerSet}. Enter 0 (= ∞) to run indefinitely.`}>
          <NumericInput
            value={s.sessionsPerSet}
            defaultValue={modeDefaults.sessionsPerSet}
            unit="periods"
            integerOnly
            allowZero
            onChange={(v) => update({ sessionsPerSet: v, ...(v === 0 ? { multipleSets: false } : {}) })}
          />
        </SettingField>

        {s.sessionsPerSet !== 0 && (
          <SettingField label="Multiple sets with a longer break between?">
            <YesNoToggle
              value={s.multipleSets}
              yesLabel="Yes, multiple sets"
              noLabel="No, just one set"
              onChange={(v) => update({ multipleSets: v, numberOfSets: v ? 3 : 1 })}
            />
          </SettingField>
        )}

        {s.multipleSets && s.sessionsPerSet !== 0 && (
          <>
            <SettingField label="Long break between sets" helper={`Default: ${formatNum(derivedLongBreak)} minutes`}>
              <NumericInput value={s.longBreakMinutes} defaultValue={derivedLongBreak} unit="minutes" onChange={(v) => update({ longBreakMinutes: v })} />
            </SettingField>
            <SettingField label="Number of sets" helper="Default: 3. Enter 0 (= ∞) to run indefinitely.">
              <NumericInput value={s.numberOfSets} defaultValue={3} unit="sets" integerOnly allowZero onChange={(v) => update({ numberOfSets: v })} />
            </SettingField>
          </>
        )}
      </CollapsibleSection>

      {/* ── Section B: Mindfulness Prompts ── */}
      <CollapsibleSection
        title="Mindfulness Prompts"
        isOn={s.useMindfulness}
        onToggle={(v) => {
          if (!v && !s.useTimedWork) return; // guard: both can't be off
          update({ useMindfulness: v });
        }}
        disabledReason={!s.useTimedWork ? 'Timed work must be on if mindfulness prompts are off' : undefined}
      >
        <SettingField label="Mindfulness prompt" helper={`Default: "${modeDefaults.promptText}"`}>
          <textarea
            value={promptRaw}
            onChange={(e) => { setPromptRaw(e.target.value); update({ promptText: e.target.value || modeDefaults.promptText }); }}
            placeholder={modeDefaults.promptText}
            rows={3}
            className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-base transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </SettingField>

        <SettingField
          label="Prompt frequency"
          helper={
            s.useTimedWork
              ? `Must fit evenly into your ${formatNum(s.workMinutes)}-minute work period. Default: ${formatNum(derivedInterval)} minutes.`
              : `Must divide evenly into 60 minutes. Default: ${formatNum(modeDefaults.promptIntervalMinutes)} minutes.`
          }
        >
          <NumericInput
            value={s.promptIntervalMinutes}
            defaultValue={s.useTimedWork ? derivedInterval : modeDefaults.promptIntervalMinutes}
            unit="minutes"
            onChange={(v) => { update({ promptIntervalMinutes: v }); setIntervalError(''); }}
          />
          {intervalError && <p className="mt-1 text-sm text-red-600">{intervalError}</p>}
        </SettingField>

        <SettingField label="Dismiss delay" helper={`How long the prompt stays on screen before you can dismiss it. Default: ${modeDefaults.dismissSeconds} seconds.`}>
          <NumericInput value={s.dismissSeconds} defaultValue={modeDefaults.dismissSeconds} unit="seconds" integerOnly minValue={0} onChange={(v) => update({ dismissSeconds: v })} />
        </SettingField>

        {!s.useTimedWork && (
          <SettingField label="Number of prompts" helper={modeDefaults.promptCount === 0 ? 'Default: 0 (= ∞) to run indefinitely.' : `Default: ${modeDefaults.promptCount}. Enter 0 (= ∞) to run indefinitely.`}>
            <NumericInput value={s.promptCount} defaultValue={modeDefaults.promptCount} unit="prompts" integerOnly allowZero onChange={(v) => update({ promptCount: v })} />
          </SettingField>
        )}

        {s.useTimedWork && (
          <SettingField label="Which popups show the mindfulness prompt?" helper="By default, the prompt only appears at timed intervals during work.">
            <ScopeSelector value={s.bothMindfulnessScope ?? 'work-only'} onChange={(v) => update({ bothMindfulnessScope: v })} />
          </SettingField>
        )}
      </CollapsibleSection>

      <div className="flex flex-col gap-3">
        <Button onClick={handleAction} className="w-full text-lg">
          {hasChanges ? 'Review Changes' : 'No changes made — Start Session'}
        </Button>
      </div>
    </div>
  );
}

// ── Sub-components ──

function CollapsibleSection({
  title,
  isOn,
  onToggle,
  disabledReason,
  children,
}: {
  title: string;
  isOn: boolean;
  onToggle: (v: boolean) => void;
  disabledReason?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{title}</p>
        <button
          type="button"
          onClick={() => onToggle(!isOn)}
          title={disabledReason}
          className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 transition-colors ${
            isOn ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          } ${disabledReason ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className={`inline-block w-2 h-2 rounded-full ${isOn ? 'bg-indigo-500' : 'bg-gray-400'}`} />
          {isOn ? 'On' : 'Off'}
        </button>
      </div>
      {isOn ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-5">
          {children}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-3 text-sm text-gray-400 italic">
          {title} disabled — click &ldquo;On/Off&rdquo; to enable
        </div>
      )}
    </div>
  );
}


function SettingField({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {helper && <p className="text-xs text-gray-400 leading-snug">{helper}</p>}
      <div className="pt-1">{children}</div>
    </div>
  );
}

function YesNoToggle({ value, yesLabel = 'Yes', noLabel = 'No', onChange }: { value: boolean; yesLabel?: string; noLabel?: string; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => onChange(true)} className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${value ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'}`}>{yesLabel}</button>
      <button type="button" onClick={() => onChange(false)} className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${!value ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'}`}>{noLabel}</button>
    </div>
  );
}

const SCOPE_OPTIONS: { value: MindfulnessScope; label: string; description: string }[] = [
  { value: 'work-only',   label: 'At work intervals only',           description: 'Prompt fires at timed intervals during work — not during breaks or transitions.' },
  { value: 'breaks',      label: 'Intervals + at each break',        description: 'Also shown when a break starts and when the session ends.' },
  { value: 'work-starts', label: 'Intervals + returning from breaks', description: 'Also shown when returning to work after each break.' },
  { value: 'all',         label: 'All popups',                       description: 'Shown at intervals, at each break, and when returning to work.' },
];

function ScopeSelector({ value, onChange }: { value: MindfulnessScope; onChange: (v: MindfulnessScope) => void }) {
  return (
    <div className="space-y-2">
      {SCOPE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`w-full rounded-lg border-2 px-3 py-2 text-left transition-colors ${value === opt.value ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'}`}
        >
          <p className={`text-sm font-medium ${value === opt.value ? 'text-white' : 'text-gray-800'}`}>{opt.label}</p>
          <p className={`text-xs mt-0.5 ${value === opt.value ? 'text-indigo-100' : 'text-gray-400'}`}>{opt.description}</p>
        </button>
      ))}
    </div>
  );
}

function NumericInput({
  value, defaultValue, unit, integerOnly = false, allowZero = false, minValue, onChange,
}: {
  value: number; defaultValue: number; unit: string; integerOnly?: boolean; allowZero?: boolean; minValue?: number; onChange: (v: number) => void;
}) {
  const [rawInput, setRawInput] = useState(() => {
    if (allowZero && value === 0) return defaultValue === 0 ? '' : '∞';
    if (value === defaultValue) return '';
    return String(value);
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setRawInput(raw);
    if (raw === '') { onChange(defaultValue); return; }
    if (raw === '∞') return;
    const parsed = integerOnly ? parseInt(raw, 10) : parseFloat(raw);
    const atLeast = allowZero ? 0 : (minValue !== undefined ? minValue : (integerOnly ? 1 : 0.01));
    if (!isNaN(parsed) && parsed >= atLeast) {
      onChange(parsed);
      if (parsed === 0 && allowZero) setRawInput(defaultValue === 0 ? '' : '∞');
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        type={allowZero ? 'text' : 'number'}
        inputMode={allowZero ? 'numeric' : undefined}
        value={rawInput}
        placeholder={allowZero && defaultValue === 0 ? '∞' : formatNum(defaultValue)}
        onChange={handleChange}
        {...(!allowZero && { min: minValue !== undefined ? minValue : (integerOnly ? 1 : 0.01), step: integerOnly ? 1 : 0.5 })}
        className="w-28 rounded-lg border-2 border-gray-300 px-3 py-2 text-base transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <span className="text-sm text-gray-500">{unit}</span>
    </div>
  );
}
