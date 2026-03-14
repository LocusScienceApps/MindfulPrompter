'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onClose: () => void;
  onResetToOriginal: () => void;
  isAtSoftwareDefaults: boolean;
}

export default function SettingsModal({ onClose, onResetToOriginal, isAtSoftwareDefaults }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleConfirmReset = () => {
    setConfirmReset(false);
    onResetToOriginal();
    onClose();
  };

  const showTip = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowTooltip(true);
  };
  const hideTip = () => {
    hideTimer.current = setTimeout(() => setShowTooltip(false), 200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Restore software defaults</h3>
            <p className="text-sm text-gray-500">
              Reset all settings back to the app&rsquo;s built-in defaults. Any defaults you have saved will be cleared.
            </p>
            {isAtSoftwareDefaults ? (
              <span className="relative inline-block" onMouseEnter={showTip} onMouseLeave={hideTip}>
                <span className="text-sm text-gray-300 underline cursor-default">
                  Restore software defaults
                </span>
                {showTooltip && (
                  <span className="absolute left-0 top-6 z-50 w-64 rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-600 shadow-lg">
                    Your settings are already at the software defaults.
                  </span>
                )}
              </span>
            ) : confirmReset ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                <p className="text-sm text-red-800">This will clear your saved defaults and restore the app&rsquo;s original settings. Are you sure?</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmReset}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Yes, restore software defaults
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="text-sm text-red-500 hover:text-red-700 underline"
              >
                Restore software defaults
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
