'use client';

import { useState, useRef } from 'react';
import type { Settings, PresetSlot, MindfulnessScope, CoworkRoom } from '@/lib/types';
import { formatNum } from '@/lib/format';
import { getPresetSlots, savePreset, listPresets, renamePreset, deletePreset } from '@/lib/storage';
import { generatePresetName } from '@/lib/defaults';
import { createRoom, getRoom, computeRoomTiming } from '@/lib/cowork';
import Button from '../ui/Button';

interface SettingsUpdatedProps {
  settings: Settings;
  onBegin: () => void;
  onScheduledStart: (startMs: number) => void;
  onSaveAsDefault: (s: Settings) => void;
  onBack: () => void;
  onCustomize: () => void;
  onLoadPreset: (settings: Settings) => void;
  onCoworkHostStart: (room: CoworkRoom, startMs: number) => void;
}

type SubView = null | 'preset-naming' | 'preset-slots' | 'save-default-confirm';

function scopeLabel(scope: MindfulnessScope | undefined): string {
  switch (scope) {
    case 'breaks':      return 'Intervals + at each break';
    case 'work-starts': return 'Intervals + returning from breaks';
    case 'all':         return 'All popups';
    default:            return 'At work intervals only';
  }
}

function settingsLabel(s: Settings): string {
  if (s.useTimedWork && s.useMindfulness) return 'Timed Work + Mindfulness Prompts';
  if (s.useTimedWork) return 'Timed Work Sessions';
  return 'Mindfulness Prompts Only';
}

