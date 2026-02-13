# MindfulPrompter

A Progressive Web App (PWA) for mindfulness prompts and Pomodoro-style focus sessions. Installable on Android and iPhone.

## Tech Stack
- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Web Worker** for accurate background timing
- **PWA** with hand-written service worker
- **localStorage** for settings persistence (v1)
- Deployed on **Vercel**

## Architecture
- Single-page app with 6 screens, navigated via React state
- Core timing logic in `lib/schedule.ts` — computes a flat event array from settings
- `public/timer-worker.js` — Web Worker ticks every second, immune to background tab throttling
- `public/sw.js` — Service worker for offline caching and notification click handling
- `components/NotificationOverlay.tsx` — In-app popup with dismiss countdown (replaces WinForms popups from .bat version)

## UX Flow
1. **Mode Select** — Mindfulness only / Pomodoro only / Both
2. **Defaults Review** — Show defaults for chosen mode, Start or Customize
3. **Customize** — Step-by-step wizard, questions vary by mode
4. **Summary** — Review settings, Begin Session
5. **Timer** — Active countdown with progress ring, event log, notification overlays
6. **Session Complete** — Stats, restart options

## Terminology
- "Sets" not "rounds"
- "Sessions" not "pomodoros" in user-facing text (except in parenthetical explanations)

## Ported from .bat
- Absolute-time scheduling (all events as offsets from start)
- Divisibility validation for prompt intervals
- Popup replacement logic (only one overlay at a time)
- Format helpers (formatNum, formatDuration)

## Session — 2026-02-13
**What was done:**
- Created new Next.js project from scratch
- Built all 6 screens with the redesigned 3-mode flow
- Built timer engine with Web Worker for background accuracy
- Built notification overlay with dismiss countdown
- Set up PWA manifest and service worker
- Build compiles with zero errors

**Current state:**
- All screens built, needs testing and polish
- No icons generated yet (placeholder)
- No sound file yet
- No Git repo or Vercel deployment yet

**Next steps:**
- Test all flows in browser
- Generate PWA icons
- Add sound support
- Create Git repo, push to GitHub, deploy to Vercel
- Test PWA install on phone

**Future (v2):**
- Saved presets/templates (0-9) with custom names
- Settings management (edit defaults, factory reset)
- User accounts (Firebase/Supabase auth)
- Cloud sync of settings
- Improved session-complete popup with detailed stats
