import type { Settings, TimerEvent } from './types';
import { formatNum } from './format';

/** Resolve custom popup label for an event type from settings. */
function resolveLabel(
  type: TimerEvent['type'],
  s: Settings,
): string | undefined {
  switch (type) {
    case 'mindfulness':      return s.popupLabelMindfulness;
    case 'work_start':       return s.popupLabelWorkStart;
    case 'short_break':      return s.popupLabelShortBreak;
    case 'long_break':       return s.popupLabelLongBreak;
    case 'session_complete': return s.popupLabelSessionDone;
  }
}

/**
 * Compute the full schedule of events from settings.
 * Returns a flat array of TimerEvents sorted by offsetSeconds.
 */
export function computeSchedule(settings: Settings): TimerEvent[] {
  const { mode } = settings;

  if (mode === 'mindfulness') {
    return computeMindfulnessOnlySchedule(settings);
  }
  if (mode === 'pomodoro') {
    return computePomodoroSchedule(settings, false);
  }
  return computePomodoroSchedule(settings, true);
}

/**
 * Mode (a): Mindfulness prompts only.
 * If promptCount > 0: generates exactly that many prompts then a session_complete event.
 * If promptCount === 0: generates enough events for 24 hours (runs until stopped).
 */
function computeMindfulnessOnlySchedule(s: Settings): TimerEvent[] {
  const events: TimerEvent[] = [];
  const intervalSec = s.promptIntervalMinutes * 60;
  const count = s.promptCount > 0 ? s.promptCount : Math.floor((24 * 3600) / intervalSec);

  // Initial silent event at t=0 to mark session start
  events.push({
    offsetSeconds: 0,
    type: 'work_start',
    title: '',
    body: '',
    promptText: s.promptText,
    setNumber: 0,
    sessionNumber: 0,
    globalSessionNumber: 0,
    totalSets: 0,
    periodsPerSet: 0,
    silent: true,
  });

  for (let i = 1; i <= count; i++) {
    events.push({
      offsetSeconds: i * intervalSec,
      type: 'mindfulness',
      title: '',
      body: '',
      promptText: s.promptText,
      setNumber: 0,
      sessionNumber: i,
      globalSessionNumber: i,
      totalSets: 0,
      periodsPerSet: 0,
      popupLabel: resolveLabel('mindfulness', s),
    });
  }

  // If a prompt count was set, add a session_complete event 2 seconds after the last prompt
  if (s.promptCount > 0) {
    const totalMin = (count * intervalSec) / 60;
    const hours = Math.floor(totalMin / 60);
    const mins = Math.round(totalMin % 60);
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    events.push({
      offsetSeconds: count * intervalSec + 2,
      type: 'session_complete',
      title: 'Session complete!',
      body: `${count} prompt${count !== 1 ? 's' : ''} in ${timeStr}.`,
      promptText: s.promptText,
      setNumber: 0,
      sessionNumber: count,
      globalSessionNumber: count,
      totalSets: 0,
      periodsPerSet: 0,
      popupLabel: resolveLabel('session_complete', s),
    });
  }

  return events;
}

/**
 * When numberOfSets === 0 (unlimited), compute how many complete sets fit in 24 hours, capped at 50.
 */
function computeMaxSets(s: Settings): number {
  const workSec = Math.round(s.workMinutes * 60);
  const breakSec = Math.round(s.breakMinutes * 60);
  const longBreakSec = Math.round(s.longBreakMinutes * 60);
  const sessions = s.sessionsPerSet > 0 ? s.sessionsPerSet : 4; // fallback if 0
  const oneSetSec = sessions * workSec + (sessions - 1) * breakSec;
  const setWithBreakSec = oneSetSec + longBreakSec;
  return Math.max(1, Math.min(50, Math.floor((24 * 3600) / setWithBreakSec)));
}

/**
 * When sessionsPerSet === 0 (unlimited), compute how many sessions fit in 24 hours, capped at 200.
 */
function computeMaxSessionsPerSet(s: Settings): number {
  const workSec = Math.round(s.workMinutes * 60);
  const breakSec = Math.round(s.breakMinutes * 60);
  return Math.max(1, Math.min(200, Math.floor((24 * 3600) / (workSec + breakSec))));
}

/**
 * Modes (b) and (c): Pomodoro timer, optionally with mindfulness prompts.
 */
