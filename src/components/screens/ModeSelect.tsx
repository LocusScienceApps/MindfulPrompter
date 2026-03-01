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

// ── SVG icon primitives ────────────────────────────────────────────────────────
// Each Paths component contains raw SVG elements for reuse in the combined icon.
// Coordinate space: GongPaths → 52×44,  TomatoPaths → 44×44

function GongPaths() {
  return (
    <>
      {/* Stand: top crossbar + two vertical posts */}
      <line x1="5"  y1="8"  x2="37" y2="8"  strokeWidth="2.2" />
      <line x1="5"  y1="8"  x2="5"  y2="40" strokeWidth="2"   />
      <line x1="37" y1="8"  x2="37" y2="40" strokeWidth="2"   />
      {/* Hanging cord */}
      <line x1="21" y1="8"  x2="21" y2="13" strokeWidth="1.5" />
      {/* Gong disc — outer ring */}
      <circle cx="21" cy="26" r="12" strokeWidth="2.2" />
      {/* Gong disc — inner strike point */}
      <circle cx="21" cy="26" r="4"  strokeWidth="1.5" />
      {/* Mallet handle (angled, resting against right post) */}
      <line x1="38" y1="35" x2="48" y2="22" strokeWidth="2" />
      {/* Mallet head (solid) */}
      <circle cx="48" cy="21" r="4" fill="currentColor" stroke="none" />
    </>
  );
}

function TomatoPaths() {
  return (
    <>
      {/* Tomato body */}
      <circle cx="22" cy="28" r="15" strokeWidth="2.2" />
      {/* Stem (slight curve to upper-right) */}
      <path d="M22,13 C23,10 25,8 24,5" strokeWidth="1.8" fill="none" />
      {/* Calyx leaves */}
      <path d="M22,13 C18,11 15,13 17,16" strokeWidth="1.5" fill="none" />
      <path d="M22,13 C26,11 29,13 27,16" strokeWidth="1.5" fill="none" />
      {/* Clock tick marks at 12, 3, 6, 9 */}
      <line x1="22" y1="15" x2="22" y2="18" strokeWidth="1.5" />
      <line x1="35" y1="28" x2="32" y2="28" strokeWidth="1.5" />
      <line x1="22" y1="41" x2="22" y2="38" strokeWidth="1.5" />
      <line x1="9"  y1="28" x2="12" y2="28" strokeWidth="1.5" />
      {/* Clock hands: minute (pointing to 12), hour (pointing to ~2) */}
      <line x1="22" y1="28" x2="22" y2="18" strokeWidth="2"   />
      <line x1="22" y1="28" x2="30" y2="23" strokeWidth="1.8" />
      {/* Center pivot (solid) */}
      <circle cx="22" cy="28" r="1.5" fill="currentColor" stroke="none" />
    </>
  );
}

// ── Standalone icons ───────────────────────────────────────────────────────────

function GongIcon() {
  return (
    <svg
      viewBox="0 0 52 44"
      width="52"
      height="44"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <GongPaths />
    </svg>
  );
}

function TomatoIcon() {
  return (
    <svg
      viewBox="0 0 44 44"
      width="44"
      height="44"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <TomatoPaths />
    </svg>
  );
}

/**
 * Gong + "+" + tomato side by side at 68% scale (84×44).
 * SVG transforms apply right-to-left: translate(tx,ty) scale(s)
 * means point (x,y) → (s·x + tx,  s·y + ty).
 *
 * Gong  52×44 @ 0.68 → 35.4×29.9  placed at (0, 7)  spans x 0–35  y 7–37
 * Plus  10×10         centered at (43, 22)
 * Tomato 44×44 @ 0.68 → 29.9×29.9  placed at (52, 7) spans x 52–82 y 7–37
 */
function BothIcon() {
  return (
    <svg
      viewBox="0 0 84 44"
      width="84"
      height="44"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <g transform="translate(0, 7) scale(0.68)">
        <GongPaths />
      </g>

      {/* Plus sign */}
      <line x1="38" y1="22" x2="48" y2="22" strokeWidth="2.2" />
      <line x1="43" y1="17" x2="43" y2="27" strokeWidth="2.2" />

      <g transform="translate(52, 7) scale(0.68)">
        <TomatoPaths />
      </g>
    </svg>
  );
}

// ── Mode definitions ───────────────────────────────────────────────────────────

const modes: { key: AppMode; title: string; description: string; icon: React.ReactNode }[] = [
  {
    key: 'mindfulness',
    title: 'Mindfulness Prompts',
    description: 'Timed pop-up reminders that make you stop and reflect.',
    icon: <GongIcon />,
  },
  {
    key: 'pomodoro',
    title: 'Pomodoro Timer',
    description: 'Customizable work and break sessions.',
    icon: <TomatoIcon />,
  },
  {
    key: 'both',
    title: 'Both Together',
    description: 'Mindfulness prompts within your work sessions.',
    icon: <BothIcon />,
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ModeSelect({ onSelect }: { onSelect: (mode: AppMode) => void }) {
  return (
    <div className="space-y-8">
      <div className="text-center px-2">
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
                <div className="shrink-0 text-indigo-600">{m.icon}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{m.title}</h3>
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
