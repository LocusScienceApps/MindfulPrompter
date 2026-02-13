'use client';

import { useState, useMemo } from 'react';
import type { Settings } from '@/lib/types';
import {
  defaultBreakMinutes,
  defaultLongBreakMinutes,
  defaultPromptInterval,
} from '@/lib/defaults';
import { formatNum } from '@/lib/format';
import { dividesEvenly, formatDivisorList } from '@/lib/validation';
import Button from '../ui/Button';
import StepIndicator from '../ui/StepIndicator';

interface CustomizeProps {
  settings: Settings;
  onDone: (settings: Settings) => void;
  onBack: () => void;
}

// Step definitions for each mode
type StepId =
  | 'work'
  | 'break'
  | 'sessionsPerSet'
  | 'multipleSets'
  | 'longBreak'
  | 'numberOfSets'
  | 'promptText'
  | 'promptInterval'
  | 'dismissDelay'
  | 'sound';

function getSteps(mode: Settings['mode'], multipleSets: boolean): StepId[] {
  const steps: StepId[] = [];

  if (mode === 'pomodoro' || mode === 'both') {
    steps.push('work', 'break', 'sessionsPerSet', 'multipleSets');
    if (multipleSets) {
      steps.push('longBreak', 'numberOfSets');
    }
  }

  if (mode === 'mindfulness' || mode === 'both') {
    steps.push('promptText', 'promptInterval', 'dismissDelay');
  }

  steps.push('sound');
  return steps;
}

