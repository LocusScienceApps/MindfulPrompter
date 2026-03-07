'use client';

import type { Settings, MindfulnessScope } from '@/lib/types';
import { formatNum } from '@/lib/format';
import { dividesEvenly } from '@/lib/validation';
import { getDefaults as getStoredDefaults } from '@/lib/storage';

interface SettingsDisplayProps {
  settings: Settings;
  onChange: (s: Settings) => void;
}

function scopeLabel(scope: MindfulnessScope | undefined): string {
  switch (scope) {
    case 'breaks':      return 'Intervals + at each break';
    case 'work-starts': return 'Intervals + returning from breaks';
    case 'all':         return 'All popups';
    default:            return 'At work intervals only';
  }
}

function Toggle({
  checked,
  onChange,
  disabled,
  title,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={disabled ? undefined : onChange}
      title={title}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        checked ? 'bg-indigo-600' : 'bg-gray-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function SettingsDisplay({ settings, onChange }: SettingsDisplayProps) {
  const s = settings;

  const handleTimedWorkToggle = () => {
    if (s.useTimedWork) {
      // Turning OFF — guard: must have mindfulness
      if (!s.useMindfulness) return;
      // Restore saved defaults interval if valid for standalone (divides into 60), else use 15
      const stored = getStoredDefaults();
      let interval = 15;
      if (
        typeof stored.promptIntervalMinutes === 'number' &&
        stored.promptIntervalMinutes > 0 &&
        dividesEvenly(60, stored.promptIntervalMinutes)
      ) {
        interval = stored.promptIntervalMinutes;
      }
      onChange({ ...s, useTimedWork: false, promptIntervalMinutes: interval, promptCount: 0 });
    } else {
      // Turning ON
      onChange({
        ...s,
        useTimedWork: true,
        promptIntervalMinutes: s.workMinutes / 2,
        bothMindfulnessScope: s.bothMindfulnessScope ?? 'work-only',
      });
    }
  };

  const handleMindfulnessToggle = () => {
    if (s.useMindfulness) {
      // Turning OFF — guard: must have timed work
      if (!s.useTimedWork) return;
      onChange({ ...s, useMindfulness: false });
    } else {
      onChange({ ...s, useMindfulness: true });
    }
  };

  const handleMultipleSetsToggle = () => {
    if (s.multipleSets) {
      onChange({ ...s, multipleSets: false });
    } else {
      onChange({ ...s, multipleSets: true, numberOfSets: Math.max(s.numberOfSets, 3) });
    }
  };

  return (
    <div className="space-y-4">
      {/* Sound toggle — small, top right */}
      <div className="flex justify-end items-center gap-2 text-sm text-gray-500">
        <span>{s.playSound ? '🔊' : '🔇'}</span>
        <span>Sound</span>
        <Toggle
          checked={s.playSound}
          onChange={() => onChange({ ...s, playSound: !s.playSound })}
        />
      </div>

      {/* Timed Work section card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4">
          <Toggle
            checked={s.useTimedWork}
            onChange={handleTimedWorkToggle}
            disabled={!s.useMindfulness}
            title={!s.useMindfulness ? 'Turn on Mindfulness Prompts first' : undefined}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/tomato.png" alt="" className="h-8 w-auto shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-gray-900">Timed Work Sessions</div>
            <div className="text-xs text-gray-500">Pomodoro-style work periods and breaks.</div>
          </div>
        </div>

        {s.useTimedWork && (
          <div className="border-t border-gray-100 px-5 pb-4 pt-3">
            <dl className="space-y-2.5">
              <SettingRow label="Work period" value={`${formatNum(s.workMinutes)} minutes`} />
              <SettingRow label="Break" value={`${formatNum(s.breakMinutes)} minutes`} />
              {s.hardBreak && <SettingRow label="Lock screen during breaks" value="Yes" />}
              <SettingRow
                label="Periods per set"
                value={s.sessionsPerSet === 0 ? '∞ (unlimited)' : String(s.sessionsPerSet)}
              />
            </dl>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">Multiple sets with longer break?</span>
              <Toggle checked={s.multipleSets} onChange={handleMultipleSetsToggle} />
            </div>
            {s.multipleSets && (
              <dl className="mt-2.5 space-y-2.5">
                <SettingRow label="Long break" value={`${formatNum(s.longBreakMinutes)} minutes`} />
                <SettingRow
                  label="Number of sets"
                  value={s.numberOfSets === 0 ? 'Unlimited' : String(s.numberOfSets)}
                />
              </dl>
            )}
          </div>
        )}
      </div>

      {/* Mindfulness section card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4">
          <Toggle
            checked={s.useMindfulness}
            onChange={handleMindfulnessToggle}
            disabled={!s.useTimedWork}
            title={!s.useTimedWork ? 'Turn on Timed Work Sessions first' : undefined}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/bowl.png" alt="" className="h-8 w-auto shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-gray-900">Mindfulness Prompts</div>
            <div className="text-xs text-gray-500">Timed pop-up reminders that make you stop and reflect.</div>
          </div>
        </div>

        {s.useMindfulness && (
          <div className="border-t border-gray-100 px-5 pb-4 pt-3">
            <dl className="space-y-2.5">
              <SettingRow label="Prompt" value={`"${s.promptText}"`} />
              <SettingRow label="Prompt every" value={`${formatNum(s.promptIntervalMinutes)} minutes`} />
              <SettingRow label="Dismiss delay" value={`${s.dismissSeconds} seconds`} />
              {!s.useTimedWork && (
                <SettingRow
                  label="Runs"
                  value={
                    s.promptCount > 0
                      ? `${s.promptCount} prompt${s.promptCount !== 1 ? 's' : ''} then stops`
                      : 'Indefinitely (until stopped)'
                  }
                />
              )}
              {s.useTimedWork && (
                <SettingRow label="Mindfulness shows" value={scopeLabel(s.bothMindfulnessScope)} />
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 text-sm">{label}</dt>
      <dd className="font-medium text-gray-800 text-sm text-right">{value}</dd>
    </div>
  );
}
