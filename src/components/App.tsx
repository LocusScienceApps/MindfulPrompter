'use client';

import { useState, useEffect, useRef } from 'react';
import type { Screen, Settings, SessionStats, CoworkRoom, PersistedCoworkSession, TemplateSlot } from '@/lib/types';
import { getDefaults } from '@/lib/defaults';
import { initStorage, getDefaults as getStoredDefaults, saveDefaults, saveTemplate, clearDefaults, getSoloSchedules, deleteSoloSchedule, addRecentSession } from '@/lib/storage';
import { registerServiceWorker } from '@/lib/registerSW';
import Main from './screens/Main';
import NotificationBanner from './ui/NotificationBanner';
import HelpModal from './ui/HelpModal';
import WhyProsochaiModal from './ui/WhyProsochaiModal';
import SettingsModal from './ui/SettingsModal';
import ScheduledStart from './screens/ScheduledStart';
import Timer from './screens/Timer';
import SessionComplete from './screens/SessionComplete';
import {
  buildHostSettings,
  buildGuestSettings,
  loadCoworkSessionAsSettings,
  getRoom,
  computeRoomTiming,
  updateRoom,
  createRoom,
  endRoom,
  computeMostRecentOccurrence,
  computeNextOccurrence,
} from '@/lib/cowork';
import type { GuestContentMode, CoworkTimingSettings } from '@/lib/types';
import type { NewRoomInput } from '@/lib/cowork';

const COWORK_SESSION_KEY = 'mindful-prompter-cowork-session';

