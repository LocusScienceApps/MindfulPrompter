'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { isTauri } from '@/lib/tauri';

interface NotificationData {
  eventType: string;
  title: string;
  body: string;
  promptText: string;
  dismissSeconds: number;
  /** If true, popup auto-dismisses when countdown reaches 0 (hard break). */
  autoClose?: boolean;
  /** M-mode only: which prompt number this is (1-based). */
  sessionNumber?: number;
  /** M-mode only: total prompts in this session. undefined = indefinite. */
  promptCountTotal?: number;
}

const EVENT_META: Record<string, { accent: string }> = {
  mindfulness:      { accent: 'bg-indigo-500' },
  work_start:       { accent: 'bg-emerald-500' },
  short_break:      { accent: 'bg-amber-400' },
  long_break:       { accent: 'bg-orange-400' },
  session_complete: { accent: 'bg-gray-400' },
};

export default function PopupPage() {
  const [data, setData] = useState<NotificationData | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isOverlay, setIsOverlay] = useState(false);
  // Refs so effects registered once can always read current values
  const countdownRef = useRef(0);
  const isOverlayRef = useRef(false);
  const autoCloseRef = useRef(false);
  const handleDismissRef = useRef<() => void>(() => {});
  // Set true when Rust emits "notification-replacing" so onCloseRequested lets the close through
  const replacingRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Overlay detection from URL param (dev mode)
    if (params.get('overlay') === 'true') {
      isOverlayRef.current = true;
      setIsOverlay(true);
      return;
    }

    const eventType = params.get('eventType');
    if (eventType) {
      // Load notification data from URL params (dev mode)
      const dismissSeconds = parseInt(params.get('dismissSeconds') ?? '5', 10);
      const autoClose = params.get('autoClose') === 'true';
      const sessionNumberParam = params.get('sessionNumber');
      const promptCountTotalParam = params.get('promptCountTotal');
      autoCloseRef.current = autoClose;
      setData({
        eventType,
        title: params.get('title') ?? '',
        body: params.get('body') ?? '',
        promptText: params.get('promptText') ?? '',
        dismissSeconds,
        autoClose,
        sessionNumber: sessionNumberParam ? parseInt(sessionNumberParam, 10) : undefined,
        promptCountTotal: promptCountTotalParam ? parseInt(promptCountTotalParam, 10) : undefined,
      });
      setCountdown(dismissSeconds);
    } else if (isTauri()) {
      // In prod Tauri builds, check window label for overlay detection, otherwise load via invoke
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        if (getCurrentWindow().label.startsWith('notification-overlay-')) {
          isOverlayRef.current = true;
          setIsOverlay(true);
          return;
        }
        return import('@tauri-apps/api/core').then(({ invoke }) =>
          invoke<NotificationData>('get_notification_data')
        ).then((result) => {
          if (result) {
            autoCloseRef.current = result.autoClose ?? false;
            setData(result);
            setCountdown(result.dismissSeconds);
          }
        });
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

  // Keep refs in sync
  useEffect(() => { countdownRef.current = countdown; }, [countdown]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Hard break: auto-dismiss when the full break duration has elapsed
          if (autoCloseRef.current) {
            setTimeout(() => handleDismissRef.current(), 50);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // While countdown > 0 (or overlay): steal focus back whenever user clicks away, and block Alt+F4.
  // Registered once on mount; reads refs so it doesn't need to re-register each second.
  useEffect(() => {
    if (!isTauri()) return;

    const handleBlur = async () => {
      if ((countdownRef.current <= 0 && !isOverlayRef.current) || replacingRef.current) return;
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().setFocus();
      } catch { /* non-fatal */ }
    };
    window.addEventListener('blur', handleBlur);

    // Block user-initiated close (Alt+F4, taskbar) during countdown or for overlay windows.
    // Overlays are always blocked until "notification-replacing" or "session-stopped".
    let unlisten: (() => void) | undefined;
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow().onCloseRequested((event) => {
        const shouldBlock = isOverlayRef.current
          ? !replacingRef.current  // overlay: block until Rust signals replace/stop
          : (countdownRef.current > 0 && !replacingRef.current); // popup: block during countdown
        if (shouldBlock) {
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

  // Keep handleDismissRef in sync so the auto-close interval callback always has the current version
  useEffect(() => { handleDismissRef.current = handleDismiss; }, [handleDismiss]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && countdown <= 0) handleDismiss();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [countdown, handleDismiss]);

  // Overlay mode: just a dark background blocking the other monitor
  if (isOverlay) {
    return <div style={{ minHeight: '100vh', background: 'rgba(0,0,0,0.75)' }} />;
  }

  if (!data) {
    return <div style={{ minHeight: '100vh', background: '#fff' }} />;
  }

  const { eventType, title, body, promptText, sessionNumber, promptCountTotal } = data;
  const meta = EVENT_META[eventType] ?? EVENT_META.mindfulness;
  const hasPrompt = promptText.length > 0;
  const hasContext = title || body;

  // Prompt counter: shown only in M-mode mindfulness events
  const showCounter = eventType === 'mindfulness' && sessionNumber && sessionNumber > 0;
  const counterText = showCounter
    ? (promptCountTotal ? `Prompt ${sessionNumber} of ${promptCountTotal}` : `Prompt ${sessionNumber}`)
    : null;

  return (
    // Dark fullscreen background covering the active monitor
    <div className="flex min-h-screen flex-col items-center justify-center bg-black/75">
      {/* Centered popup card — ~480px wide, same content as before */}
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-2xl bg-white px-8 py-6 shadow-2xl">
        {/* Thin colored accent strip at top */}
        <div className={`absolute left-0 right-0 top-0 h-1 ${meta.accent}`} />

        {/* Prompt text */}
        {hasPrompt && (
          <p className="text-center text-xl font-semibold leading-snug text-gray-900">
            {promptText}
          </p>
        )}

        {/* Prompt counter (M-mode only) */}
        {counterText && (
          <p className="mt-2 text-center text-xs font-medium text-gray-400 uppercase tracking-widest">
            {counterText}
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
    </div>
  );
}
