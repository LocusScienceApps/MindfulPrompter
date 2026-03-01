'use client';

import { useState, useEffect, useCallback } from 'react';

interface NotificationData {
  eventType: string;
  title: string;
  body: string;
  promptText: string;
  dismissSeconds: number;
}

export default function PopupPage() {
  const [data, setData] = useState<NotificationData | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Fetch notification data on mount.
  // Dev mode: data is in URL query params (no IPC needed to display content).
  // Prod mode: data comes from Tauri state via invoke.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventType = params.get('eventType');
    if (eventType) {
      const dismissSeconds = parseInt(params.get('dismissSeconds') ?? '5', 10);
      setData({
        eventType,
        title: params.get('title') ?? '',
        body: params.get('body') ?? '',
        promptText: params.get('promptText') ?? '',
        dismissSeconds,
      });
      setCountdown(dismissSeconds);
    } else {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke<NotificationData>('get_notification_data').then((result) => {
          if (result) {
            setData(result);
            setCountdown(result.dismissSeconds);
          }
        }).catch(console.error);
      });
    }
  }, []);

  // Listen for session-stopped so popup closes automatically when session ends
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen('session-stopped', async () => {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        getCurrentWindow().close();
      }).then((fn) => { unlisten = fn; });
    });
    return () => { unlisten?.(); };
  }, []);

  // Countdown timer
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

  const handleDismiss = useCallback(async () => {
    if (countdown > 0) return;
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('notification-dismissed', { eventType: data?.eventType ?? 'mindfulness' });
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (e) {
      console.error('Failed to dismiss notification:', e);
      window.close();
    }
  }, [countdown, data?.eventType]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && countdown <= 0) handleDismiss();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [countdown, handleDismiss]);

  // Show a loading state while fetching data
  if (!data) {
    return <div className="flex min-h-screen items-center justify-center bg-indigo-500" />;
  }

  const { eventType, title, body, promptText, dismissSeconds: _ } = data;

  const colorClass =
    ({
      mindfulness: 'from-indigo-500 to-indigo-600',
      work_start: 'from-emerald-500 to-emerald-600',
      short_break: 'from-amber-500 to-amber-600',
      long_break: 'from-orange-500 to-orange-600',
      session_complete: 'from-purple-500 to-purple-600',
    } as Record<string, string>)[eventType] ?? 'from-indigo-500 to-indigo-600';

  const hasPrompt = promptText.length > 0;
  const hasContext = title || body;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className={`w-full max-w-sm rounded-3xl bg-gradient-to-br ${colorClass} p-6 text-white shadow-2xl`}>
        {hasPrompt && (
          <p className="text-center text-2xl font-bold leading-snug">{promptText}</p>
        )}

        {hasContext && (
          <div className={hasPrompt ? 'mt-5 border-t border-white/20 pt-4' : ''}>
            {title && (
              <p className={`text-center font-semibold ${hasPrompt ? 'text-base opacity-90' : 'text-xl'}`}>
                {title}
              </p>
            )}
            {body && (
              <p className={`whitespace-pre-line text-center leading-relaxed ${hasPrompt ? 'mt-1 text-sm opacity-80' : 'mt-2 text-base opacity-95'}`}>
                {body}
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleDismiss}
          disabled={countdown > 0}
          className={`mt-6 w-full rounded-xl py-3 text-lg font-semibold transition-all ${
            countdown > 0
              ? 'cursor-not-allowed bg-white/20 text-white/70'
              : 'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700'
          }`}
        >
          {countdown > 0 ? `Wait (${countdown}s)...` : 'OK'}
        </button>
      </div>
    </div>
  );
}
