'use client';

import { useState, useEffect } from 'react';
import type { AppMode, Screen, Settings, SessionStats } from '@/lib/types';
import { getDefaults } from '@/lib/defaults';
import { initStorage, getDefaultsForMode, saveDefaultsForMode, clearDefaultsForMode } from '@/lib/storage';
import { registerServiceWorker } from '@/lib/registerSW';
import ModeSelect from './screens/ModeSelect';
import DefaultsReview from './screens/DefaultsReview';
import Customize from './screens/Customize';
import SettingsUpdated from './screens/Summary';
import ScheduledStart from './screens/ScheduledStart';
import Timer from './screens/Timer';
import SessionComplete from './screens/SessionComplete';

/** Merge factory defaults with any saved custom defaults for the mode. */
function getSettingsForMode(mode: AppMode): Settings {
  const factory = getDefaults(mode);
  const saved = getDefaultsForMode(mode);
  return { ...factory, ...saved };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('mode-select');
  const [mode, setMode] = useState<AppMode>('both');
  const [settings, setSettings] = useState<Settings>(getSettingsForMode('both'));
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    registerServiceWorker();
    initStorage().then(() => {
      setSettings(getSettingsForMode('both'));
      setStorageReady(true);
    });
  }, []);

  const handleModeSelect = (selectedMode: AppMode) => {
    setMode(selectedMode);
    setSettings(getSettingsForMode(selectedMode));
    setScreen('defaults-review');
  };

  // "Start Session" on defaults-review — go directly to timer, skip review
  const handleStartWithDefaults = () => {
    setSessionStats(null);
    setScreen('timer');
  };

  const handleSchedule = () => {
    setScreen('scheduled-start');
  };

  const handleScheduleWithSettings = (s: Settings) => {
    setSettings(s);
    setScreen('scheduled-start');
  };

  const handleCustomize = () => {
    setScreen('customize');
  };

  // "Review Changes" — show the settings-updated review page
  const handleCustomizeDone = (customSettings: Settings) => {
    setSettings(customSettings);
    setScreen('settings-updated');
  };

  // "No changes made — Start Session" — skip review, go straight to timer
  const handleStartDirectly = (customSettings: Settings) => {
    setSettings(customSettings);
    setSessionStats(null);
    setScreen('timer');
  };

  // Reset to original defaults: clear saved overrides, reload factory, return to mode page
  const handleResetToOriginal = () => {
    clearDefaultsForMode(mode);
    setSettings(getSettingsForMode(mode));
    setScreen('defaults-review');
  };

  const handleSaveAsDefault = (s: Settings) => {
    saveDefaultsForMode(s.mode, s);
    setSettings(s);
    setScreen('defaults-review');
  };

  const handleLoadPreset = (presetSettings: Settings) => {
    setSettings(presetSettings);
    // Stay on defaults-review; it re-renders with the loaded settings
  };

  const handleBeginSession = () => {
    setSessionStats(null);
    setScreen('timer');
  };

  const handleSessionEnd = (stats: SessionStats) => {
    setSessionStats(stats);
    setScreen('session-complete');
  };

  const handleStartAgain = () => {
    setSessionStats(null);
    setScreen('timer');
  };

  const handleNewSession = () => {
    setScreen('mode-select');
  };

  const handleBack = (target: Screen) => {
    setScreen(target);
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
        {screen !== 'mode-select' && screen !== 'timer' && (
          <div className="mb-5">
            <button
              onClick={() => setScreen('mode-select')}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                <path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 8H3v5.5A1.5 1.5 0 0 0 4.5 15h2A.5.5 0 0 0 7 14.5V11h2v3.5a.5.5 0 0 0 .5.5h2a1.5 1.5 0 0 0 1.5-1.5V8h1.5a.5.5 0 0 0 .354-.854l-6-6z" />
              </svg>
              <span>MindfulPrompter</span>
            </button>
          </div>
        )}
        {screen === 'mode-select' && (
          <ModeSelect onSelect={handleModeSelect} />
        )}
        {screen === 'defaults-review' && (
          <DefaultsReview
            settings={settings}
            onStart={handleStartWithDefaults}
            onSchedule={handleSchedule}
            onCustomize={handleCustomize}
            onLoadPreset={handleLoadPreset}
            onBack={() => handleBack('mode-select')}
          />
        )}
        {screen === 'scheduled-start' && (
          <ScheduledStart
            settings={settings}
            onStart={handleStartWithDefaults}
            onBack={() => handleBack('defaults-review')}
          />
        )}
        {screen === 'customize' && (
          <Customize
            settings={settings}
            onDone={handleCustomizeDone}
            onStartDirectly={handleStartDirectly}
            onResetToOriginal={handleResetToOriginal}
            onBack={() => handleBack('defaults-review')}
          />
        )}
        {screen === 'settings-updated' && (
          <SettingsUpdated
            settings={settings}
            onBegin={handleBeginSession}
            onSchedule={handleSchedule}
            onSaveAsDefault={handleSaveAsDefault}
            onBack={() => handleBack('customize')}
            onCustomize={handleCustomize}
            onLoadPreset={handleLoadPreset}
          />
        )}
        {screen === 'timer' && (
          <Timer
            settings={settings}
            onSessionComplete={handleSessionEnd}
            onStop={handleSessionEnd}
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
