/**
 * Web Worker for accurate timer ticks.
 * Runs in a separate thread so it isn't throttled when the tab is backgrounded.
 *
 * Messages IN:
 *   { type: 'start', schedule: TimerEvent[], startTime: number }
 *   { type: 'stop' }
 *
 * Messages OUT:
 *   { type: 'tick', elapsed: number }
 *   { type: 'event', event: TimerEvent }
 */

let intervalId = null;
let schedule = [];
let startTime = 0;
let firedSet = new Set(); // track which events (by index) have fired

self.onmessage = function (e) {
  const msg = e.data;

  if (msg.type === 'start') {
    // Reset state
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
    schedule = msg.schedule || [];
    startTime = msg.startTime;
    firedSet = new Set();

    // Tick every second
    intervalId = setInterval(function () {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;

      // Send tick for UI updates
      self.postMessage({ type: 'tick', elapsed: elapsed });

      // Check for events that should have fired
      for (let i = 0; i < schedule.length; i++) {
        if (firedSet.has(i)) continue;
        if (elapsed >= schedule[i].offsetSeconds) {
          firedSet.add(i);
          self.postMessage({ type: 'event', event: schedule[i] });
        }
      }
    }, 1000);
  }

  if (msg.type === 'stop') {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};
