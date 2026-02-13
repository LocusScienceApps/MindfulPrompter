'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Settings, TimerEvent, WorkerMessage } from '@/lib/types';
import { computeSchedule } from '@/lib/schedule';
import { formatCountdown } from '@/lib/format';
import { initAudio, playChime } from '@/lib/sound';
import ProgressRing from '../ui/ProgressRing';
import Button from '../ui/Button';
import NotificationOverlay from '../NotificationOverlay';

interface TimerProps {
  settings: Settings;
  onSessionComplete: () => void;
  onStop: () => void;
}

interface LogEntry {
  time: string;
  message: string;
}

function formatTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/** Determine the current phase from elapsed time and schedule */
function getCurrentPhase(
  elapsed: number,
  schedule: TimerEvent[],
  mode: Settings['mode']
): {
  phase: string;
  phaseLabel: string;
  phaseProgress: number;
  timeLeft: number;
  contextLines: string[];
} {
  let lastFired: TimerEvent | null = null;
  let nextEvent: TimerEvent | null = null;

  for (let i = 0; i < schedule.length; i++) {
    if (elapsed >= schedule[i].offsetSeconds) {
      lastFired = schedule[i];
    } else {
      nextEvent = schedule[i];
      break;
    }
  }

  if (!lastFired) {
    return {
      phase: 'waiting',
      phaseLabel: 'Starting...',
      phaseProgress: 0,
      timeLeft: nextEvent ? nextEvent.offsetSeconds - elapsed : 0,
      contextLines: [],
    };
  }

  const phaseStart = lastFired.offsetSeconds;
  const phaseEnd = nextEvent ? nextEvent.offsetSeconds : phaseStart + 1;
  const phaseDuration = phaseEnd - phaseStart;
  const phaseElapsed = elapsed - phaseStart;
  const timeLeft = Math.max(0, phaseEnd - elapsed);
  const phaseProgress = phaseDuration > 0 ? phaseElapsed / phaseDuration : 1;

  let phase = 'work';
  let phaseLabel = 'Working';
  const contextLines: string[] = [];

  switch (lastFired.type) {
    case 'work_start':
    case 'mindfulness':
      phase = 'work';
      phaseLabel = mode === 'mindfulness' ? 'Running' : 'Working';
      break;
    case 'short_break':
      phase = 'break';
      phaseLabel = 'Break';
      break;
    case 'long_break':
      phase = 'long_break';
      phaseLabel = 'Long Break';
      break;
    case 'session_complete':
      phase = 'complete';
      phaseLabel = 'Complete!';
      break;
  }

  // Context info — only show set/session for pomodoro modes
  if (mode !== 'mindfulness' && lastFired.setNumber > 0) {
    const setInfo = lastFired.setNumber > 0 ? `Set ${lastFired.setNumber}, ` : '';
    contextLines.push(`${setInfo}Session ${lastFired.globalSessionNumber}`);
  }

  // Next event countdown
  if (nextEvent) {
    if (phase === 'work' || phase === 'waiting') {
      if (mode === 'mindfulness') {
        contextLines.push(`Next prompt in ${formatCountdown(timeLeft)}`);
      } else if (nextEvent.type === 'mindfulness') {
        contextLines.push(`Next prompt in ${formatCountdown(timeLeft)}`);
      } else if (nextEvent.type === 'short_break' || nextEvent.type === 'long_break' || nextEvent.type === 'session_complete') {
        contextLines.push(`Break in ${formatCountdown(timeLeft)}`);
      }
    }
  }

  return { phase, phaseLabel, phaseProgress, timeLeft, contextLines };
}

/** Request notification permission */
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/** Send a browser notification */
function sendBrowserNotification(event: TimerEvent) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const body = event.promptText
    ? `${event.promptText}${event.body ? '\n' + event.body : ''}`
    : event.body || event.title;

  new Notification(event.promptText || event.title || 'MindfulPrompter', {
    body: body.replace(/\n/g, ' '),
    tag: 'mindful-prompter',
    icon: '/icon-192x192.png',
  });
}

