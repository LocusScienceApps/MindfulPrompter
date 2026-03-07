'use client';

import { useEffect } from 'react';

interface HelpModalProps {
  onClose: () => void;
}

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

const FAQ: FaqItem[] = [
  {
    q: "I'm not getting notifications when I'm in another app or tab. What's wrong?",
    a: (
      <div className="space-y-3">
        <p>
          MindfulPrompter uses your browser's notification system to reach you when you're
          working elsewhere. A few things can block this:
        </p>
        <div>
          <p className="font-semibold text-gray-800 mb-1">1. Browser permission not granted</p>
          <p>
            If you clicked "Not now" or "Block" on the notification prompt, the app can't send
            notifications. On the main screen, you'll see a banner asking you to enable them.
            Click "Enable Notifications" there.
          </p>
          <p className="mt-1">
            If Chrome shows the banner as blocked, click the <strong>lock or info icon</strong>{' '}
            in the address bar → <strong>Site Settings</strong> →{' '}
            <strong>Notifications</strong> → <strong>Allow</strong>.
          </p>
        </div>
        <div>
          <p className="font-semibold text-gray-800 mb-1">2. Windows: Chrome not allowed in system settings</p>
          <p>
            Even if Chrome has permission, Windows can still block it.
            Go to <strong>Windows Settings → System → Notifications</strong>, scroll down
            to find <strong>Google Chrome</strong>, and make sure it's toggled on.
          </p>
        </div>
        <div>
          <p className="font-semibold text-gray-800 mb-1">3. Windows: Focus Assist / Do Not Disturb</p>
          <p>
            Focus Assist (Windows 10) or Do Not Disturb (Windows 11) silently suppresses
            all notifications. Check{' '}
            <strong>Settings → System → Focus Assist</strong> or look for the moon icon
            in your taskbar notification area.
          </p>
        </div>
        <div>
          <p className="font-semibold text-gray-800 mb-1">4. Mac: Notifications not enabled for your browser</p>
          <p>
            Go to <strong>System Settings → Notifications</strong>, find your browser
            (Chrome, Safari, Firefox, etc.), and make sure notifications are set to{' '}
            <strong>Alerts</strong> or <strong>Banners</strong>.
          </p>
          <p className="mt-1">
            Also check that <strong>Focus</strong> mode is not active (menu bar → Control
            Center → Focus).
          </p>
        </div>
        <div>
          <p className="font-semibold text-gray-800 mb-1">5. The tab was closed</p>
          <p>
            The tab must stay open (but can be hidden or in the background). If you close
            the tab entirely, the timer stops.
          </p>
        </div>
      </div>
    ),
  },
  {
    q: 'What is the difference between the web version and the desktop app?',
    a: (
      <p>
        The desktop app (Tauri) can force a popup window on top of your other apps and
        require you to wait N seconds before dismissing it — that's its core value.
        The web version uses browser notifications instead: they appear as OS toast
        notifications and stay visible until you click them, but they can't force
        themselves in front of your work. Both versions keep accurate timers even when
        you're in another app or tab.
      </p>
    ),
  },
  {
    q: `Will notifications work if the tab is open but I'm in another app (Word, VS Code, etc.)?`,
    a: (
      <p>
        Yes — as long as the tab is open, notifications are enabled (see above), and
        your OS isn't blocking them. When a prompt fires, you'll see a toast notification
        from your browser in the corner of your screen. Clicking it brings you back to
        the app.
      </p>
    ),
  },
  {
    q: `Will notifications work if I'm on a different Chrome tab?`,
    a: (
      <p>
        Yes, same as above. The tab just needs to be open — it doesn't need to be the
        active tab.
      </p>
    ),
  },
  {
    q: 'What happens if I close the tab mid-session?',
    a: (
      <p>
        The timer stops and your session ends. For coworking sessions, your connection
        is dropped. Make sure to keep the tab open in a browser window while working.
        Minimizing the browser is fine — the timer keeps running.
      </p>
    ),
  },
  {
    q: 'Do notifications work on mobile?',
    a: (
      <p>
        Mobile browsers are more restrictive. Notifications may work on Android Chrome
        if you add the site to your home screen (install it as a PWA). iOS Safari does
        not support web notifications. For reliable use, we recommend a desktop browser.
      </p>
    ),
  },
  {
    q: 'How do I save my settings so they load every time?',
    a: (
      <p>
        After changing your settings, you'll land on the Settings Updated screen.
        Click <strong>"Save as my default settings"</strong> to persist them.
        You can also save up to 5 named presets from that screen for quick switching.
      </p>
    ),
  },
  {
    q: 'What is a coworking session?',
    a: (
      <p>
        One person hosts a session and generates a 6-character room code. Others enter
        that code to join and sync their timer to the host's. The host can optionally
        share their mindfulness prompts with guests. All participants see the same
        work/break rhythm.
      </p>
    ),
  },
];

export default function HelpModal({ onClose }: HelpModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Help &amp; FAQ</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* FAQ list */}
        <div className="divide-y divide-gray-100 px-6 py-2">
          {FAQ.map((item, i) => (
            <details key={i} className="group py-4">
              <summary className="flex cursor-pointer items-start justify-between gap-4 list-none">
                <span className="text-sm font-semibold text-gray-800 group-open:text-indigo-700">
                  {item.q}
                </span>
                <span className="mt-0.5 shrink-0 text-gray-400 group-open:text-indigo-500 text-lg leading-none select-none">
                  +
                </span>
              </summary>
              <div className="mt-3 text-sm text-gray-600 leading-relaxed">
                {item.a}
              </div>
            </details>
          ))}
        </div>

        <div className="border-t border-gray-100 px-6 py-4 text-center">
          <button
            onClick={onClose}
            className="rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
