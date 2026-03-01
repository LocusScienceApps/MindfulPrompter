'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TimerEvent } from '@/lib/types';

interface NotificationOverlayProps {
  event: TimerEvent | null;
  dismissSeconds: number;
  onDismiss: () => void;
}

export default function NotificationOverlay({
  event,
  dismissSeconds,
  onDismiss,
}: NotificationOverlayProps) {
  const [countdown, setCountdown] = useState(dismissSeconds);

  // Reset countdown whenever a new event arrives
  useEffect(() => {
    if (!event) return;
    setCountdown(dismissSeconds);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [event, dismissSeconds]);

  const handleDismiss = useCallback(() => {
    if (countdown <= 0) {
      onDismiss();
    }
  }, [countdown, onDismiss]);

  // Allow Enter key to dismiss once the button is active
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && countdown <= 0) {
        onDismiss();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [countdown, onDismiss]);

  if (!event) return null;

  // Pick a color based on event type
  const colorClass = {
    mindfulness: 'from-indigo-500 to-indigo-600',
    work_start: 'from-emerald-500 to-emerald-600',
    short_break: 'from-amber-500 to-amber-600',
    long_break: 'from-orange-500 to-orange-600',
    session_complete: 'from-purple-500 to-purple-600',
  }[event.type];

  const hasPrompt = event.promptText && event.promptText.length > 0;
  const hasContext = event.title || event.body;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`w-full max-w-sm rounded-3xl bg-gradient-to-br ${colorClass} p-6 text-white shadow-2xl`}
      >
        {/* Mindfulness prompt text — BIG and front-and-center */}
        {hasPrompt && (
          <p className="text-center text-2xl font-bold leading-snug">
            {event.promptText}
          </p>
        )}

        {/* Context info — smaller, below the prompt */}
        {hasContext && (
          <div className={`${hasPrompt ? 'mt-5 border-t border-white/20 pt-4' : ''}`}>
            {event.title && (
              <p className={`text-center font-semibold ${hasPrompt ? 'text-base opacity-90' : 'text-xl'}`}>
                {event.title}
              </p>
            )}
            {event.body && (
              <p className={`whitespace-pre-line text-center leading-relaxed ${hasPrompt ? 'mt-1 text-sm opacity-80' : 'mt-2 text-base opacity-95'}`}>
                {event.body}
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
