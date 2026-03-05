'use client';

import type { AppMode } from '@/lib/types';
import Card from '../ui/Card';

// ── Tooltip ────────────────────────────────────────────────────────────────────

interface TooltipProps {
  text: string;
  href: string;
  children: React.ReactNode;
}

function Tooltip({ text, href, children }: TooltipProps) {
  return (
    <span className="relative group inline-block">
      <span className="underline decoration-dotted cursor-help">{children}</span>
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-72 max-w-[90vw] rounded-lg bg-gray-800 text-white text-xs leading-relaxed px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {text}{' '}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto underline text-blue-300 hover:text-blue-200"
        >
          Learn more on Wikipedia →
        </a>
      </span>
    </span>
  );
}

// ── Image icons ────────────────────────────────────────────────────────────────

function BowlIcon() {
  return (
    <img src="/images/bowl.png" alt="Meditation bowl" className="h-20 w-auto object-contain" />
  );
}

function TomatoIcon() {
  return (
    <img src="/images/tomato.png" alt="Tomato timer" className="h-20 w-auto object-contain" />
  );
}

function LogoIcon() {
  return (
    <img src="/images/logo.png" alt="Combo mode" className="h-20 w-auto object-contain" />
  );
}

// ── Mode definitions ───────────────────────────────────────────────────────────

const modes: { key: AppMode; title: string; description: string; icon: React.ReactNode }[] = [
  {
    key: 'mindfulness',
    title: 'Mindfulness Prompts',
    description: 'Timed pop-up reminders that make you stop and reflect.',
    icon: <BowlIcon />,
  },
  {
    key: 'pomodoro',
    title: 'Timed Work Sessions',
    description: 'Pomodoro-style work periods and breaks.',
    icon: <TomatoIcon />,
  },
  {
    key: 'both',
    title: 'Combo Mode: Mindfulness Prompts Embedded in Work Sessions',
    description: '',
    icon: <LogoIcon />,
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ModeSelect({ onSelect }: { onSelect: (mode: AppMode) => void }) {
  return (
    <div className="space-y-8">
      <div className="text-center px-2">
        <div className="flex justify-center mb-3">
          <img src="/images/logo.png" alt="MindfulPrompter" className="h-16 w-auto" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">MindfulPrompter</h1>
        <div className="mt-3 space-y-1">
          <p className="text-base font-medium text-gray-800 leading-snug">
            Mindfulness Prompter and Work Session Timer
          </p>
          <p className="text-sm text-gray-500 leading-relaxed">
            — alone or with others, with{' '}
            <Tooltip
              text="A time management method where you work in focused intervals (typically 25 minutes) separated by short breaks, with longer breaks after several cycles."
              href="https://en.wikipedia.org/wiki/Pomodoro_Technique"
            >
              Pomodoro-style sessions
            </Tooltip>{' '}
            and{' '}
            <Tooltip
              text="Small, non-intrusive prompts that gently steer behavior in a desired direction — without commands or restrictions. Widely used in behavioral economics and public policy."
              href="https://en.wikipedia.org/wiki/Nudge_theory"
            >
              behavioral nudges
            </Tooltip>
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-center text-lg text-gray-700">Choose your mode:</h2>
        <div className="space-y-3">
          {modes.map((m) => (
            <Card key={m.key} onClick={() => onSelect(m.key)}>
              <div className="flex items-center gap-4">
                <div className="shrink-0">{m.icon}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{m.title}</h3>
                  {m.description && <p className="text-sm text-gray-500">{m.description}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