export default function SettingsUpdated({
  settings: s,
  onBegin,
  onScheduledStart,
  onSaveAsDefault,
  onBack,
  onCustomize,
  onLoadPreset,
  onCoworkHostStart,
}: SettingsUpdatedProps) {
  const autoName = generatePresetName(s);

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

  // Host panel
  const [expandHost, setExpandHost] = useState(false);
  const [hostRoomName, setHostRoomName] = useState('Room 1');
  const [hostSharePrompts, setHostSharePrompts] = useState(true);
  const [hostGenerating, setHostGenerating] = useState(false);
  const [hostError, setHostError] = useState('');
  const [generatedRoom, setGeneratedRoom] = useState<CoworkRoom | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Schedule panel
  const [expandSchedule, setExpandSchedule] = useState(false);
  const [specificDate, setSpecificDate] = useState('');
  const [specificTime, setSpecificTime] = useState('');

  const refreshPostSavePresets = () => setPostSavePresets(listPresets());

  const handleSavePreset = (slot: PresetSlot) => {
    const name = presetName.trim() || autoName;
    savePreset(slot, { name, settings: s });
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
      const code = await createRoom({
        type: 'public',
        name: hostRoomName.trim() || 'Room 1',
        mindfulnessOnly: !s.useTimedWork,
        timingSettings: {
          workMinutes: s.workMinutes,
          breakMinutes: s.breakMinutes,
          sessionsPerSet: s.sessionsPerSet,
          multipleSets: s.multipleSets,
          longBreakMinutes: s.longBreakMinutes,
          numberOfSets: s.numberOfSets,
          hardBreak: s.hardBreak ?? false,
          playSound: s.playSound,
        },
        sharePrompts: s.useMindfulness ? hostSharePrompts : false,
        promptSettings: (s.useMindfulness && hostSharePrompts) ? {
          promptText: s.promptText,
          promptIntervalMinutes: s.promptIntervalMinutes,
          dismissSeconds: s.dismissSeconds,
          promptCount: s.promptCount,
          bothMindfulnessScope: s.bothMindfulnessScope ?? 'work-only',
        } : undefined,
        startTime: Date.now(),
      });
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

  // ── Settings summary (shared by main view and post-save view) ──
  const SettingsSummary = () => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <dl className="space-y-3">
        {s.useTimedWork && (
          <>
            <SettingRow label="Work periods" value={`${formatNum(s.workMinutes)} minutes`} />
            <SettingRow label="Breaks" value={`${formatNum(s.breakMinutes)} minutes`} />
            {s.hardBreak && <SettingRow label="Lock screen during breaks" value="Yes" />}
            <SettingRow label="Periods per set" value={s.sessionsPerSet === 0 ? '∞ (unlimited)' : String(s.sessionsPerSet)} />
            {s.multipleSets && (
              <>
                <SettingRow label="Long break" value={`${formatNum(s.longBreakMinutes)} minutes`} />
                <SettingRow label="Number of sets" value={s.numberOfSets === 0 ? 'Unlimited' : String(s.numberOfSets)} />
              </>
            )}
          </>
        )}
        {s.useMindfulness && (
          <>
            <SettingRow label="Mindfulness prompts" value="On" />
            <SettingRow label="Prompt" value={`"${s.promptText}"`} />
            <SettingRow label="Prompt every" value={`${formatNum(s.promptIntervalMinutes)} minutes`} />
            <SettingRow label="Dismiss delay" value={`${s.dismissSeconds} seconds`} />
            {!s.useTimedWork && (
              <SettingRow label="Runs" value={s.promptCount > 0 ? `${s.promptCount} prompt${s.promptCount !== 1 ? 's' : ''} then stops` : 'Indefinitely (until stopped)'} />
            )}
            {s.useTimedWork && (
              <SettingRow label="Mindfulness shows" value={scopeLabel(s.bothMindfulnessScope)} />
            )}
          </>
        )}
        {!s.useMindfulness && <SettingRow label="Mindfulness prompts" value="Off" />}
        <SettingRow label="Sound" value={s.playSound ? 'On' : 'Off'} />
      </dl>
    </div>
  );

  // ── Inline panels (shared between main and post-save views) ──
  const InlinePanels = () => (
    <>
      {/* Host panel */}
      <button
        type="button"
        onClick={() => setExpandHost((v) => !v)}
        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:border-indigo-300 transition-colors text-left"
      >
        Make this a Hosted Coworking Session ▼
      </button>

      {expandHost && (
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
              {s.useMindfulness && (
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

      {/* Schedule panel */}
      <button
        type="button"
        onClick={() => setExpandSchedule((v) => !v)}
        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:border-indigo-300 transition-colors text-left"
      >
        Schedule Start Time ▼
      </button>

      {expandSchedule && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex gap-3 flex-wrap">
            <input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} className="rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
            <input type="time" value={specificTime} onChange={(e) => setSpecificTime(e.target.value)} className="rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
          </div>
          {specificDate && specificTime && (
            <Button
              onClick={() => {
                const ms = new Date(`${specificDate}T${specificTime}`).getTime();
                if (!isNaN(ms)) onScheduledStart(ms);
              }}
              className="w-full"
            >
              Schedule Session
            </Button>
          )}
        </div>
      )}
    </>
  );

  // ── Post-save view ──
  if (savedSlot !== null) {
    const indicator = { slot: postSaveSelectedSlot ?? savedSlot, name: postSaveSelectedName || savedPresetName };

    return (
      <div className="space-y-6">
        <button onClick={onBack} className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back to settings</button>

        <div className="text-center">
          <h2 className="text-2xl font-bold leading-tight">
            <span className="text-indigo-600">{settingsLabel(s)}</span>
          </h2>
          <p className="mt-1 text-gray-500">Current settings</p>
          {indicator.slot && indicator.name && (
            <p className="mt-1 text-sm text-indigo-600">Preset selected: {indicator.slot} — {indicator.name}</p>
          )}
        </div>

        <SettingsSummary />

        {postSavePresets.length > 0 && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="mb-3 text-sm font-semibold text-indigo-700">Saved presets</p>
            <div className="space-y-2">
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
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button onClick={onBegin} className="w-full text-lg">Start Session</Button>
          <InlinePanels />
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
        <h2 className="text-2xl font-bold leading-tight">
          <span className="text-indigo-600">{settingsLabel(s)}</span>
          <span className="text-gray-700 font-medium"> Settings Updated</span>
        </h2>
        <p className="mt-1 text-gray-500">Here are your updated settings:</p>
      </div>

      <SettingsSummary />

      <p className="text-center text-sm font-medium text-gray-600">What would you like to do?</p>

      {subView === 'save-default-confirm' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm text-amber-900">This will replace your current defaults. Your new defaults will be used for all future sessions unless you reset them.</p>
          <div className="flex gap-3">
            <Button onClick={() => { setSubView(null); onSaveAsDefault(s); }} className="flex-1">Confirm</Button>
            <Button onClick={() => setSubView(null)} variant="secondary" className="flex-1">Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {!savedSlot && (
          <Button onClick={() => { setPresetName(autoName); setSavedSlot(null); setConfirmOverwrite(null); setSubView('preset-naming'); }} variant="secondary" className="w-full">
            Save as a Preset
          </Button>
        )}
        {!savedSlot && subView !== 'save-default-confirm' && (
          <Button onClick={() => setSubView('save-default-confirm')} variant="secondary" className="w-full">
            Save as Default
          </Button>
        )}
        <Button onClick={onBegin} className="w-full">
          Start Session (use new settings for this session only)
        </Button>
        <InlinePanels />
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