/** Merge factory defaults with any saved custom defaults. */
function getInitialSettings(): Settings {
  const factory = getDefaults();
  const saved = getStoredDefaults();
  return { ...factory, ...saved };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('main');
  const [settings, setSettings] = useState<Settings>(getDefaults());
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [coworkStartTime, setCoworkStartTime] = useState<number | null>(null);
  const [coworkRoomCode, setCoworkRoomCode] = useState<string | null>(null);
  const [isCoworkHost, setIsCoworkHost] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editDirty, setEditDirty] = useState(false);

  // Code of the currently-loaded cowork session on Main (distinct from coworkRoomCode
  // which tracks the active timer session). Used for "Save changes to session" logic.
  const [loadedRoomCode, setLoadedRoomCode] = useState<string | null>(null);

  // Solo schedule notice state
  const [upcomingSessionMs, setUpcomingSessionMs] = useState<number | null>(null);
  const [upcomingSessionId, setUpcomingSessionId] = useState<string | null>(null);
  const [activeSessionMs, setActiveSessionMs] = useState<number | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [cancelScheduleConfirm, setCancelScheduleConfirm] = useState(false);

  useEffect(() => {
    registerServiceWorker();
    initStorage().then(async () => {
      setSettings(getInitialSettings());

      // Auto-rejoin cowork session on page refresh
      try {
        const raw = localStorage.getItem(COWORK_SESSION_KEY);
        if (raw) {
          const persisted = JSON.parse(raw) as PersistedCoworkSession;
          const room = await getRoom(persisted.roomCode);
          if (room) {
            const timing = computeRoomTiming(room);
            if (timing && timing.isActive) {
              if (persisted.role === 'host') {
                const hostSettings = buildHostSettings(room, getInitialSettings());
                setSettings(hostSettings);
                setCoworkRoomCode(persisted.roomCode);
                setCoworkStartTime(timing.startMs);
                setIsCoworkHost(true);
              } else {
                const guestSettings = buildGuestSettings(room, persisted.contentMode);
                setSettings(guestSettings);
                setCoworkRoomCode(persisted.roomCode);
                setCoworkStartTime(timing.startMs);
                setIsCoworkHost(false);
              }
              setSessionStats(null);
              setScreen('timer');
            } else if (timing?.isFuture) {
              setCoworkRoomCode(persisted.roomCode);
              setCoworkStartTime(timing.startMs);
              setIsCoworkHost(persisted.role === 'host');
              setSessionStats(null);
              setScreen('scheduled-start');
            } else {
              localStorage.removeItem(COWORK_SESSION_KEY);
            }
          } else {
            localStorage.removeItem(COWORK_SESSION_KEY);
          }
        }
      } catch {
        localStorage.removeItem(COWORK_SESSION_KEY);
      }

      setStorageReady(true);
    });
  }, []);

  // ── Solo schedule polling (every 30s on main screen) ──
  const screenRef = useRef(screen);
  screenRef.current = screen;
  useEffect(() => {
    if (!storageReady) return;

    const check = () => {
      if (screenRef.current !== 'main') return;
      const schedules = getSoloSchedules();
      if (!schedules.length) {
        setUpcomingSessionMs(null); setUpcomingSessionId(null);
        setActiveSessionMs(null); setActiveSessionId(null);
        return;
      }

      const now = Date.now();
      let foundActive: { ms: number; id: string } | null = null;
      let foundUpcoming: { ms: number; id: string } | null = null;

      for (const schedule of schedules) {
        if (schedule.type === 'specific') {
          const targetMs = new Date(`${schedule.date}T${schedule.time}`).getTime();
          if (isNaN(targetMs)) continue;
          const diff = targetMs - now;
          if (diff <= 0 && diff > -60 * 60 * 1000) {
            if (!foundActive) foundActive = { ms: targetMs, id: schedule.id };
          } else if (diff > 0 && diff <= 5 * 60 * 1000) {
            if (!foundUpcoming || targetMs < foundUpcoming.ms) foundUpcoming = { ms: targetMs, id: schedule.id };
          }
        } else if (schedule.type === 'recurring') {
          const rule = { days: schedule.days, time: schedule.time, timezone: schedule.timezone, durationMinutes: 0 };
          const mostRecent = computeMostRecentOccurrence(rule, now);
          const next = computeNextOccurrence(rule, now);
          if (mostRecent !== null && now - mostRecent < 60 * 60 * 1000) {
            if (!foundActive) foundActive = { ms: mostRecent, id: schedule.id };
          } else if (next !== null && next - now > 0 && next - now <= 5 * 60 * 1000) {
            if (!foundUpcoming || next < foundUpcoming.ms) foundUpcoming = { ms: next, id: schedule.id };
          }
        }
      }

      setActiveSessionMs(foundActive?.ms ?? null); setActiveSessionId(foundActive?.id ?? null);
      setUpcomingSessionMs(foundUpcoming?.ms ?? null); setUpcomingSessionId(foundUpcoming?.id ?? null);
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [storageReady]);

  // ── Session start handlers ──

  const handleStartSolo = () => {
    setCoworkRoomCode(null);
    setCoworkStartTime(null);
    setIsCoworkHost(false);
    setLoadedRoomCode(null);
    setSessionStats(null);
    addRecentSession({ settings, startedAt: Date.now(), isCoworking: false });
    setScreen('timer');
  };

  const handleScheduledStart = (startMs: number) => {
    setCoworkStartTime(startMs);
    setScreen('scheduled-start');
  };

  const handleBeginSession = () => {
    setCoworkRoomCode(null);
    setCoworkStartTime(null);
    setIsCoworkHost(false);
    setSessionStats(null);
    addRecentSession({ settings, startedAt: Date.now(), isCoworking: false });
    setScreen('timer');
  };

  // ── Settings save handlers (called from Main) ──

  const handleSaveAsDefault = (s: Settings) => {
    saveDefaults(s);
    setSettings(s);
  };

  const handleSaveTemplate = (slot: TemplateSlot, name: string, s: Settings) => {
    saveTemplate(slot, { name, settings: s });
  };

  const handleResetToOriginal = () => {
    clearDefaults();
    setSettings(getDefaults());
    setLoadedRoomCode(null);
  };

  const handleLoadDefaults = () => {
    setSettings(getInitialSettings());
    setLoadedRoomCode(null);
  };

  const isAtSoftwareDefaults =
    JSON.stringify({ ...getInitialSettings(), lockedFields: undefined }) ===
    JSON.stringify({ ...getDefaults(), lockedFields: undefined });

  // ── Preset / session loading ──

  const handleLoadPreset = (presetSettings: Settings, slot?: TemplateSlot, name?: string) => {
    void slot; void name; // slot/name no longer tracked in App state
    setSettings({ ...presetSettings, lockedFields: undefined });
    setLoadedRoomCode(null);
  };

  /** Called when the user clicks a session card on Main to load a hosted room. */
  const handleLoadSession = (room: CoworkRoom) => {
    const loaded = loadCoworkSessionAsSettings(room, 'host', settings);
    setSettings(loaded);
    setLoadedRoomCode(room.code);
  };

  /** Called when the host clicks Join on an existing room card in the Sessions section. */
  const handleJoinAsHost = (room: CoworkRoom, startMs: number) => {
    const hostSettings = buildHostSettings(room, settings);
    setSettings(hostSettings);
    setCoworkRoomCode(room.code);
    setIsCoworkHost(true);
    setLoadedRoomCode(null);
    setSessionStats(null);
    const persisted: PersistedCoworkSession = {
      roomCode: room.code,
      role: 'host',
      contentMode: 'host-prompts',
      startMs,
    };
    localStorage.setItem(COWORK_SESSION_KEY, JSON.stringify(persisted));
    setCoworkStartTime(startMs);
    if (startMs > Date.now()) {
      setScreen('scheduled-start');
    } else {
      setScreen('timer');
    }
  };

  /** Save settings changes back to the currently-loaded cowork room in Firebase. */
  const handleSaveToRoom = async (s: Settings) => {
    if (!loadedRoomCode) return;
    const timingSettings: CoworkTimingSettings = {
      workMinutes: s.workMinutes,
      breakMinutes: s.breakMinutes,
      sessionsPerSet: s.sessionsPerSet,
      multipleSets: s.multipleSets,
      longBreakMinutes: s.longBreakMinutes,
      numberOfSets: s.numberOfSets,
      hardBreak: s.hardBreak ?? false,
      playSound: s.playSound,
    };
    await updateRoom(loadedRoomCode, {
      mindfulnessOnly: !s.useTimedWork,
      timingSettings,
      sharePrompts: s.sharePrompts,
      promptSettings: s.useMindfulness ? {
        promptText: s.promptText,
        promptIntervalMinutes: s.promptIntervalMinutes,
        dismissSeconds: s.dismissSeconds,
        promptCount: s.promptCount,
        bothMindfulnessScope: s.bothMindfulnessScope ?? 'work-only',
      } : undefined,
    });
    setSettings(s);
  };

  // ── Cowork host: create room and start ──

  const handleHostStart = async (input: NewRoomInput, startMs: number | null) => {
    const code = await createRoom(input);
    const room = await getRoom(code);
    if (!room) return;
    const hostSettings = buildHostSettings(room, settings);
    setSettings(hostSettings);
    setCoworkRoomCode(code);
    setIsCoworkHost(true);
    setLoadedRoomCode(null);
    setSessionStats(null);
    const effectiveStartMs = startMs ?? Date.now();
    addRecentSession({ settings: hostSettings, startedAt: effectiveStartMs, isCoworking: true, roomCode: code });
    const persisted: PersistedCoworkSession = {
      roomCode: code,
      role: 'host',
      contentMode: 'host-prompts',
      startMs: effectiveStartMs,
    };
    localStorage.setItem(COWORK_SESSION_KEY, JSON.stringify(persisted));
    setCoworkStartTime(effectiveStartMs);
    if (startMs && startMs > Date.now()) {
      setScreen('scheduled-start');
    } else {
      setScreen('timer');
    }
  };

  // ── Cowork guest: join session ──

  const handleCoworkGuestStart = (
    room: CoworkRoom,
    guestMode: GuestContentMode,
    startMs: number,
  ) => {
    const guestSettings = buildGuestSettings(room, guestMode);
    addRecentSession({ settings: guestSettings, startedAt: startMs, isCoworking: true, roomCode: room.code });
    setSettings(guestSettings);
    setCoworkRoomCode(room.code);
    setCoworkStartTime(startMs);
    setIsCoworkHost(false);
    setLoadedRoomCode(null);
    setSessionStats(null);
    const persisted: PersistedCoworkSession = {
      roomCode: room.code,
      role: 'guest',
      contentMode: guestMode,
      startMs,
    };
    localStorage.setItem(COWORK_SESSION_KEY, JSON.stringify(persisted));
    setScreen('timer');
  };

  // ── Session end ──

  const handleSessionEnd = (stats: SessionStats) => {
    localStorage.removeItem(COWORK_SESSION_KEY);
    setSessionStats(stats);
    setScreen('session-complete');
  };

  const handleStartAgain = () => {
    setSessionStats(null);
    setScreen('timer');
  };

  const handleNewSession = () => {
    setCoworkRoomCode(null);
    setCoworkStartTime(null);
    setIsCoworkHost(false);
    setScreen('main');
  };

  const handleHostEndSession = () => {
    if (coworkRoomCode) void endRoom(coworkRoomCode);
    localStorage.removeItem(COWORK_SESSION_KEY);
    setCoworkRoomCode(null);
    setCoworkStartTime(null);
    setIsCoworkHost(false);
    setScreen('main');
  };

  // ── Solo schedule helpers ──

  const handleCancelSchedule = (id?: string) => {
    const targetId = id ?? upcomingSessionId ?? activeSessionId;
    if (targetId) deleteSoloSchedule(targetId);
    setUpcomingSessionMs(null); setUpcomingSessionId(null);
    setActiveSessionMs(null); setActiveSessionId(null);
    setCancelScheduleConfirm(false);
  };

  function formatRelativeMinutes(ms: number): string {
    const diff = Math.abs(ms - Date.now());
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'less than a minute';
    if (mins === 1) return '1 minute';
    return `${mins} minutes`;
  }

  if (!storageReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  const showUpcoming = screen === 'main' && upcomingSessionMs !== null;
  const showActive = screen === 'main' && activeSessionMs !== null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showWhy && <WhyProsochaiModal onClose={() => setShowWhy(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onResetToOriginal={handleResetToOriginal} isAtSoftwareDefaults={isAtSoftwareDefaults} />}
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Top bar */}
        <div className="mb-5 flex items-center justify-between">
          {screen !== 'main' && screen !== 'timer' ? (
            <button
              onClick={() => setScreen('main')}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo.png" alt="" className="h-5 w-auto shrink-0" />
              <span>Prosochai</span>
            </button>
          ) : editDirty ? (
            <button
              onClick={handleLoadDefaults}
              className="text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors underline"
            >
              Restore defaults
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowWhy(true)}
              className="text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors"
            >
              Why Prosochai?
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors"
            >
              Help / FAQ
            </button>
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              className="text-gray-400 hover:text-indigo-600 transition-colors"
            >
              ⚙
            </button>
          </div>
        </div>

        {/* ── Solo schedule notice ── */}
        {(showUpcoming || showActive) && (
          <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
            {showUpcoming && (
              <p className="text-sm font-medium text-indigo-900">
                ⏰ Your scheduled session starts in {formatRelativeMinutes(upcomingSessionMs!)}.
              </p>
            )}
            {showActive && (
              <p className="text-sm font-medium text-indigo-900">
                ▶ Your scheduled session started {formatRelativeMinutes(activeSessionMs!)} ago.
              </p>
            )}
            {cancelScheduleConfirm ? (
              <div className="space-y-2">
                <p className="text-xs text-indigo-800">Are you sure? This will delete your saved schedule.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCancelSchedule()}
                    className="text-xs font-medium text-red-600 hover:text-red-800"
                  >
                    Yes, cancel it
                  </button>
                  <button
                    onClick={() => setCancelScheduleConfirm(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Never mind
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 items-center flex-wrap">
                <button
                  onClick={() => setCancelScheduleConfirm(true)}
                  className="text-xs text-gray-500 hover:text-red-600 underline"
                >
                  {showActive ? 'Skip this session' : 'Cancel session'}
                </button>
                {showUpcoming && (
                  <button
                    onClick={() => handleScheduledStart(upcomingSessionMs!)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    → Go to session
                  </button>
                )}
                {showActive && (
                  <button
                    onClick={handleBeginSession}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    → Join now
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {screen === 'main' && (
          <>
            <NotificationBanner />
            <Main
              settings={settings}
              onSettingsChange={setSettings}
              onStart={handleStartSolo}
              onScheduledStart={handleScheduledStart}
              onSaveAsDefault={handleSaveAsDefault}
              onSavePreset={handleSaveTemplate}
              onLoadPreset={handleLoadPreset}
              onLoadSession={handleLoadSession}
              onSaveToRoom={handleSaveToRoom}
              onHostStart={handleHostStart}
              onJoinAsHost={handleJoinAsHost}
              onCoworkGuestStart={handleCoworkGuestStart}
              onDeleteSoloSchedule={handleCancelSchedule}
              onDirtyStateChange={setEditDirty}
              loadedRoomCode={loadedRoomCode}
            />
          </>
        )}

        {screen === 'scheduled-start' && (
          <ScheduledStart
            startMs={coworkStartTime ?? Date.now()}
            onStart={coworkRoomCode
              ? () => { setSessionStats(null); setScreen('timer'); }
              : handleBeginSession}
            onBack={() => { localStorage.removeItem(COWORK_SESSION_KEY); setCoworkRoomCode(null); setCoworkStartTime(null); setIsCoworkHost(false); setScreen('main'); }}
          />
        )}

        {screen === 'timer' && (
          <Timer
            settings={settings}
            coworkStartTime={coworkStartTime ?? undefined}
            coworkRoomCode={coworkRoomCode ?? undefined}
            isCoworkHost={isCoworkHost}
            onSessionComplete={handleSessionEnd}
            onStop={handleSessionEnd}
            onHostEndSession={handleHostEndSession}
          />
        )}

        {screen === 'session-complete' && (
          <SessionComplete
            settings={settings}
            stats={sessionStats}
            onStartAgain={handleStartAgain}
            onNewSession={handleNewSession}
          />
        )}
      </div>
    </div>
  );
}