export default function Timer({ settings, onSessionComplete, onStop }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [currentEvent, setCurrentEvent] = useState<TimerEvent | null>(null);
  const [log, setLog] = useState<LogEntry[]>([{ time: formatTime(), message: 'Session started' }]);
  const [showOverlay, setShowOverlay] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const scheduleRef = useRef<TimerEvent[]>([]);
  const startTimeRef = useRef<number>(Date.now()); // Stable start time across re-mounts
  const logEndRef = useRef<HTMLDivElement>(null);
  // Use a ref for settings so the worker callback always reads current values
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Initialize audio and request notification permission once
  useEffect(() => {
    initAudio();
    requestNotificationPermission();
  }, []);

  // Start the worker — re-creates on strict mode remount but uses stable start time
  useEffect(() => {
    const schedule = computeSchedule(settings);
    scheduleRef.current = schedule;

    const worker = new Worker('/timer-worker.js');
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;

      if (msg.type === 'tick') {
        setElapsed(msg.elapsed);
      }

      if (msg.type === 'event') {
        const event = msg.event;

        // Skip silent events (e.g., initial session start)
        if (event.silent) return;

        setCurrentEvent(event);
        setShowOverlay(true);

        // Play sound
        if (settingsRef.current.playSound) {
          playChime();
        }

        // Browser notification
        sendBrowserNotification(event);

        // Event log
        const logMsg =
          event.type === 'mindfulness'
            ? 'Mindfulness prompt'
            : event.type === 'short_break'
              ? 'Break started'
              : event.type === 'long_break'
                ? 'Long break started'
                : event.type === 'session_complete'
                  ? 'Session complete!'
                  : event.title || 'Work session started';
        setLog((prev) => [...prev, { time: formatTime(), message: logMsg }]);
      }
    };

    worker.postMessage({
      type: 'start',
      schedule,
      startTime: startTimeRef.current,
    });

    return () => {
      worker.postMessage({ type: 'stop' });
      worker.terminate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps — runs once, uses refs for everything

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const handleDismissOverlay = useCallback(() => {
    setShowOverlay(false);
    if (currentEvent?.type === 'session_complete') {
      onSessionComplete();
    }
  }, [currentEvent, onSessionComplete]);

  const handleStop = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
      workerRef.current.terminate();
    }
    onStop();
  };

  const { phase, phaseLabel, phaseProgress, timeLeft, contextLines } =
    getCurrentPhase(elapsed, scheduleRef.current, settings.mode);

  const ringColor =
    {
      work: 'stroke-indigo-500',
      break: 'stroke-amber-500',
      long_break: 'stroke-orange-500',
      complete: 'stroke-purple-500',
      waiting: 'stroke-gray-400',
    }[phase] || 'stroke-indigo-500';

  return (
    <div className="space-y-6">
      {/* Phase label */}
      <div className="text-center">
        <span
          className={`inline-block rounded-full px-4 py-1 text-sm font-semibold ${
            phase === 'work'
              ? 'bg-indigo-100 text-indigo-700'
              : phase === 'break'
                ? 'bg-amber-100 text-amber-700'
                : phase === 'long_break'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-purple-100 text-purple-700'
          }`}
        >
          {phaseLabel}
        </span>
      </div>

      {/* Progress ring */}
      <div className="flex justify-center">
        <ProgressRing
          progress={phaseProgress}
          label={formatCountdown(timeLeft)}
          subLabel={contextLines[0]}
          colorClass={ringColor}
        />
      </div>

      {/* Additional context */}
      {contextLines.length > 1 && (
        <div className="text-center">
          {contextLines.slice(1).map((line, i) => (
            <p key={i} className="text-sm text-gray-500">
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Event log */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <h3 className="border-b border-gray-100 px-4 py-2 text-sm font-semibold text-gray-500">
          Event Log
        </h3>
        <div className="max-h-40 overflow-y-auto px-4 py-2">
          {log.map((entry, i) => (
            <div key={i} className="flex gap-2 py-1 text-sm">
              <span className="whitespace-nowrap text-gray-400">
                {entry.time}
              </span>
              <span className="text-gray-700">{entry.message}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* Stop button */}
      <Button onClick={handleStop} variant="secondary" className="w-full">
        Stop Session
      </Button>

      {/* Notification overlay */}
      {showOverlay && currentEvent && (
        <NotificationOverlay
          event={currentEvent}
          dismissSeconds={settings.dismissSeconds}
          onDismiss={handleDismissOverlay}
        />
      )}
    </div>
  );
}
