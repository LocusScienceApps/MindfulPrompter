'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { isTauri } from '@/lib/tauri';

interface NotificationData {
  eventType: string;
  title: string;
  body: string;
  promptText: string;
  dismissSeconds: number;
  /** undefined = use event-type default; "" = no label; other = custom label */
  popupLabel?: string | null;
}

const EVENT_META: Record<string, { label: string; accent: string }> = {
  mindfulness:      { label: 'Mindfulness Prompt', accent: 'bg-indigo-500' },
  work_start:       { label: 'Work Period',          accent: 'bg-emerald-500' },
  short_break:      { label: 'Short Break',         accent: 'bg-amber-400' },
  long_break:       { label: 'Long Break',          accent: 'bg-orange-400' },
  session_complete: { label: 'Session Done',        accent: 'bg-gray-400' },
};

export default function PopupPage() {
  const [data, setData] = useState<NotificationData | null>(null);
  const [countdown, setCountdown] = useState(0);
  // Refs so effects registered once can always read current values
  const countdownRef = useRef(0);
  // Set true when Rust emits "notification-replacing" so onCloseRequested lets the close through
  const replacingRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventType = params.get('eventType');
    if (eventType) {
      const dismissSeconds = parseInt(params.get('dismissSeconds') ?? '5', 10);
      // params.get returns null if absent (use default), '' if present-but-empty (no label)
      const rawLabel = params.get('popupLabel');
      setData({
        eventType,
        title: params.get('title') ?? '',
        body: params.get('body') ?? '',
        promptText: params.get('promptText') ?? '',
        dismissSeconds,
        popupLabel: rawLabel, // null = use default, '' = no label, text = custom
      });
      setCountdown(dismissSeconds);
    } else if (isTauri()) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke<NotificationData>('get_notification_data').then((result) => {
          if (result) {
            setData(result);
            setCountdown(result.dismissSeconds);
          }
        }).catch(console.error);
      }).catch(console.error);
    }
  }, []);

  // Listen for session-stopped (close popup when session ends) and
  // notification-replacing (Rust is about to close this window for a new one — allow it).
  useEffect(() => {
    if (!isTauri()) return;
    const unlisteners: (() => void)[] = [];
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen('session-stopped', async () => {
        replacingRef.current = true;
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        getCurrentWindow().close();
      }).then((fn) => unlisteners.push(fn)).catch(console.error);

      listen('notification-replacing', () => {
        replacingRef.current = true;
      }).then((fn) => unlisteners.push(fn)).catch(console.error);
    }).catch(console.error);
    return () => { unlisteners.forEach((fn) => fn()); };
  }, []);

  // Keep ref in sync so focus-steal / close-block effects always have current value
  useEffect(() => { countdownRef.current = countdown; }, [countdown]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // While countdown > 0: steal focus back whenever user clicks away, and block Alt+F4.
  // Registered once on mount; reads refs so it doesn't need to re-register each second.
  useEffect(() => {
    if (!isTauri()) return;

    const handleBlur = async () => {
      if (countdownRef.current <= 0 || replacingRef.current) return;
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().setFocus();
      } catch { /* non-fatal */ }
    };
    window.addEventListener('blur', handleBlur);

    // Block user-initiated close (Alt+F4, taskbar) during countdown,
    // but allow it when Rust is replacing or session has stopped.
    let unlisten: (() => void) | undefined;
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow().onCloseRequested((event) => {
        if (countdownRef.current > 0 && !replacingRef.current) {
          event.preventDefault();
        }
      }).then((fn) => { unlisten = fn; }).catch(console.error);
    }).catch(console.error);

    return () => {
      window.removeEventListener('blur', handleBlur);
      unlisten?.();
    };
  }, []);

  const handleDismiss = useCallback(async () => {
    if (countdown > 0) return;
    if (!isTauri()) { window.close(); return; }
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      try {
        const { emit } = await import('@tauri-apps/api/event');
        await emit('notification-dismissed', { eventType: data?.eventType ?? 'mindfulness' });
      } catch { /* non-fatal */ }
      await invoke('close_notification_window');
    } catch {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
      } catch { /* nothing more to try */ }
    }
  }, [countdown, data?.eventType]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && countdown <= 0) handleDismiss();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [countdown, handleDismiss]);

  if (!data) {
    return <div style={{ minHeight: '100vh', background: '#fff' }} />;
  }

  const { eventType, title, body, promptText, popupLabel } = data;
  const meta = EVENT_META[eventType] ?? EVENT_META.mindfulness;
  const hasPrompt = promptText.length > 0;
  const hasContext = title || body;
  // popupLabel: null = use default, '' = hide label, string = custom label
  const displayLabel = popupLabel === null || popupLabel === undefined
    ? meta.label
    : popupLabel; // '' means no label shown

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-white px-8 py-6 ring-1 ring-gray-200">
      {/* Thin colored accent strip at top */}
      <div className={`absolute left-0 right-0 top-0 h-1 ${meta.accent}`} />

      {/* Event type label */}
      {displayLabel && (
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
          {displayLabel}
        </p>
      )}

      {/* Prompt text */}
      {hasPrompt && (
        <p className="text-center text-xl font-semibold leading-snug text-gray-900">
          {promptText}
        </p>
      )}

      {/* Context (title / body) */}
      {hasContext && (
        <div className={hasPrompt ? 'mt-4 border-t border-gray-100 pt-4 w-full' : 'w-full'}>
          {title && (
            <p className={`text-center text-gray-600 ${hasPrompt ? 'text-sm' : 'text-base font-medium'}`}>
              {title}
            </p>
          )}
          {body && (
            <p className="mt-1 whitespace-pre-line text-center text-sm text-gray-500">
              {body}
            </p>
          )}
        </div>
      )}

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        disabled={countdown > 0}
        className={`mt-6 w-full rounded-xl py-3 text-base font-semibold transition-all ${
          countdown > 0
            ? 'cursor-not-allowed bg-gray-100 text-gray-400'
            : 'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700'
        }`}
      >
        {countdown > 0 ? `Wait (${countdown}s)…` : 'OK'}
      </button>
    </div>
  );
}
