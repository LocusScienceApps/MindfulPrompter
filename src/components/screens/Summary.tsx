'use client';

import { useState } from 'react';
import type { Settings, PresetSlot, CoworkRoom, EditContext, CoworkDay } from '@/lib/types';
import { getPresetSlots, savePreset, listPresets, renamePreset, deletePreset, saveSoloSchedule } from '@/lib/storage';
import { generatePresetName, generateRoomName } from '@/lib/defaults';
import { createRoom, getRoom, computeRoomTiming, computeSessionDurationMs } from '@/lib/cowork';
import Button from '../ui/Button';
import SettingsDisplay from '../ui/SettingsDisplay';
import WhenSection from '../ui/WhenSection';

interface SettingsUpdatedProps {
  settings: Settings;
  onBegin: () => void;
  onScheduledStart: (startMs: number) => void;
  onSaveAsDefault: (s: Settings) => void;
  onBack: () => void;
  onCustomize: () => void;
  onLoadPreset: (settings: Settings) => void;
  onCoworkHostStart: (room: CoworkRoom, startMs: number) => void;
  onSettingsChange: (s: Settings) => void;
  editContext?: EditContext | null;
  onSaveToContext?: (s: Settings) => Promise<void>;
}

type SubView = null | 'preset-naming' | 'preset-slots' | 'save-default-confirm';