export default function Customize({ settings: initial, onDone, onBack }: CustomizeProps) {
  const [s, setS] = useState<Settings>({ ...initial });
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState('');

  // Recompute steps whenever multipleSets changes
  const steps = useMemo(() => getSteps(s.mode, s.multipleSets), [s.mode, s.multipleSets]);
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const update = (partial: Partial<Settings>) => {
    setS((prev) => ({ ...prev, ...partial }));
    setError('');
  };

  const goNext = () => {
    // Validate current step
    if (currentStep === 'promptInterval' && s.mode === 'both') {
      if (!dividesEvenly(s.workMinutes, s.promptIntervalMinutes)) {
        const suggestions = formatDivisorList(s.workMinutes);
        setError(
          `That doesn't fit evenly into your ${formatNum(s.workMinutes)}-minute work session. Try: ${suggestions}`
        );
        return;
      }
    }

    if (currentStep === 'numberOfSets' && s.numberOfSets === 1) {
      // They said yes to multiple sets but entered 1 — warn and revert
      update({ multipleSets: false, numberOfSets: 1 });
      // Skip back to after multipleSets (the steps array will recalculate)
      // Just advance to the next step, which will now be past the long break questions
    }

    if (isLastStep) {
      onDone(s);
    } else {
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
      setError('');
    }
  };

  const goBack = () => {
    if (stepIndex === 0) {
      onBack();
    } else {
      setStepIndex((i) => i - 1);
      setError('');
    }
  };

  // Recalculate derived defaults when dependencies change
  const derivedBreak = defaultBreakMinutes(s.workMinutes);
  const derivedLongBreak = defaultLongBreakMinutes(s.breakMinutes);
  const derivedInterval = defaultPromptInterval(s.workMinutes);

  return (
    <div className="space-y-6">
      <button
        onClick={goBack}
        className="text-sm text-indigo-600 hover:text-indigo-800"
      >
        &larr; Back
      </button>

      <StepIndicator current={stepIndex} total={steps.length} />

      {/* Section headers */}
      {currentStep === 'work' && stepIndex === 0 && (
        <h2 className="text-center text-xl font-bold text-gray-900">
          Pomodoro Settings
        </h2>
      )}
      {currentStep === 'promptText' && (s.mode === 'mindfulness' ? stepIndex === 0 : true) && (
        <h2 className="text-center text-xl font-bold text-gray-900">
          Mindfulness Prompt Settings
        </h2>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* WORK SESSION LENGTH */}
        {currentStep === 'work' && (
          <StepContent
            title="How long would you like to work between each break?"
            helper={`Leave blank for the default (${formatNum(s.workMinutes)} minutes).`}
          >
            <NumericInput
              value={s.workMinutes}
              defaultValue={initial.workMinutes}
              unit="minutes"
              onChange={(v) => {
                update({
                  workMinutes: v,
                  breakMinutes: defaultBreakMinutes(v),
                  longBreakMinutes: defaultLongBreakMinutes(defaultBreakMinutes(v)),
                  promptIntervalMinutes: s.mode === 'both' ? defaultPromptInterval(v) : s.promptIntervalMinutes,
                });
              }}
            />
          </StepContent>
        )}

        {/* BREAK LENGTH */}
        {currentStep === 'break' && (
          <StepContent
            title="How long would you like your breaks to be?"
            helper={`Leave blank for the default (${formatNum(derivedBreak)} minutes).`}
          >
            <NumericInput
              value={s.breakMinutes}
              defaultValue={derivedBreak}
              unit="minutes"
              onChange={(v) => {
                update({
                  breakMinutes: v,
                  longBreakMinutes: defaultLongBreakMinutes(v),
                });
              }}
            />
          </StepContent>
        )}

        {/* SESSIONS PER SET */}
        {currentStep === 'sessionsPerSet' && (
          <StepContent
            title='How many work/break sessions ("pomodoros") before finishing or taking a longer break?'
            helper="Leave blank for the default (4)."
          >
            <NumericInput
              value={s.sessionsPerSet}
              defaultValue={4}
              unit="sessions"
              integerOnly
              onChange={(v) => update({ sessionsPerSet: v })}
            />
          </StepContent>
        )}

        {/* MULTIPLE SETS? */}
        {currentStep === 'multipleSets' && (
          <StepContent title="Would you like to do more than one set, with a longer break between each?">
            <div className="flex gap-3 mt-4">
              <Button
                variant={!s.multipleSets ? 'primary' : 'secondary'}
                onClick={() => {
                  update({ multipleSets: false, numberOfSets: 1 });
                  // Skip ahead past long break / number of sets
                  goNext();
                }}
                className="flex-1"
              >
                No, just one set
              </Button>
              <Button
                variant={s.multipleSets ? 'primary' : 'secondary'}
                onClick={() => {
                  update({ multipleSets: true, numberOfSets: 3 });
                  goNext();
                }}
                className="flex-1"
              >
                Yes, multiple sets
              </Button>
            </div>
          </StepContent>
        )}

        {/* LONG BREAK */}
        {currentStep === 'longBreak' && (
          <StepContent
            title="How long should the longer break between each set be?"
            helper={`Leave blank for the default (${formatNum(derivedLongBreak)} minutes).`}
          >
            <NumericInput
              value={s.longBreakMinutes}
              defaultValue={derivedLongBreak}
              unit="minutes"
              onChange={(v) => update({ longBreakMinutes: v })}
            />
          </StepContent>
        )}

        {/* NUMBER OF SETS */}
        {currentStep === 'numberOfSets' && (
          <StepContent
            title={`How many sets of ${s.sessionsPerSet} pomodoros would you like to complete?`}
            helper="Leave blank for the default (3)."
          >
            <NumericInput
              value={s.numberOfSets}
              defaultValue={3}
              unit="sets"
              integerOnly
              onChange={(v) => update({ numberOfSets: v })}
            />
            {s.numberOfSets === 1 && (
              <p className="mt-2 text-sm text-amber-600">
                You chose multiple sets earlier but entered 1. This will be treated as a single set with no long break.
              </p>
            )}
          </StepContent>
        )}

        {/* PROMPT TEXT */}
        {currentStep === 'promptText' && (
          <StepContent
            title="What mindfulness prompt would you like?"
            helper='Leave blank for the default: "Are you doing what you should be doing?"'
          >
            <textarea
              value={s.promptText}
              onChange={(e) => update({ promptText: e.target.value })}
              placeholder="Are you doing what you should be doing?"
              rows={3}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-lg transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </StepContent>
        )}

        {/* PROMPT INTERVAL */}
        {currentStep === 'promptInterval' && (
          <StepContent
            title="How often would you like a mindfulness prompt?"
            helper={
              s.mode === 'both'
                ? `Must fit evenly into your ${formatNum(s.workMinutes)}-minute work session. Default: ${formatNum(derivedInterval)} minutes.`
                : `Leave blank for the default (15 minutes).`
            }
          >
            <NumericInput
              value={s.promptIntervalMinutes}
              defaultValue={s.mode === 'both' ? derivedInterval : 15}
              unit="minutes"
              onChange={(v) => update({ promptIntervalMinutes: v })}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </StepContent>
        )}

        {/* DISMISS DELAY */}
        {currentStep === 'dismissDelay' && (
          <StepContent
            title="How long should each prompt stay on screen before you can dismiss it?"
            helper="This gives you time to actually reflect on the prompt. Default: 15 seconds."
          >
            <NumericInput
              value={s.dismissSeconds}
              defaultValue={15}
              unit="seconds"
              integerOnly
              onChange={(v) => update({ dismissSeconds: v })}
            />
          </StepContent>
        )}

        {/* SOUND */}
        {currentStep === 'sound' && (
          <StepContent title="Play a sound when prompts and alerts appear?">
            <div className="flex gap-3 mt-4">
              <Button
                variant={s.playSound ? 'primary' : 'secondary'}
                onClick={() => update({ playSound: true })}
                className="flex-1"
              >
                Yes
              </Button>
              <Button
                variant={!s.playSound ? 'primary' : 'secondary'}
                onClick={() => update({ playSound: false })}
                className="flex-1"
              >
                No
              </Button>
            </div>
          </StepContent>
        )}
      </div>

      {/* Next button (not shown for multipleSets or sound toggle — those auto-advance or have inline buttons) */}
      {currentStep !== 'multipleSets' && (
        <Button onClick={goNext} className="w-full text-lg">
          {isLastStep ? 'Review Settings' : 'Next'}
        </Button>
      )}
    </div>
  );
}

// --- Helper sub-components ---

function StepContent({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-800">{title}</h3>
      {helper && <p className="text-sm text-gray-500">{helper}</p>}
      {children}
    </div>
  );
}

function NumericInput({
  value,
  defaultValue,
  unit,
  integerOnly = false,
  onChange,
}: {
  value: number;
  defaultValue: number;
  unit: string;
  integerOnly?: boolean;
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
    if (!isNaN(parsed) && parsed > 0) {
      onChange(parsed);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        type="number"
        value={rawInput}
        placeholder={formatNum(defaultValue)}
        onChange={handleChange}
        min={integerOnly ? 1 : 0.5}
        step={integerOnly ? 1 : 0.5}
        className="w-32 rounded-lg border-2 border-gray-300 px-4 py-3 text-lg transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <span className="text-gray-500">{unit}</span>
    </div>
  );
}
