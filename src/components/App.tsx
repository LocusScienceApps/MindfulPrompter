'use client';

import { useState, useEffect, useRef } from 'react';
import type { Screen, Settings, SessionStats, CoworkRoom, PersistedCoworkSession, EditContext, PresetSlot } from '@/lib/types';
import { getDefaults } from '@/lib/defaults';
import { initStorage, getDefaults as getStoredDefaults, saveDefaults, savePreset, clearDefaults, getSoloSchedule, clearSoloSchedule } from '@/lib/storage';
import { registerServiceWorker } from '@/lib/registerSW';
import Main from './screens/Main';
import NotificationBanner from './ui/NotificationBanner';
import HelpModal from './ui/HelpModal';
import Customize from './screens/Customize';
import SettingsUpdated from './screens/Summary';
import ScheduledStart from './screens/ScheduledStart';
import Timer from './screens/Timer';
import SessionComplete from './screens/SessionComplete';
import { buildHostSettings, buildGuestSettings, getRoom, computeRoomTiming, updateRoom, computeMostRecentOccurrence, computeNextOccurrence } from '@/lib/cowork';
import type { GuestContentMode, CoworkTimingSettings } from '@/lib/types';

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
  const [editContext, setEditContext] = useState<EditContext | null>(null);

  // Solo schedule notice state
  const [upcomingSessionMs, setUpcomingSessionMs] = useState<number | null>(null);
  const [activeSessionMs, setActiveSessionMs] = useState<number | null>(null);
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
              // Restore cowork state but show scheduled-start countdown
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
      const schedule = getSoloSchedule();
      if (!schedule) {
        setUpcomingSessionMs(null);
        setActiveSessionMs(null);
        return;
      }

      const now = Date.now();

      if (schedule.type === 'specific') {
        const targetMs = new Date(`${schedule.date}T${schedule.time}`).getTime();
        if (isNaN(targetMs)) return;
        const diff = targetMs - now;
        if (diff > 0 && diff <= 5 * 60 * 1000) {
          setUpcomingSessionMs(targetMs);
          setActiveSessionMs(null);
        } else if (diff <= 0 && diff > -60 * 60 * 1000) {
          setActiveSessionMs(targetMs);
          setUpcomingSessionMs(null);
        } else {
          setUpcomingSessionMs(null);
          setActiveSessionMs(null);
        }
      } else if (schedule.type === 'recurring') {
        const rule = { days: schedule.days, time: schedule.time, timezone: schedule.timezone, durationMinutes: 0 };
        const mostRecent = computeMostRecentOccurrence(rule, now);
        const next = computeNextOccurrence(rule, now);

        if (mostRecent !== null) {
          const elapsed = now - mostRecent;
          if (elapsed < 60 * 60 * 1000) {
            setActiveSessionMs(mostRecent);
            setUpcomingSessionMs(null);
            return;
          }
        }
        if (next !== null) {
          const diff = next - now;
          if (diff > 0 && diff <= 5 * 60 * 1000) {
            setUpcomingSessionMs(next);
            setActiveSessionMs(null);
            return;
          }
        }
        setUpcomingSessionMs(null);
        setActiveSessionMs(null);
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [storageReady]);

  const handleStartWithDefaults = () => {
    setCoworkRoomCode(null);
    setCoworkStartTime(null);
    setIsCoworkHost(false);
    setSessionStats(null);
    setScreen('timer');
  };

  const handleScheduledStart = (startMs: number) => {
    setCoworkStartTime(startMs);
    setScreen('scheduled-start');
  };

  const handleCustomize = () => {
    setScreen('customize');
  };

  const handleCustomizeDone = (customSettings: Settings) => {
    setSettings(customSettings);
    setScreen('settings-updated');
  };

  const handleStartDirectly = (customSettings: Settings) => {
    setSettings(customSettings);
    setCoworkRoomCode(null);
    setCoworkStartTime(null);
    setIsCoworkHost(false);
    setSessionStats(null);
    setScreen('timer');
  };

  const handleResetToOriginal = () => {
    clearDefaults();
    setSettings(getDefaults());
    setEditContext(null);
    setScreen('main');
  };

  const handleLoadDefaults = () => { setSettings(getInitialSettings()); setEditContext(null); };

  const isAtDefaults =
    JSON.stringify(settings) === JSON.stringify(getInitialSettings());

  const handleSaveAsDefault = (s: Settings) => {
    saveDefaults(s);
    setSettings(s);
    setScreen('main');
  };

  const handleLoadPreset = (presetSettings: Settings, slot?: PresetSlot, name?: string) => {
    setSettings(presetSettings);
    setEditContext(slot && name ? { type: 'preset', slot, name } : null);
  };

  const handleLoadRoom = (room: CoworkRoom) => {
    const base = buildHostSettings(room, settings);
    const loaded = room.sharePrompts && room.promptSettings ? {
      ...base,
      useMindfulness: true,
      promptText: room.promptSettings.promptText,
      promptIntervalMinutes: room.promptSettings.promptIntervalMinutes,
      dismissSeconds: room.promptSettings.dismissSeconds,
      promptCount: room.promptSettings.promptCount,
      bothMindfulnessScope: room.promptSettings.bothMindfulnessScope,
    } : base;
    setSettings(loaded);
    setEditContext({ type: 'cowork-room', code: room.code, name: room.name ?? room.code });
  };

  const handleSaveToContext = async (s: Settings) => {
    setSettings(s);
    if (editContext?.type === 'preset') {
      savePreset(editContext.slot, { name: editContext.name, settings: s });
      setEditContext(null);
      setScreen('main');
    } else if (editContext?.type === 'cowork-room') {
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
      await updateRoom(editContext.code, {
        mindfulnessOnly: !s.useTimedWork,
        timingSettings,
        sharePrompts: s.useMindfulness,
        promptSettings: s.useMindfulness ? {
          promptText: s.promptText,
          promptIntervalMinutes: s.promptIntervalMinutes,
          dismissSeconds: s.dismissSeconds,
          promptCount: s.promptCount,
          bothMindfulnessScope: s.bothMindfulnessScope ?? 'work-only',
        } : undefined,
      });
      setEditContext(null);
      setScreen('main');
    }
  };

  const handleBeginSession = () => {
    setCoworkRoomCode(null);
    setCoworkStartTime(null);
    setIsCoworkHost(false);
    setSessionStats(null);
    setScreen('timer');
  };

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

  const handleCoworkHostStart = (room: CoworkRoom, startMs: number) => {
    const hostSettings = buildHostSettings(room, settings);
    setSettings(hostSettings);
    setCoworkRoomCode(room.code);
    setIsCoworkHost(true);
    setSessionStats(null);
    const timing = computeRoomTiming(room);
    const effectiveStartMs = timing?.startMs ?? startMs;
    const persisted: PersistedCoworkSession = {
      roomCode: room.code,
      role: 'host',
      contentMode: 'host-prompts',
      startMs: effectiveStartMs,
    };
    localStorage.setItem(COWORK_SESSION_KEY, JSON.stringify(persisted));
    setCoworkStartTime(effectiveStartMs);
    if (timing?.isFuture) {
      setScreen('scheduled-start');
    } else {
      setScreen('timer');
    }
  };

  const handleCoworkGuestStart = (
    room: CoworkRoom,
    guestMode: GuestContentMode,
    startMs: number,
  ) => {
    const guestSettings = buildGuestSettings(room, guestMode);
    setSettings(guestSettings);
    setCoworkRoomCode(room.code);
    setCoworkStartTime(startMs);
    setIsCoworkHost(false);
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

  const handleHostEndSession = () => {
    localStorage.removeItem(COWORK_SESSION_KEY);
    setCoworkRoomCode(null);
    setCoworkStartTime(null);
    setIsCoworkHost(false);
    setScreen('main');
  };

  // ── Solo schedule notice helpers ──

  const handleCancelSchedule = () => {
    clearSoloSchedule();
    setUpcomingSessionMs(null);
    setActiveSessionMs(null);
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
          ) : (
            <div />
          )}
          <button
            onClick={() => setShowHelp(true)}
            className="text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors"
          >
            Help / FAQ
          </button>
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
                    onClick={handleCancelSchedule}
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
            onStart={handleStartWithDefaults}
            onScheduledStart={handleScheduledStart}
            onCustomize={handleCustomize}
            onLoadPreset={handleLoadPreset}
            onLoadRoom={handleLoadRoom}
            onSettingsChange={setSettings}
            onCoworkHostStart={handleCoworkHostStart}
            onCoworkGuestStart={handleCoworkGuestStart}
            isAtDefaults={isAtDefaults}
            onLoadDefaults={handleLoadDefaults}
          />
          </>
        )}

        {screen === 'customize' && (
          <Customize
            settings={settings}
            onDone={handleCustomizeDone}
            onStartDirectly={handleStartDirectly}
            onResetToOriginal={handleResetToOriginal}
            onBack={() => setScreen('main')}
          />
        )}

        {screen === 'settings-updated' && (
          <SettingsUpdated
            settings={settings}
            onBegin={handleBeginSession}
            onScheduledStart={handleScheduledStart}
            onSaveAsDefault={handleSaveAsDefault}
            onBack={() => setScreen('customize')}
            onCustomize={handleCustomize}
            onLoadPreset={handleLoadPreset}
            onLoadRoom={handleLoadRoom}
            onCoworkHostStart={handleCoworkHostStart}
            onSettingsChange={setSettings}
            editContext={editContext}
            onSaveToContext={handleSaveToContext}
          />
        )}

        {screen === 'scheduled-start' && (
          <ScheduledStart
            startMs={coworkStartTime ?? Date.now()}
            onStart={coworkRoomCode
              ? () => { setSessionStats(null); setScreen('timer'); }
              : handleBeginSession}
            onBack={() => setScreen('main')}
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
