'use client';

import type { AppMode } from '@/lib/types';
import Card from '../ui/Card';

interface ModeSelectProps {
  onSelect: (mode: AppMode) => void;
}

const modes: { key: AppMode; title: string; description: string; icon: string }[] = [
  {
    key: 'mindfulness',
    title: 'Mindfulness Prompts',
    description: 'Regular check-in reminders while you work',
    icon: '🧘',
  },
  {
    key: 'pomodoro',
    title: 'Pomodoro Timer',
    description: 'Structured work and break sessions',
    icon: '⏱️',
  },
  {
    key: 'both',
    title: 'Both Together',
    description: 'Work/break sessions with mindfulness check-ins',
    icon: '✨',
  },
];

export default function ModeSelect({ onSelect }: ModeSelectProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">MindfulPrompter</h1>
        <p className="mt-2 text-gray-500">
          Mindfulness prompts and focus sessions
        </p>
      </div>

      <div>
        <h2 className="mb-4 text-center text-lg text-gray-700">
          How would you like to use MindfulPrompter today?
        </h2>
        <div className="space-y-3">
          {modes.map((m) => (
            <Card key={m.key} onClick={() => onSelect(m.key)}>
              <div className="flex items-center gap-4">
                <span className="text-3xl">{m.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {m.title}
                  </h3>
                  <p className="text-sm text-gray-500">{m.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
