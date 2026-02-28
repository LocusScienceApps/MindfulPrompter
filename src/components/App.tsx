'use client';

import { useState, useEffect } from 'react';
import type { AppMode, Screen, Settings, SessionStats } from '@/lib/types';
import { getDefaults } from '@/lib/defaults';
import { getDefaultsForMode, saveDefaultsForMode } from '@/lib/storage';
import { registerServiceWorker } from '@/lib/registerSW';
import ModeSelect from './screens/ModeSelect';
import DefaultsReview from './screens/DefaultsReview';
import Customize from './screens/Customize';
import Summary from './screens/Summary';
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

  const handleStartWithDefaults = () => {
    setScreen('summary');
  };

  const handleCustomize = () => {
    setScreen('customize');
  };

  const handleCustomizeDone = (customSettings: Settings) => {
    setSettings(customSettings);
    setScreen('summary');
  };

  const handleSaveAsDefault = (s: Settings) => {
    saveDefaultsForMode(s.mode, s);
    setSettings(s);
    setScreen('defaults-review');
  };

  const handleLoadPreset = (presetSettings: Settings) => {
    setSettings(presetSettings);
    // Stay on defaults-review, which will re-render with the loaded settings
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
            onCustomize={handleCustomize}
            onEditDefaults={handleCustomize}
            onLoadPreset={handleLoadPreset}
            onBack={() => handleBack('mode-select')}
          />
        )}
        {screen === 'customize' && (
          <Customize
            settings={settings}
            onDone={handleCustomizeDone}
            onSaveAsDefault={handleSaveAsDefault}
            onBack={() => handleBack('defaults-review')}
          />
        )}
        {screen === 'summary' && (
          <Summary
            settings={settings}
            onBegin={handleBeginSession}
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
