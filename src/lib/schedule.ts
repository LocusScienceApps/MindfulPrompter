import type { Settings, TimerEvent, MindfulnessScope } from './types';
import { formatNum, formatSummaryTime } from './format';

/**
 * Compute the full schedule of events from settings.
 * Returns a flat array of TimerEvents sorted by offsetSeconds.
 */
export function computeSchedule(settings: Settings): TimerEvent[] {
  if (!settings.useTimedWork) {
    return computeMindfulnessOnlySchedule(settings);
  }
  return computePomodoroSchedule(settings, settings.useMindfulness);
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
  // 0 = indefinite (sentinel to distinguish M-mode from Both-mode in the counter display)
  const promptCountTotal = s.promptCount > 0 ? s.promptCount : 0;

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

  // For finite sessions: the session_complete IS the final (Nth) prompt, so only
  // generate N-1 regular mindfulness events. For indefinite: generate all events normally.
  const lastRegularPrompt = s.promptCount > 0 ? count - 1 : count;

  for (let i = 1; i <= lastRegularPrompt; i++) {
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
      promptCountTotal,
    });
  }

  // Finite session: session_complete fires at the Nth interval — it IS the Nth prompt.
  // Shows the mindfulness prompt + counter "Prompt N of N" + session summary below.
  if (s.promptCount > 0) {
    const timeStr = formatSummaryTime(count * intervalSec);
    events.push({
      offsetSeconds: count * intervalSec,
      type: 'session_complete',
      title: 'Session Complete! Great Work!',
      body: `${count} prompt${count !== 1 ? 's' : ''} in ${timeStr}.`,
      promptText: s.promptText,
      setNumber: 0,
      sessionNumber: count,       // The Nth prompt
      globalSessionNumber: count,
      totalSets: 0,
      periodsPerSet: 0,
      promptCountTotal: count,    // So counter shows "Prompt N of N"
      dismissSeconds: s.dismissSeconds,
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

  let offset = 0;
  let globalSession = 0;

  // Mindfulness scope: determines which event types show the prompt in Both mode
  const scope: MindfulnessScope = includeMindfulness
    ? (s.bothMindfulnessScope ?? 'work-only')
    : 'work-only';

  const showPromptOn = {
    mindfulness: includeMindfulness,
    workStart: includeMindfulness && (scope === 'work-starts' || scope === 'all'),
    shortBreak: includeMindfulness && (scope === 'breaks' || scope === 'all'),
    longBreak: includeMindfulness && (scope === 'breaks' || scope === 'all'),
    sessionComplete: includeMindfulness && (scope === 'breaks' || scope === 'all'),
  };

  // ── Body text helpers ──────────────────────────────────────────────

  function workStartBody(set: number, period: number): string {
    // set and period are already 1-based
    if (storedTotalSets === 1) {
      return `Period ${period} starting`;
    }
    const ofPart = storedTotalSets > 0 ? ` (of ${storedTotalSets} sets)` : '';
    return `Set ${set}, Period ${period} starting${ofPart}`;
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
    return `Total session time: ${timeStr}`;
  }

  // ──────────────────────────────────────────────────────────────────

  for (let set = 0; set < numSets; set++) {
    for (let session = 0; session < sessionsPerSet; session++) {
      globalSession++;
      const isFirst = globalSession === 1;
      const set1 = set + 1;
      const period1 = session + 1;

      // After long break: first period of a new set (not the very first overall)
      const isAfterLongBreak = !isFirst && period1 === 1 && set1 > 1;
      const workStartTitle = isFirst
        ? ''
        : isAfterLongBreak
          ? 'Long break over. Time to start the next set!'
          : 'Break over. Back to Work!';

      // --- Work phase ---
      const hasWorkStartPrompt = showPromptOn.workStart && !isFirst;
      events.push({
        offsetSeconds: offset,
        type: 'work_start',
        title: workStartTitle,
        body: isFirst ? '' : workStartBody(set1, period1),
        promptText: hasWorkStartPrompt ? s.promptText : '',
        setNumber: set1,
        sessionNumber: period1,
        globalSessionNumber: globalSession,
        totalSets: storedTotalSets,
        periodsPerSet: storedPeriodsPerSet,
        silent: isFirst,
        // No prompt → immediately dismissible; prompt → use configured delay (via Timer.tsx fallback)
        ...(hasWorkStartPrompt ? {} : { dismissSeconds: 0 }),
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
          });
        }
      }

      offset += workSec;

      // --- Break phase ---
      const isLastPeriodOfSet = session === sessionsPerSet - 1;
      const isLastSet = set === numSets - 1;

      if (isLastPeriodOfSet && isLastSet) {
        // Session complete
        const timeStr = formatSummaryTime(offset);

        events.push({
          offsetSeconds: offset,
          type: 'session_complete',
          title: 'Session Complete! Great Work!',
          body: sessionCompleteBody(timeStr),
          promptText: showPromptOn.sessionComplete ? s.promptText : '',
          setNumber: set1,
          sessionNumber: period1,
          globalSessionNumber: globalSession,
          totalSets: storedTotalSets,
          periodsPerSet: storedPeriodsPerSet,
          // Prompt shown → apply configured delay; no prompt → immediately dismissible
          dismissSeconds: showPromptOn.sessionComplete ? s.dismissSeconds : 0,
        });
      } else if (isLastPeriodOfSet && !isLastSet) {
        // Long break between sets
        events.push({
          offsetSeconds: offset,
          type: 'long_break',
          title: 'Set complete! Long break starting.',
          body: longBreakBody(set1),
          promptText: showPromptOn.longBreak ? s.promptText : '',
          setNumber: set1,
          sessionNumber: period1,
          globalSessionNumber: globalSession,
          totalSets: storedTotalSets,
          periodsPerSet: storedPeriodsPerSet,
          ...(s.hardBreak === true
            ? { dismissSeconds: longBreakSec, autoClose: true }
            : !showPromptOn.longBreak ? { dismissSeconds: 0 } : {}),
        });
        offset += longBreakSec;
      } else {
        // Short break
        events.push({
          offsetSeconds: offset,
          type: 'short_break',
          title: 'Break!',
          body: shortBreakBody(set1, period1),
          promptText: showPromptOn.shortBreak ? s.promptText : '',
          setNumber: set1,
          sessionNumber: period1,
          globalSessionNumber: globalSession,
          totalSets: storedTotalSets,
          periodsPerSet: storedPeriodsPerSet,
          ...(s.hardBreak === true
            ? { dismissSeconds: breakSec, autoClose: true }
            : !showPromptOn.shortBreak ? { dismissSeconds: 0 } : {}),
        });
        offset += breakSec;
      }
    }
  }

  return events;
}
