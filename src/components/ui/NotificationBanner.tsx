'use client';

import { useState, useEffect } from 'react';
import { isTauri } from '@/lib/tauri';

/**
 * Explains why browser notifications matter and prompts the user to enable them.
 *
 * Shows whenever permission is not 'granted' (and we're in web mode).
 * Dismissed state is in-memory only — intentionally resets each session so the
 * user is reminded every time they return to the app until they grant permission.
 */
export default function NotificationBanner() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported' | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // In Tauri, native windows handle notifications — no browser prompt needed
    if (isTauri()) { setDismissed(true); return; }
    if (!('Notification' in window)) { setPermission('unsupported'); return; }
    setPermission(Notification.permission);
  }, []);

  // Not yet initialized, already granted, already dismissed, or not supported
  if (permission === null || permission === 'granted' || permission === 'unsupported' || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    // If granted, banner hides automatically via the check above
  };

  // ── Denied: browser has blocked notifications ────────────────────────────────
  if (permission === 'denied') {
    return (
      <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-semibold text-amber-800">Notifications are blocked</p>
            <p className="text-amber-700">
              Without notifications, MindfulPrompter can't reach you when you're working
              in another window — the whole point of the app.
            </p>
            <p className="text-amber-700 mt-1">
              To re-enable: click the <strong>lock or info icon</strong> in your browser's
              address bar → <strong>Site Settings</strong> → <strong>Notifications</strong>{' '}
              → <strong>Allow</strong>, then reload the page.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="shrink-0 text-amber-400 hover:text-amber-700 text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // ── Default: permission never granted ────────────────────────────────────────
  return (
    <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="font-semibold text-indigo-800">Enable notifications for this app</p>
          <p className="text-indigo-700">
            When you're working in Word, your browser, or any other app,
            MindfulPrompter needs browser notifications to reach you — otherwise
            prompts only appear when you already have this tab open in front of you.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleEnable}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Enable Notifications
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-500 hover:text-indigo-700 hover:border-indigo-300 transition-colors"
            >
              Not now
            </button>
          </div>
          <p className="text-xs text-indigo-500 pt-1">
            After enabling, if notifications still don&rsquo;t appear: on{' '}
            <strong>Windows</strong>, go to <strong>Settings → System → Notifications</strong>{' '}
            and make sure your browser is toggled on. On <strong>Mac</strong>, go to{' '}
            <strong>System Settings → Notifications</strong> and find your browser.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 text-indigo-300 hover:text-indigo-600 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
