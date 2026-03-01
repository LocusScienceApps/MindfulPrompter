'use client';

import { useState, useEffect } from 'react';
import type { AppMode, Screen, Settings, SessionStats } from '@/lib/types';
import { getDefaults } from '@/lib/defaults';
import { getDefaultsForMode, saveDefaultsForMode, clearDefaultsForMode } from '@/lib/storage';
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

  useEffect(() => {
    registerServiceWorker();
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto max-w-lg px-4 py-8">
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
            onSchedule={handleScheduleWithSettings}
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
