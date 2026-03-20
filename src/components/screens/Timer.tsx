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
  /** Called when the user leaves a solo session without ending it (keeps it resumable). */
  onLeave?: () => void;
  /** External start time (ms) for cowork sessions. If omitted, uses Date.now(). */
  coworkStartTime?: number;
  /** Room code for cowork sessions — enables "Show room code" toggle. */
  coworkRoomCode?: string;
  /** True if the current user is the host (shows "End for everyone" option). */
  isCoworkHost?: boolean;
  /** Called when the host chooses to leave AND end the session for all guests. */
  onHostEndSession?: () => void;
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
  useTimedWork: boolean,
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
      phaseLabel = useTimedWork ? 'Working' : 'Running';
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

  // Context info — only show set/period for timed work modes
  if (useTimedWork && lastFired.setNumber > 0) {
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
      if (!useTimedWork) {
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

/** Send a browser OS notification (used when the tab is hidden) */
function sendBrowserNotification(event: TimerEvent, playSound: boolean) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const body = event.promptText
    ? `${event.promptText}${event.body ? '\n' + event.body : ''}`
    : event.body || event.title;

  new Notification(event.promptText || event.title || 'Prosochai', {
    body: body.replace(/\n/g, ' '),
    tag: 'mindful-prompter',
    icon: '/icon-192x192.png',
    requireInteraction: true, // stays visible until the user clicks it
    silent: !playSound,       // suppress OS notification sound when app sound is off
  });
}

export default function Timer({ settings, onSessionComplete, onStop, onLeave, coworkStartTime, coworkRoomCode, isCoworkHost, onHostEndSession }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [currentEvent, setCurrentEvent] = useState<TimerEvent | null>(null);
  const [log, setLog] = useState<LogEntry[]>([{ time: formatTime(), message: 'Session started' }]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showRoomCode, setShowRoomCode] = useState(false);
  const [endConfirmState, setEndConfirmState] = useState<'idle' | 'confirm' | 'guest-info'>('idle');
  const [tooltipVisible, setTooltipVisible] = useState<'leave' | 'end' | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localPlaySound, setLocalPlaySound] = useState(settings.playSound);
  const localPlaySoundRef = useRef(settings.playSound);
  useEffect(() => { localPlaySoundRef.current = localPlaySound; }, [localPlaySound]);

  const workerRef = useRef<Worker | null>(null);
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

  // Initialize audio once
  useEffect(() => {
    initAudio();
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

  // Start the Web Worker timer — runs off the main thread so it isn't throttled
  // when the tab is hidden. Uses a stable start time across strict-mode remounts.
  useEffect(() => {
    const schedule = computeSchedule(settings);
    scheduleRef.current = schedule;

    // Pre-populate skip list for late-joining cowork sessions
    const initialElapsed = (Date.now() - startTimeRef.current) / 1000;
    const initialFiredIndices: number[] = [];
    if (initialElapsed > 2) {
      for (let i = 0; i < schedule.length; i++) {
        if (schedule[i].offsetSeconds <= initialElapsed) {
          initialFiredIndices.push(i);
        }
      }
    }

    const worker = new Worker('/timer-worker.js');
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const msg = e.data;

      if (msg.type === 'tick') {
        setElapsed(msg.elapsed);
        elapsedRef.current = msg.elapsed;
        return;
      }

      if (msg.type === 'event') {
        const event = msg.event as TimerEvent;

        // Skip silent events (e.g., initial session start marker)
        if (event.silent) return;

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
          // "User can see this tab" = tab is active AND the browser window has OS focus.
          // document.hidden only catches tab-switching within Chrome; document.hasFocus()
          // catches Chrome being behind VS Code, Word, or any other app.
          const userCanSeeTab = !document.hidden && document.hasFocus();

          // session_complete always shows the in-app overlay — the user must dismiss it
          // to end the session. For other events, only show overlay when it's actually visible.
          if (event.type === 'session_complete' || userCanSeeTab) {
            setShowOverlay(true);
          }

          // Send an OS notification whenever the user can't see the tab — persists until
          // clicked (requireInteraction). Clicking it focuses Chrome and the overlay waits.
          if (!userCanSeeTab) {
            sendBrowserNotification(event, localPlaySoundRef.current);
          }
        }

        // Play sound
        if (localPlaySoundRef.current) {
          playChime();
        }

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
    };

    worker.postMessage({
      type: 'start',
      schedule,
      startTime: startTimeRef.current,
      initialFiredIndices,
    });

    return () => {
      worker.postMessage({ type: 'stop' });
      worker.terminate();
      workerRef.current = null;
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

  const stopWorker = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (isTauri()) {
      import('@tauri-apps/api/event').then(({ emit }) => emit('session-stopped', {})).catch(() => {});
    }
  };

  const handleStop = () => {
    stopWorker();
    onStop(buildStats());
  };

  const handleLeave = () => {
    stopWorker();
    onLeave?.();
  };

  const showTooltip = (which: 'leave' | 'end') => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setTooltipVisible(which);
  };
  const hideTooltip = () => {
    tooltipTimerRef.current = setTimeout(() => setTooltipVisible(null), 200);
  };

  const isGuest = !!coworkRoomCode && !isCoworkHost;
  const isHost = !!coworkRoomCode && !!isCoworkHost;

  const leaveTooltip = isHost
    ? 'Return to main screen — session keeps running for participants, rejoin anytime'
    : 'Return to main screen — session stays running, rejoin anytime';

  const endTooltip = isGuest
    ? 'Only the host can end this session'
    : isHost
      ? 'Stop the timer and end the session for all participants'
      : 'Stop the timer and mark this session as complete';

  const confirmTitle = isHost ? 'End session for everyone?' : 'End this session?';
  const confirmBody = isHost
    ? 'This will stop the timer for you and all participants. The session will be marked complete.'
    : 'The timer will stop and the session will be marked complete.';
  const confirmLabel = isHost ? 'End for everyone' : 'End session';

  const handleEndClick = () => {
    if (isGuest) {
      setEndConfirmState('guest-info');
    } else {
      setEndConfirmState('confirm');
    }
  };

  const handleConfirmEnd = () => {
    setEndConfirmState('idle');
    stopWorker();
    onStop(buildStats());
  };

  const { phase, phaseLabel, phaseProgress, timeLeft, contextLines, detailLine } =
    getCurrentPhase(elapsed, scheduleRef.current, settings.useTimedWork);

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

      {/* Room code toggle — shown for all cowork participants */}
      {coworkRoomCode && (
        <div className="text-center">
          {showRoomCode ? (
            <div className="inline-flex items-center gap-3">
              <span className="font-mono text-2xl font-bold tracking-widest text-indigo-600">{coworkRoomCode}</span>
              <button onClick={() => navigator.clipboard.writeText(coworkRoomCode)} className="text-xs text-gray-400 hover:text-indigo-600">Copy</button>
              <button onClick={() => setShowRoomCode(false)} className="text-xs text-gray-400 hover:text-gray-600">Hide</button>
            </div>
          ) : (
            <button onClick={() => setShowRoomCode(true)} className="text-xs text-gray-400 hover:text-indigo-600 underline">
              Show room code
            </button>
          )}
        </div>
      )}

      {/* Sound toggle */}
      <div className="flex justify-center">
        <button
          onClick={() => setLocalPlaySound((v) => !v)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <span>{localPlaySound ? '🔊' : '🔇'}</span>
          <span>{localPlaySound ? 'Sound on' : 'Sound off'}</span>
        </button>
      </div>

      {/* Leave · End session */}
      {endConfirmState === 'idle' ? (
        <div className="flex justify-center items-center gap-3 text-sm">
          <div className="relative" onMouseEnter={() => showTooltip('leave')} onMouseLeave={hideTooltip}>
            <button
              onClick={handleLeave}
              className="border-b border-dotted border-gray-400 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Leave session
            </button>
            {tooltipVisible === 'leave' && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg text-center z-10"
                onMouseEnter={() => showTooltip('leave')}
                onMouseLeave={hideTooltip}
              >
                {leaveTooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
              </div>
            )}
          </div>
          <span className="text-gray-400">·</span>
          <div className="relative" onMouseEnter={() => showTooltip('end')} onMouseLeave={hideTooltip}>
            <button
              onClick={handleEndClick}
              className="border-b border-dotted border-gray-400 text-gray-500 hover:text-gray-700 transition-colors"
            >
              End session
            </button>
            {tooltipVisible === 'end' && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg text-center z-10"
                onMouseEnter={() => showTooltip('end')}
                onMouseLeave={hideTooltip}
              >
                {endTooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
              </div>
            )}
          </div>
        </div>
      ) : endConfirmState === 'guest-info' ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-2 text-center">
          <p className="text-sm font-medium text-indigo-900">Only the host can end this session.</p>
          <p className="text-xs text-indigo-700">You can leave and rejoin anytime.</p>
          <button
            autoFocus
            onClick={() => setEndConfirmState('idle')}
            className="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            OK
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-red-900">{confirmTitle}</p>
          <p className="text-xs text-red-700">{confirmBody}</p>
          <div className="flex gap-3">
            <button
              autoFocus
              onClick={() => setEndConfirmState('idle')}
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <Button onClick={handleConfirmEnd} className="flex-1 !bg-red-600 hover:!bg-red-700 text-sm">
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}

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