function computePomodoroSchedule(s: Settings, includeMindfulness: boolean): TimerEvent[] {
  const events: TimerEvent[] = [];
  const workSec = Math.round(s.workMinutes * 60);
  const breakSec = Math.round(s.breakMinutes * 60);
  const longBreakSec = Math.round(s.longBreakMinutes * 60);
  const reminderSec = includeMindfulness ? s.promptIntervalMinutes * 60 : 0;
  const remindersPerWork = reminderSec > 0 ? Math.round(workSec / reminderSec) : 0;

  // sessionsPerSet === 0 means unlimited sessions (forces single-set mode)
  const isUnlimitedSessions = s.sessionsPerSet === 0;
  const sessionsPerSet = isUnlimitedSessions ? computeMaxSessionsPerSet(s) : s.sessionsPerSet;

  // numberOfSets === 0 means unlimited sets: pre-generate enough to fill 24 hours
  // If sessions are unlimited, force single set (no concept of "end of set")
  const isUnlimited = !isUnlimitedSessions && s.multipleSets && s.numberOfSets === 0;
  const numSets = isUnlimitedSessions
    ? 1
    : s.multipleSets
      ? (s.numberOfSets === 0 ? computeMaxSets(s) : Math.max(1, s.numberOfSets))
      : 1;

  // Stored values for event metadata: 0 = unlimited/not applicable
  const storedTotalSets = isUnlimited ? 0 : numSets;
  const storedPeriodsPerSet = isUnlimitedSessions ? 0 : sessionsPerSet;

  const totalSessions = numSets * sessionsPerSet;
  let offset = 0;
  let globalSession = 0;
  const prompt = includeMindfulness ? s.promptText : '';

  // ── Body text helpers ──────────────────────────────────────────────

  function workStartBody(set: number, period: number): string {
    // set and period are already 1-based
    if (storedTotalSets === 1) {
      return `Break over! Period ${period} starting`;
    }
    const ofPart = storedTotalSets > 0 ? ` (of ${storedTotalSets} sets)` : '';
    return `Break over! Set ${set}, Period ${period} starting${ofPart}`;
  }

  function shortBreakBody(set: number, period: number): string {
    const dur = `${formatNum(s.breakMinutes)}-minute`;
    if (storedTotalSets === 1) {
      return `Period ${period} complete. Take a ${dur} break.`;
    }
    return `Set ${set}, Period ${period} complete. Take a ${dur} break.`;
  }

  function longBreakBody(set: number): string {
    return `Set ${set} complete. Take a ${formatNum(s.longBreakMinutes)}-minute break.`;
  }

  function sessionCompleteBody(timeStr: string): string {
    if (numSets > 1) {
      return `${numSets} sets × ${sessionsPerSet} periods × ${formatNum(s.workMinutes)} min = ${timeStr}`;
    }
    return `${sessionsPerSet} periods × ${formatNum(s.workMinutes)} min = ${timeStr}`;
  }

  // ──────────────────────────────────────────────────────────────────

  for (let set = 0; set < numSets; set++) {
    for (let session = 0; session < sessionsPerSet; session++) {
      globalSession++;
      const isFirst = globalSession === 1;
      const set1 = set + 1;
      const period1 = session + 1;

      // --- Work phase ---
      events.push({
        offsetSeconds: offset,
        type: 'work_start',
        title: isFirst ? '' : 'Break over!',
        body: isFirst ? '' : workStartBody(set1, period1),
        promptText: prompt,
        setNumber: set1,
        sessionNumber: period1,
        globalSessionNumber: globalSession,
        totalSets: storedTotalSets,
        periodsPerSet: storedPeriodsPerSet,
        popupLabel: resolveLabel('work_start', s),
        silent: isFirst,
      });

      // Mid-work mindfulness reminders
      if (includeMindfulness && remindersPerWork > 1) {
        for (let r = 1; r < remindersPerWork; r++) {
          events.push({
            offsetSeconds: offset + r * reminderSec,
            type: 'mindfulness',
            title: '',
            body: '',
            promptText: s.promptText,
            setNumber: set1,
            sessionNumber: period1,
            globalSessionNumber: globalSession,
            totalSets: storedTotalSets,
            periodsPerSet: storedPeriodsPerSet,
            popupLabel: resolveLabel('mindfulness', s),
          });
        }
      }

      offset += workSec;

      // --- Break phase ---
      const isLastPeriodOfSet = session === sessionsPerSet - 1;
      const isLastSet = set === numSets - 1;

      if (isLastPeriodOfSet && isLastSet) {
        // Session complete
        const totalMin = offset / 60;
        const hours = Math.floor(totalMin / 60);
        const mins = Math.round(totalMin % 60);
        const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        events.push({
          offsetSeconds: offset,
          type: 'session_complete',
          title: 'Great work!',
          body: sessionCompleteBody(timeStr),
          promptText: prompt,
          setNumber: set1,
          sessionNumber: period1,
          globalSessionNumber: globalSession,
          totalSets: storedTotalSets,
          periodsPerSet: storedPeriodsPerSet,
          popupLabel: resolveLabel('session_complete', s),
        });
      } else if (isLastPeriodOfSet && !isLastSet) {
        // Long break between sets
        events.push({
          offsetSeconds: offset,
          type: 'long_break',
          title: 'Break!',
          body: longBreakBody(set1),
          promptText: prompt,
          setNumber: set1,
          sessionNumber: period1,
          globalSessionNumber: globalSession,
          totalSets: storedTotalSets,
          periodsPerSet: storedPeriodsPerSet,
          popupLabel: resolveLabel('long_break', s),
        });
        offset += longBreakSec;
      } else {
        // Short break
        events.push({
          offsetSeconds: offset,
          type: 'short_break',
          title: 'Break!',
          body: shortBreakBody(set1, period1),
          promptText: prompt,
          setNumber: set1,
          sessionNumber: period1,
          globalSessionNumber: globalSession,
          totalSets: storedTotalSets,
          periodsPerSet: storedPeriodsPerSet,
          popupLabel: resolveLabel('short_break', s),
        });
        offset += breakSec;
      }
    }
  }

  return events;
}