export default function SettingsUpdated({
  settings,
  onBegin,
  onScheduledStart,
  onSaveAsDefault,
  onBack,
  onCustomize,
  onLoadPreset,
  onCoworkHostStart,
  onSettingsChange,
  editContext,
  onSaveToContext,
}: SettingsUpdatedProps) {
  const [localS, setLocalS] = useState<Settings>(settings);
  const [savingContext, setSavingContext] = useState(false);
  const [saveContextError, setSaveContextError] = useState('');

  const handleLocalChange = (s: Settings) => {
    setLocalS(s);
    onSettingsChange(s);
  };

  const autoName = generatePresetName(localS);

  const [subView, setSubView] = useState<SubView>(null);
  const [presetName, setPresetName] = useState(autoName);
  const [savedSlot, setSavedSlot] = useState<PresetSlot | null>(null);
  const [savedPresetName, setSavedPresetName] = useState('');
  const [confirmOverwrite, setConfirmOverwrite] = useState<PresetSlot | null>(null);
  const presetSlots = (subView === 'preset-slots' || confirmOverwrite !== null) ? getPresetSlots() : [];

  const [postSavePresets, setPostSavePresets] = useState<ReturnType<typeof listPresets>>([]);
  const [postSaveRenamingSlot, setPostSaveRenamingSlot] = useState<PresetSlot | null>(null);
  const [postSaveRenameValue, setPostSaveRenameValue] = useState('');
  const [postSaveConfirmDeleteSlot, setPostSaveConfirmDeleteSlot] = useState<PresetSlot | null>(null);
  const [postSaveSelectedSlot, setPostSaveSelectedSlot] = useState<PresetSlot | null>(null);
  const [postSaveSelectedName, setPostSaveSelectedName] = useState('');
  const [expandPostSavePresets, setExpandPostSavePresets] = useState(false);

  // Cowork toggle (replaces expandHost)
  const [hostCowork, setHostCowork] = useState(false);
  const [hostRoomName, setHostRoomName] = useState(() => generateRoomName(settings));
  const [hostSharePrompts, setHostSharePrompts] = useState(true);
  const [hostGenerating, setHostGenerating] = useState(false);
  const [hostError, setHostError] = useState('');
  const [generatedRoom, setGeneratedRoom] = useState<CoworkRoom | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Scheduling state (unified, replaces expandSchedule)
  const [startType, setStartType] = useState<'now' | 'specific' | 'recurring'>('now');
  const [specificDate, setSpecificDate] = useState(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  });
  const [specificTime, setSpecificTime] = useState('');
  const [recurringDays, setRecurringDays] = useState<CoworkDay[]>([]);
  const [recurringTime, setRecurringTime] = useState('');
  const [recurringTimezone, setRecurringTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [tzFilter, setTzFilter] = useState('');
  const [scheduleSaved, setScheduleSaved] = useState(false);

  const refreshPostSavePresets = () => setPostSavePresets(listPresets());

  const handleSavePreset = (slot: PresetSlot) => {
    const name = presetName.trim() || autoName;
    savePreset(slot, { name, settings: localS });
    setSavedSlot(slot);
    setSavedPresetName(name);
    setPostSaveSelectedSlot(slot);
    setPostSaveSelectedName(name);
    setPostSavePresets(listPresets());
    setConfirmOverwrite(null);
    setSubView(null);
  };

  const handleSlotClick = (slot: PresetSlot, hasExisting: boolean) => {
    if (hasExisting) { setConfirmOverwrite(slot); }
    else { handleSavePreset(slot); }
  };

  const handleGenerateRoom = async () => {
    setHostGenerating(true);
    setHostError('');
    try {
      const timingSettings = {
        workMinutes: localS.workMinutes,
        breakMinutes: localS.breakMinutes,
        sessionsPerSet: localS.sessionsPerSet,
        multipleSets: localS.multipleSets,
        longBreakMinutes: localS.longBreakMinutes,
        numberOfSets: localS.numberOfSets,
        hardBreak: localS.hardBreak ?? false,
        playSound: localS.playSound,
      };

      let roomInput: Parameters<typeof createRoom>[0];
      if (startType === 'recurring' && recurringDays.length > 0 && recurringTime) {
        const durationMinutes = computeSessionDurationMs(timingSettings) / 60000;
        roomInput = {
          type: 'public',
          name: hostRoomName.trim() || generateRoomName(localS),
          mindfulnessOnly: !localS.useTimedWork,
          timingSettings,
          sharePrompts: localS.useMindfulness ? hostSharePrompts : false,
          promptSettings: (localS.useMindfulness && hostSharePrompts) ? {
            promptText: localS.promptText,
            promptIntervalMinutes: localS.promptIntervalMinutes,
            dismissSeconds: localS.dismissSeconds,
            promptCount: localS.promptCount,
            bothMindfulnessScope: localS.bothMindfulnessScope ?? 'work-only',
          } : undefined,
          recurrenceRule: { days: recurringDays, time: recurringTime, timezone: recurringTimezone, durationMinutes },
        };
      } else {
        const startMs =
          startType === 'specific' && specificDate && specificTime
            ? new Date(`${specificDate}T${specificTime}`).getTime()
            : Date.now();
        roomInput = {
          type: 'public',
          name: hostRoomName.trim() || generateRoomName(localS),
          mindfulnessOnly: !localS.useTimedWork,
          timingSettings,
          sharePrompts: localS.useMindfulness ? hostSharePrompts : false,
          promptSettings: (localS.useMindfulness && hostSharePrompts) ? {
            promptText: localS.promptText,
            promptIntervalMinutes: localS.promptIntervalMinutes,
            dismissSeconds: localS.dismissSeconds,
            promptCount: localS.promptCount,
            bothMindfulnessScope: localS.bothMindfulnessScope ?? 'work-only',
          } : undefined,
          startTime: isNaN(startMs) ? Date.now() : startMs,
        };
      }

      const code = await createRoom(roomInput);
      const room = await getRoom(code);
      if (room) setGeneratedRoom(room);
    } catch (e) {
      setHostError(String(e));
    } finally {
      setHostGenerating(false);
    }
  };

  const handleHostJoinSession = () => {
    if (!generatedRoom) return;
    const timing = computeRoomTiming(generatedRoom);
    onCoworkHostStart(generatedRoom, timing?.startMs ?? Date.now());
  };

  const handleSaveRecurring = () => {
    if (recurringDays.length === 0 || !recurringTime) return;
    saveSoloSchedule({ type: 'recurring', days: recurringDays, time: recurringTime, timezone: recurringTimezone });
    setScheduleSaved(true);
    setTimeout(() => setScheduleSaved(false), 3000);
  };

  // ── Shared cowork + scheduling section ──
  const CoworkAndWhen = () => (
    <>
      {/* Cowork toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={hostCowork}
          onClick={() => { setHostCowork((v) => !v); if (hostCowork) setGeneratedRoom(null); }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${hostCowork ? 'bg-indigo-600' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${hostCowork ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {editContext?.type === 'cowork-room' ? 'Make this a NEW ' : 'Make this a '}
          Hosted Coworking Session
        </span>
      </div>

      {/* WhenSection */}
      <WhenSection
        startType={startType}
        onStartTypeChange={setStartType}
        specificDate={specificDate}
        specificTime={specificTime}
        onSpecificDateChange={setSpecificDate}
        onSpecificTimeChange={setSpecificTime}
        recurringDays={recurringDays}
        recurringTime={recurringTime}
        onRecurringDaysChange={setRecurringDays}
        onRecurringTimeChange={setRecurringTime}
        hostCowork={hostCowork}
        onStartNow={onBegin}
        onSchedule={onScheduledStart}
        onSaveRecurring={handleSaveRecurring}
      />

      {scheduleSaved && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 text-center">
          Schedule saved! You&rsquo;ll be notified when your session is about to start.
        </p>
      )}

      {/* Cowork creation form */}
      {hostCowork && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          {generatedRoom ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700">Room created!</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-3xl font-bold tracking-widest text-indigo-600">{generatedRoom.code}</span>
                <button onClick={() => { navigator.clipboard.writeText(generatedRoom.code); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }} className="text-xs text-gray-400 hover:text-indigo-600">
                  {copiedCode ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <Button onClick={handleHostJoinSession} className="w-full">Join as Host &amp; Start Session</Button>
              <button onClick={() => setGeneratedRoom(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">Create a different room</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room name</label>
                <input type="text" value={hostRoomName} onChange={(e) => setHostRoomName(e.target.value)} placeholder="Room 1" className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              {localS.useMindfulness && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!hostSharePrompts} onChange={(e) => setHostSharePrompts(!e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                  <span className="text-sm text-gray-700">Do NOT share my mindfulness prompts with guests</span>
                </label>
              )}
              <Button onClick={handleGenerateRoom} disabled={hostGenerating} className="w-full">
                {hostGenerating ? 'Creating room…' : 'Generate Room Code'}
              </Button>
              {hostError && <p className="text-sm text-red-600">{hostError}</p>}
              <p className="text-xs text-gray-400">Make sure your settings are correct before generating — the room will be created immediately.</p>
            </div>
          )}
        </div>
      )}
    </>
  );

  // ── Overwrite confirmation ──
  if (confirmOverwrite !== null) {
    const existing = presetSlots.find(({ slot }) => slot === confirmOverwrite);
    return (
      <div className="space-y-6">
        <button onClick={() => setConfirmOverwrite(null)} className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back</button>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
          <p className="text-sm font-semibold text-amber-900">Overwrite existing preset?</p>
          <p className="text-sm text-amber-800">
            Slot <strong>{confirmOverwrite}</strong> already contains{' '}
            <strong>&ldquo;{existing?.preset?.name ?? 'a preset'}&rdquo;</strong>. This will permanently replace it.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => handleSavePreset(confirmOverwrite)} className="flex-1 !bg-amber-600 hover:!bg-amber-700">Overwrite</Button>
            <Button onClick={() => setConfirmOverwrite(null)} variant="secondary" className="flex-1">Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Preset naming step ──
  if (subView === 'preset-naming') {
    return (
      <div className="space-y-6">
        <button onClick={() => setSubView(null)} className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back</button>
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
        <Button onClick={() => setSubView('preset-slots')} className="w-full">Next: Choose a slot &rarr;</Button>
      </div>
    );
  }

  // ── Preset slot picker step ──
  if (subView === 'preset-slots') {
    const displayName = presetName.trim() || autoName;
    return (
      <div className="space-y-6">
        <button onClick={() => setSubView('preset-naming')} className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back to naming</button>
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
                <span className="ml-3 text-sm text-amber-600">Overwrite &ldquo;{preset.name}&rdquo;</span>
              ) : (
                <span className="ml-3 text-sm text-gray-400">Empty slot</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Post-save view ──
  if (savedSlot !== null) {
    const indicator = { slot: postSaveSelectedSlot ?? savedSlot, name: postSaveSelectedName || savedPresetName };

    return (
      <div className="space-y-6">
        <button onClick={onBack} className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back to settings</button>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Current Settings</h2>
          {indicator.slot && indicator.name && (
            <p className="mt-1 text-sm text-indigo-600">Preset selected: {indicator.slot} — {indicator.name}</p>
          )}
        </div>

        <SettingsDisplay settings={localS} onChange={handleLocalChange} />

        {/* Collapsible saved presets */}
        {postSavePresets.length > 0 && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
            <button
              type="button"
              onClick={() => setExpandPostSavePresets((v) => !v)}
              className="w-full flex items-center justify-between text-sm font-semibold text-indigo-700 hover:text-indigo-900 transition-colors"
            >
              <span>{expandPostSavePresets ? '▼' : '▶'} Saved presets ({postSavePresets.length})</span>
            </button>
            {expandPostSavePresets && (
              <div className="mt-3 space-y-2">
                {postSavePresets.map(({ slot, preset }) => (
                  <div key={slot} className="rounded-lg border border-indigo-200 bg-white px-3 py-2">
                    {postSaveRenamingSlot === slot ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={postSaveRenameValue}
                          onChange={(e) => setPostSaveRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { const t = postSaveRenameValue.trim(); if (t) { renamePreset(slot, t); if (slot === indicator.slot) setPostSaveSelectedName(t); refreshPostSavePresets(); } setPostSaveRenamingSlot(null); }
                            if (e.key === 'Escape') setPostSaveRenamingSlot(null);
                          }}
                          autoFocus
                          className="flex-1 rounded border border-indigo-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                        <button onClick={() => { const t = postSaveRenameValue.trim(); if (t) { renamePreset(slot, t); if (slot === indicator.slot) setPostSaveSelectedName(t); refreshPostSavePresets(); } setPostSaveRenamingSlot(null); }} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Save</button>
                        <button onClick={() => setPostSaveRenamingSlot(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => { const p = postSavePresets.find((x) => x.slot === slot); if (p) { onLoadPreset(p.preset.settings); setPostSaveSelectedSlot(slot); setPostSaveSelectedName(p.preset.name); } }} className="flex-1 text-left text-sm">
                          <span className="font-medium text-gray-700">{slot}</span>
                          <span className="mx-2 text-gray-400">&mdash;</span>
                          <span className="text-gray-600">{preset.name}</span>
                        </button>
                        <button onClick={() => { setPostSaveRenamingSlot(slot); setPostSaveRenameValue(preset.name); setPostSaveConfirmDeleteSlot(null); }} className="text-xs text-gray-400 hover:text-indigo-600">Rename</button>
                        <button
                          onClick={() => {
                            if (postSaveConfirmDeleteSlot === slot) { deletePreset(slot); if (slot === indicator.slot) { setPostSaveSelectedSlot(null); setPostSaveSelectedName(''); } refreshPostSavePresets(); setPostSaveConfirmDeleteSlot(null); }
                            else { setPostSaveConfirmDeleteSlot(slot); setPostSaveRenamingSlot(null); }
                          }}
                          className={`text-xs font-medium ${postSaveConfirmDeleteSlot === slot ? 'text-red-600 hover:text-red-800' : 'text-gray-400 hover:text-red-500'}`}
                        >
                          {postSaveConfirmDeleteSlot === slot ? 'Confirm?' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <CoworkAndWhen />
          <Button onClick={onCustomize} variant="secondary" className="w-full">Change Settings</Button>
        </div>
      </div>
    );
  }

  // ── Main view ──
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back to settings</button>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Settings Updated</h2>
        <p className="mt-1 text-gray-500">Here are your updated settings:</p>
      </div>

      <SettingsDisplay settings={localS} onChange={handleLocalChange} />

      <p className="text-center text-sm font-medium text-gray-600">What would you like to do?</p>

      {subView === 'save-default-confirm' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm text-amber-900">This will replace your current defaults. Your new defaults will be used for all future sessions unless you reset them.</p>
          <div className="flex gap-3">
            <Button onClick={() => { setSubView(null); onSaveAsDefault(localS); }} className="flex-1">Confirm</Button>
            <Button onClick={() => setSubView(null)} variant="secondary" className="flex-1">Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {/* Save Changes to [preset/room] */}
        {editContext && onSaveToContext && (
          <>
            {saveContextError && <p className="text-sm text-red-600">{saveContextError}</p>}
            <Button
              onClick={async () => {
                setSavingContext(true);
                setSaveContextError('');
                try {
                  await onSaveToContext(localS);
                } catch (e) {
                  setSaveContextError(String(e));
                  setSavingContext(false);
                }
              }}
              disabled={savingContext}
              className="w-full"
            >
              {savingContext
                ? 'Saving…'
                : editContext.type === 'preset'
                  ? `Save Changes to Preset: ${editContext.name}`
                  : `Save Changes to Coworking Room: ${editContext.name}`}
            </Button>
          </>
        )}
        {!savedSlot && (
          <Button onClick={() => { setPresetName(autoName); setSavedSlot(null); setConfirmOverwrite(null); setSubView('preset-naming'); }} variant="secondary" className="w-full">
            {editContext?.type === 'preset' ? 'Save as a New Preset' : 'Save as a Preset'}
          </Button>
        )}
        {!savedSlot && subView !== 'save-default-confirm' && (
          <Button onClick={() => setSubView('save-default-confirm')} variant="secondary" className="w-full">
            Save as Default
          </Button>
        )}

        <CoworkAndWhen />
      </div>
    </div>
  );
}
