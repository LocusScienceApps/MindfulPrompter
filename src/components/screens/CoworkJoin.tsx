'use client';

import { useState, useEffect, useRef } from 'react';
import type { CoworkRoom, GuestContentMode, Settings } from '@/lib/types';
import { getRoom, computeRoomTiming, buildGuestSettings } from '@/lib/cowork';
import { formatCountdown } from '@/lib/format';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface CoworkJoinProps {
  onGuestStart: (settings: Settings, startMs: number) => void;
  onBack: () => void;
}

function RoomStatusBadge({ room }: { room: CoworkRoom }) {
  const [timing, setTiming] = useState(() => computeRoomTiming(room));
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      setTiming(computeRoomTiming(room));
    }, 1000);
    return () => clearInterval(id);
  }, [room]);

  if (!timing) return <p className="text-sm text-red-600">Could not compute session timing.</p>;

  if (timing.isFuture) {
    const secsUntil = Math.max(0, (timing.startMs - now) / 1000);
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
        Starts in <span className="font-bold">{formatCountdown(secsUntil)}</span>
      </div>
    );
  }

  if (timing.isActive) {
    const secsElapsed = Math.floor(timing.elapsedMs / 1000);
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
        Session in progress — <span className="font-bold">{formatCountdown(secsElapsed)}</span> elapsed
      </div>
    );
  }

  // Session ended, but there may be a next occurrence
  if (timing.nextStartMs) {
    const secsUntil = Math.max(0, (timing.nextStartMs - now) / 1000);
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
        Session ended. Next session in <span className="font-bold">{formatCountdown(secsUntil)}</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
      Session has ended.
    </div>
  );
}

export default function CoworkJoin({ onGuestStart, onBack }: CoworkJoinProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [room, setRoom] = useState<CoworkRoom | null>(null);
  const [contentMode, setContentMode] = useState<GuestContentMode>('pomodoro-only');
  const codeInputRef = useRef<HTMLInputElement>(null);

  const handleLookup = async () => {
    const cleaned = code.trim().toUpperCase();
    if (cleaned.length !== 6) {
      setError('Room codes are 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const found = await getRoom(cleaned);
      if (!found) {
        setError('Room not found. Check the code and try again.');
      } else {
        setRoom(found);
      }
    } catch {
      setError('Could not reach the server. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = () => {
    if (!room) return;
    const timing = computeRoomTiming(room);
    if (!timing) return;

    const startMs = timing.isActive ? timing.startMs : timing.startMs;
    const settings = buildGuestSettings(room, contentMode);
    onGuestStart(settings, startMs);
  };

  const timing = room ? computeRoomTiming(room) : null;
  const canJoin = timing ? (timing.isActive || timing.isFuture) : false;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Join a Cowork Session</h2>
        <p className="text-sm text-gray-500 mt-1">Enter the 6-character room code.</p>
      </div>

      {/* Code input */}
      <Card>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Room Code</label>
          <div className="flex gap-3">
            <input
              ref={codeInputRef}
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
              onKeyDown={e => { if (e.key === 'Enter') handleLookup(); }}
              placeholder="ABCXYZ"
              maxLength={6}
              className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 text-2xl font-mono tracking-[0.3em] uppercase text-center focus:outline-none focus:border-indigo-500"
              disabled={!!room}
            />
            {!room && (
              <Button onClick={handleLookup} disabled={loading}>
                {loading ? '…' : 'Look up'}
              </Button>
            )}
            {room && (
              <Button variant="secondary" onClick={() => { setRoom(null); setCode(''); setError(''); }}>
                Change
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Card>

      {/* Room info */}
      {room && (
        <>
          <Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-800">Room {room.code}</h3>
              </div>
              <RoomStatusBadge room={room} />
              <div className="space-y-1 text-sm text-gray-600 pt-1">
                <p><span className="font-medium">Work:</span> {room.timingSettings.workMinutes} min</p>
                <p><span className="font-medium">Break:</span> {room.timingSettings.breakMinutes} min</p>
                <p>
                  <span className="font-medium">Sessions:</span>{' '}
                  {room.timingSettings.sessionsPerSet} per set
                  {room.timingSettings.multipleSets && ` × ${room.timingSettings.numberOfSets} sets`}
                </p>
                {room.recurrenceRule && (
                  <p>
                    <span className="font-medium">Schedule:</span>{' '}
                    {room.recurrenceRule.days.join(', ')} at {room.recurrenceRule.time}{' '}
                    ({room.recurrenceRule.timezone})
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Content mode */}
          <Card>
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-gray-700">Your experience</h3>
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={contentMode === 'pomodoro-only'}
                    onChange={() => setContentMode('pomodoro-only')}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Pomodoro only</p>
                    <p className="text-xs text-gray-500">Timer sync only — no mindfulness popups</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={contentMode === 'own-prompts'}
                    onChange={() => setContentMode('own-prompts')}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">My own mindfulness prompts</p>
                    <p className="text-xs text-gray-500">Timer sync + your saved prompt settings</p>
                  </div>
                </label>
                {room.sharePrompts && room.promptSettings && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={contentMode === 'host-prompts'}
                      onChange={() => setContentMode('host-prompts')}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">Host's prompts</p>
                      <p className="text-xs text-gray-500 italic">
                        "{room.promptSettings.promptText.slice(0, 60)}
                        {room.promptSettings.promptText.length > 60 ? '…' : ''}"
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </Card>

          <Button onClick={handleJoin} disabled={!canJoin} className="w-full">
            {timing?.isFuture ? 'Join (wait for start)' : 'Join Session'}
          </Button>

          {!canJoin && (
            <p className="text-xs text-center text-gray-400">
              {timing?.nextStartMs
                ? 'Join when the next session begins.'
                : 'This session has ended.'}
            </p>
          )}
        </>
      )}

      <Button onClick={onBack} variant="ghost" className="w-full">
        Back
      </Button>
    </div>
  );
}
