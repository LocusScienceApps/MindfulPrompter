'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Settings, TimerEvent, SessionStats } from '@/lib/types';
import { computeSchedule } from '@/lib/schedule';
import { formatCountdown } from '@/lib/format';
import { initAudio, playChime } from '@/lib/sound';
import { isTauri, showNotificationWindow, onNotificationDismissed } from '@/lib/tauri';
import ProgressRing from '../ui/ProgressRing';
import Button from '../ui/Button';
import NotificationOverlay from '../NotificationOverlay';

interface TimerProps {
  settings: Settings;
  onSessionComplete: (stats: SessionStats) => void;
  onStop: (stats: SessionStats) => void;
  /** External start time (ms) for cowork sessions. If omitted, uses Date.now(). */
  coworkStartTime?: number;
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
  detailLine: React.ReactNode | null;
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
      detailLine: null,
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
  let detailLine: React.ReactNode | null = null;

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

  // Context info — only show set/period for pomodoro modes
  if (mode !== 'mindfulness' && lastFired.setNumber > 0) {
    const { setNumber, sessionNumber, totalSets, periodsPerSet } = lastFired;

    if (totalSets > 1) {
      // Multiple defined sets: "Set 2, Period 3" + detail line below
      contextLines.push(`Set ${setNumber}, Period ${sessionNumber}`);
      if (periodsPerSet > 0) {
        detailLine = (
          <span>
            out of {totalSets} <em>{periodsPerSet}-period</em> sets
          </span>
        );
      }
    } else if (periodsPerSet > 0) {
      // Single set, finite periods: "Period 3 of 4"
      contextLines.push(`Period ${sessionNumber} of ${periodsPerSet}`);
    } else {
      // Single set, unlimited periods: "Period 3"
      contextLines.push(`Period ${sessionNumber}`);
    }
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

  return { phase, phaseLabel, phaseProgress, timeLeft, contextLines, detailLine };
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

export default function Timer({ settings, onSessionComplete, onStop, coworkStartTime }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [currentEvent, setCurrentEvent] = useState<TimerEvent | null>(null);
  const [log, setLog] = useState<LogEntry[]>([{ time: formatTime(), message: 'Session started' }]);
  const [showOverlay, setShowOverlay] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scheduleRef = useRef<TimerEvent[]>([]);
  const startTimeRef = useRef<number>(coworkStartTime ?? Date.now()); // Stable start time across re-mounts
  const logEndRef = useRef<HTMLDivElement>(null);
  // Use refs for values needed in tick callback to avoid stale closures
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const elapsedRef = useRef(0);
  // Accumulate stats via ref so the tick callback always updates the latest value
  const statsRef = useRef({ sessions: 0, sets: 0, prompts: 0 });
  // Canonical session end time: set when session_complete fires (event offset + dismiss delay).
  // Used so "Total elapsed" reflects the scheduled duration, not when the user clicked OK.
  const canonicalEndSecondsRef = useRef<number | null>(null);

  const buildStats = useCallback((): SessionStats => {
    return {
      sessionsCompleted: statsRef.current.sessions,
      setsCompleted: statsRef.current.sets,
      promptsCompleted: statsRef.current.prompts,
      totalWorkMinutes: statsRef.current.sessions * settingsRef.current.workMinutes,
      totalElapsedSeconds: canonicalEndSecondsRef.current ?? elapsedRef.current,
    };
  }, []);

  // Initialize audio and request notification permission once
  useEffect(() => {
    initAudio();
    requestNotificationPermission();
  }, []);

  // In Tauri: listen for the native popup being dismissed
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    onNotificationDismissed((eventType) => {
      if (eventType === 'session_complete') {
        onSessionComplete(buildStats());
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => { unlisten?.(); };
  }, [onSessionComplete, buildStats]);

  // Start the interval timer — re-creates on strict mode remount but uses stable start time
  useEffect(() => {
    const schedule = computeSchedule(settings);
    scheduleRef.current = schedule;

    // Pre-populate firedSet for late-joining cowork sessions — skip past events silently
    const initialElapsed = (Date.now() - startTimeRef.current) / 1000;
    const firedSet = new Set<number>();
    if (initialElapsed > 2) {
      for (let i = 0; i < schedule.length; i++) {
        if (schedule[i].offsetSeconds <= initialElapsed) {
          firedSet.add(i);
        }
      }
    }

    const tick = () => {
      const now = Date.now();
      const elapsed = (now - startTimeRef.current) / 1000;

      setElapsed(elapsed);
      elapsedRef.current = elapsed;

      // Check for events that should fire
      for (let i = 0; i < scheduleRef.current.length; i++) {
        if (firedSet.has(i)) continue;
        if (elapsed >= scheduleRef.current[i].offsetSeconds) {
          firedSet.add(i);
          const event = scheduleRef.current[i];

          // Skip silent events (e.g., initial session start)
          if (event.silent) continue;

          // Accumulate stats
          if (event.type === 'mindfulness') {
            statsRef.current.prompts++;
          } else if (event.type === 'short_break') {
            statsRef.current.sessions++;
          } else if (event.type === 'long_break') {
            statsRef.current.sessions++;
            statsRef.current.sets++;
          } else if (event.type === 'session_complete') {
            statsRef.current.sessions++;
            statsRef.current.sets++;
            // M-mode: session_complete IS the final mindfulness prompt — count it
            if (event.promptCountTotal !== undefined) {
              statsRef.current.prompts++;
            }
            // Record canonical end time = when the session_complete event fires.
            // We do NOT add the dismiss delay: the summary screen total should match
            // the popup body "Total session time: X", not include forced-open delay.
            canonicalEndSecondsRef.current = event.offsetSeconds;
          }

          setCurrentEvent(event);

          if (isTauri()) {
            showNotificationWindow(
              event.type,
              event.title,
              event.body,
              event.promptText,
              event.dismissSeconds ?? settingsRef.current.dismissSeconds,
              event.autoClose,
              event.sessionNumber,
              event.promptCountTotal,
            ).catch(console.error);
          } else {
            setShowOverlay(true);
          }

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
                    : event.title || 'Work period started';
          setLog((prev) => [...prev, { time: formatTime(), message: logMsg }]);
        }
      }
    };

    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
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
      onSessionComplete(buildStats());
    }
  }, [currentEvent, onSessionComplete, buildStats]);

  const handleStop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Close the native popup window if one is open
    if (isTauri()) {
      import('@tauri-apps/api/event').then(({ emit }) => emit('session-stopped', {})).catch(() => {});
    }
    onStop(buildStats());
  };

  const { phase, phaseLabel, phaseProgress, timeLeft, contextLines, detailLine } =
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

      {/* Position detail — "out of 4 5-period sets" with italic emphasis */}
      {detailLine && (
        <p className="text-center text-sm text-gray-500 -mt-3">{detailLine}</p>
      )}

      {/* Elapsed time — shows that the session is actively running */}
      <p className="text-center text-sm text-gray-400">
        Session running: {formatCountdown(Math.floor(elapsed))}
      </p>

      {/* Additional context (next event countdown etc.) */}
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
          dismissSeconds={currentEvent.dismissSeconds ?? settings.dismissSeconds}
          autoClose={currentEvent.autoClose}
          onDismiss={handleDismissOverlay}
        />
      )}
    </div>
  );
}
