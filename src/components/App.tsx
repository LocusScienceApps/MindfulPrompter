'use client';

import { useState, useEffect } from 'react';
import type { Screen, Settings, SessionStats, CoworkRoom, PersistedCoworkSession } from '@/lib/types';
import { getDefaults } from '@/lib/defaults';
import { initStorage, getDefaults as getStoredDefaults, saveDefaults, clearDefaults } from '@/lib/storage';
import { registerServiceWorker } from '@/lib/registerSW';
import Main from './screens/Main';
import Customize from './screens/Customize';
import SettingsUpdated from './screens/Summary';
import ScheduledStart from './screens/ScheduledStart';
import Timer from './screens/Timer';
import SessionComplete from './screens/SessionComplete';
import { buildHostSettings, buildGuestSettings, getRoom, computeRoomTiming } from '@/lib/cowork';
import type { GuestContentMode } from '@/lib/types';

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
              // Rejoin
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
            } else {
              // Session ended — clear
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
    setScreen('main');
  };

  const handleSaveAsDefault = (s: Settings) => {
    saveDefaults(s);
    setSettings(s);
    setScreen('main');
  };

  const handleLoadPreset = (presetSettings: Settings) => {
    setSettings(presetSettings);
  };

  const handleBeginSession = () => {
    setCoworkRoomCode(null);
    setCoworkStartTime(null);
    setIsCoworkHost(false);
    setSessionStats(null);
    setScreen('timer');
  };

  const handleSessionEnd = (stats: SessionStats) => {
    // Clear cowork session persistence when session ends
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
    setCoworkStartTime(startMs);
    setIsCoworkHost(true);
    setSessionStats(null);
    // Persist for auto-rejoin
    const persisted: PersistedCoworkSession = {
      roomCode: room.code,
      role: 'host',
      contentMode: 'host-prompts',
      startMs,
    };
    localStorage.setItem(COWORK_SESSION_KEY, JSON.stringify(persisted));
    setScreen('timer');
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
    // Persist for auto-rejoin
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

  if (!storageReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {screen !== 'main' && screen !== 'timer' && (
          <div className="mb-5">
            <button
              onClick={() => setScreen('main')}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                <path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 8H3v5.5A1.5 1.5 0 0 0 4.5 15h2A.5.5 0 0 0 7 14.5V11h2v3.5a.5.5 0 0 0 .5.5h2a1.5 1.5 0 0 0 1.5-1.5V8h1.5a.5.5 0 0 0 .354-.854l-6-6z" />
              </svg>
              <span>MindfulPrompter</span>
            </button>
          </div>
        )}

        {screen === 'main' && (
          <Main
            settings={settings}
            onStart={handleStartWithDefaults}
            onScheduledStart={handleScheduledStart}
            onCustomize={handleCustomize}
            onLoadPreset={handleLoadPreset}
            onSettingsChange={setSettings}
            onCoworkHostStart={handleCoworkHostStart}
            onCoworkGuestStart={handleCoworkGuestStart}
          />
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
            onCoworkHostStart={handleCoworkHostStart}
          />
        )}

        {screen === 'scheduled-start' && (
          <ScheduledStart
            startMs={coworkStartTime ?? Date.now()}
            onStart={handleBeginSession}
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
