import type { Settings, TimerEvent } from './types';
import { formatNum } from './format';

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
 * Simple repeating interval, no end (generate enough for 24 hours).
 */
function computeMindfulnessOnlySchedule(s: Settings): TimerEvent[] {
  const events: TimerEvent[] = [];
  const intervalSec = s.promptIntervalMinutes * 60;
  const maxEvents = Math.floor((24 * 3600) / intervalSec);

  for (let i = 0; i <= maxEvents; i++) {
    const offset = i * intervalSec;
    events.push({
      offsetSeconds: offset,
      type: i === 0 ? 'work_start' : 'mindfulness',
      title: i === 0 ? '' : '',
      body: i === 0 ? '' : '',
      promptText: s.promptText,
      setNumber: 0,
      sessionNumber: 0,
      globalSessionNumber: 0,
      silent: i === 0, // Don't popup on session start
    });
  }

  return events;
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

  const numSets = s.multipleSets && s.numberOfSets > 1 ? s.numberOfSets : 1;
  const sessionsPerSet = s.sessionsPerSet;
  const totalSessions = numSets * sessionsPerSet;
  let offset = 0;
  let globalSession = 0;
  const prompt = includeMindfulness ? s.promptText : '';

  for (let set = 0; set < numSets; set++) {
    for (let session = 0; session < sessionsPerSet; session++) {
      globalSession++;
      const isFirst = globalSession === 1;

      // --- Work phase ---
      events.push({
        offsetSeconds: offset,
        type: 'work_start',
        title: isFirst ? '' : (session === 0 && set > 0 ? 'New set starting' : 'Back to work'),
        body: isFirst
          ? ''
          : (session === 0 && set > 0
              ? `Set ${set} complete! Set ${set + 1} starting.\nSession ${globalSession} of ${totalSessions}. (${formatNum(s.workMinutes)}-min work session)`
              : `Break over! Session ${globalSession} of ${totalSessions} starting. (${formatNum(s.workMinutes)}-min work session)`),
        promptText: prompt,
        setNumber: set + 1,
        sessionNumber: session + 1,
        globalSessionNumber: globalSession,
        silent: isFirst, // Don't popup on initial session start
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
            setNumber: set + 1,
            sessionNumber: session + 1,
            globalSessionNumber: globalSession,
          });
        }
      }

      offset += workSec;

      // --- Break phase ---
      const isLastSessionOfSet = session === sessionsPerSet - 1;
      const isLastSet = set === numSets - 1;

      if (isLastSessionOfSet && isLastSet) {
        // Session complete
        const totalMin = offset / 60;
        const hours = Math.floor(totalMin / 60);
        const mins = Math.round(totalMin % 60);
        const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        events.push({
          offsetSeconds: offset,
          type: 'session_complete',
          title: 'Great work!',
          body: `${totalSessions} sessions${numSets > 1 ? ` across ${numSets} sets` : ''} in ${timeStr}.`,
          promptText: prompt,
          setNumber: set + 1,
          sessionNumber: session + 1,
          globalSessionNumber: globalSession,
        });
      } else if (isLastSessionOfSet && !isLastSet) {
        // Long break between sets
        events.push({
          offsetSeconds: offset,
          type: 'long_break',
          title: `Set ${set + 1} complete!`,
          body: `Take a ${formatNum(s.longBreakMinutes)}-minute break.`,
          promptText: prompt,
          setNumber: set + 1,
          sessionNumber: session + 1,
          globalSessionNumber: globalSession,
        });
        offset += longBreakSec;
      } else {
        // Short break
        events.push({
          offsetSeconds: offset,
          type: 'short_break',
          title: `Session ${globalSession} complete!`,
          body: `Take a ${formatNum(s.breakMinutes)}-minute break.`,
          promptText: prompt,
          setNumber: set + 1,
          sessionNumber: session + 1,
          globalSessionNumber: globalSession,
        });
        offset += breakSec;
      }
    }
  }

  return events;
}
