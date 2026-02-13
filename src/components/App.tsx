'use client';

import { useState, useEffect } from 'react';
import type { AppMode, Screen, Settings } from '@/lib/types';
import { getDefaults } from '@/lib/defaults';
import { registerServiceWorker } from '@/lib/registerSW';
import ModeSelect from './screens/ModeSelect';
import DefaultsReview from './screens/DefaultsReview';
import Customize from './screens/Customize';
import Summary from './screens/Summary';
import Timer from './screens/Timer';
import SessionComplete from './screens/SessionComplete';

export default function App() {
  const [screen, setScreen] = useState<Screen>('mode-select');
  const [mode, setMode] = useState<AppMode>('both');
  const [settings, setSettings] = useState<Settings>(getDefaults('both'));

  useEffect(() => {
    registerServiceWorker();
  }, []);

  const handleModeSelect = (selectedMode: AppMode) => {
    setMode(selectedMode);
    setSettings(getDefaults(selectedMode));
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

  const handleBeginSession = () => {
    setScreen('timer');
  };

  const handleSessionComplete = () => {
    setScreen('session-complete');
  };

  const handleStartAgain = () => {
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
            onBack={() => handleBack('mode-select')}
          />
        )}
        {screen === 'customize' && (
          <Customize
            settings={settings}
            onDone={handleCustomizeDone}
            onBack={() => handleBack('defaults-review')}
          />
        )}
        {screen === 'summary' && (
          <Summary
            settings={settings}
            onBegin={handleBeginSession}
            onBack={() => handleBack(settings === getDefaults(mode) ? 'defaults-review' : 'customize')}
          />
        )}
        {screen === 'timer' && (
          <Timer
            settings={settings}
            onSessionComplete={handleSessionComplete}
            onStop={() => handleSessionComplete()}
          />
        )}
        {screen === 'session-complete' && (
          <SessionComplete
            settings={settings}
            onStartAgain={handleStartAgain}
            onNewSession={handleNewSession}
          />
        )}
      </div>
    </div>
  );
}
