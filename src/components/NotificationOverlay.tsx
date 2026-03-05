'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimerEvent } from '@/lib/types';

interface NotificationOverlayProps {
  event: TimerEvent | null;
  dismissSeconds: number;
  autoClose?: boolean;
  onDismiss: () => void;
}

export default function NotificationOverlay({
  event,
  dismissSeconds,
  autoClose,
  onDismiss,
}: NotificationOverlayProps) {
  const [countdown, setCountdown] = useState(dismissSeconds);
  // Refs so the interval callback can read current values without stale closures
  const autoCloseRef = useRef(autoClose ?? false);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { autoCloseRef.current = autoClose ?? false; }, [autoClose]);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  // Reset countdown whenever a new event arrives
  useEffect(() => {
    if (!event) return;
    setCountdown(dismissSeconds);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Hard breaks auto-dismiss when the full break duration has elapsed
          if (autoCloseRef.current) {
            setTimeout(() => onDismissRef.current(), 50);
          }
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

  const accentClass = {
    mindfulness:      'bg-indigo-500',
    work_start:       'bg-emerald-500',
    short_break:      'bg-amber-400',
    long_break:       'bg-orange-400',
    session_complete: 'bg-gray-400',
  }[event.type];

  const hasPrompt = event.promptText && event.promptText.length > 0;
  const hasContext = event.title || event.body;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white px-8 py-6 shadow-2xl ring-1 ring-gray-200">
        {/* Thin colored accent strip at top */}
        <div className={`absolute left-0 right-0 top-0 h-1 ${accentClass}`} />

        {/* Mindfulness prompt text — prominent and front-and-center */}
        {hasPrompt && (
          <p className="text-center text-xl font-semibold leading-snug text-gray-900">
            {event.promptText}
          </p>
        )}

        {/* Prompt counter (M-mode only — promptCountTotal defined: 0=indefinite, N=finite) */}
        {event.type === 'mindfulness' && event.promptCountTotal !== undefined && event.sessionNumber > 0 && (
          <p className="mt-2 text-center text-xs font-medium text-gray-400 uppercase tracking-widest">
            {event.promptCountTotal > 0
              ? `Prompt ${event.sessionNumber} of ${event.promptCountTotal}`
              : `Prompt ${event.sessionNumber}`}
          </p>
        )}

        {/* Context info — title is the event heading, body is detail */}
        {hasContext && (
          <div className={hasPrompt ? 'mt-4 border-t border-gray-100 pt-4 w-full' : 'w-full'}>
            {event.title && (
              <p className={`text-center ${hasPrompt ? 'text-sm font-semibold text-gray-700' : 'text-base font-medium text-gray-600'}`}>
                {event.title}
              </p>
            )}
            {event.body && (
              <p className="mt-1 whitespace-pre-line text-center text-sm text-gray-500">
                {event.body}
              </p>
            )}
          </div>
        )}

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
