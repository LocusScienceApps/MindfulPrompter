# MindfulPrompter

A Progressive Web App (PWA) for mindfulness prompts and Pomodoro-style focus sessions. Installable on Android and iPhone.

**GitHub:** https://github.com/LocusScienceApps/MindfulPrompter

## Tech Stack
- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Web Worker** for accurate background timing
- **PWA** with hand-written service worker
- **localStorage** for settings persistence (v1)
- To be deployed on **Vercel**

## Architecture
- Single-page app with 6 screens, navigated via React state
- Core timing logic in `lib/schedule.ts` — computes a flat event array from settings
- `public/timer-worker.js` — Web Worker ticks every second, immune to background tab throttling
- `public/sw.js` — Service worker for offline caching and notification click handling
- `components/NotificationOverlay.tsx` — In-app popup with dismiss countdown

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

## Important Gotchas
- **React strict mode (dev only):** Double-mounts components and re-runs effects. Timer uses `startTimeRef` (a ref) to preserve the original start time across re-mounts. Don't use guards like `initializedRef` — they prevent the worker from being re-created after cleanup.
- **JavaScript falsy 0:** Use `settings.dismissSeconds` not `settings.dismissSeconds || 5` — the `||` converts valid `0` to `5`.
- **Web apps can't force windows to front:** Unlike WinForms TopMost, browser tabs can't steal focus. Browser Notification API is the closest alternative (appears as system-level notification).
- **Audio autoplay:** AudioContext must be initialized from a user gesture (e.g., "Begin Session" button click).

## Session — 2026-02-13
**What was done:**
- Created new Next.js project from scratch
- Built all 6 screens with the redesigned 3-mode flow (from user's A-F notes)
- Built timer engine with Web Worker for background accuracy
- Built notification overlay with dismiss countdown
- Set up PWA manifest and service worker
- Sound via Web Audio API (two-tone chime, no external file)
- Browser notifications fire on every event (not just when tab hidden)
- Fixed: no popup on session start, prompt text front-and-center, pomodoro-only has no dismiss delay, mindfulness-only hides set/session labels, single "Session started" log entry
- Committed and pushed to GitHub

**Current state:**
- All 6 screens built and working
- Timer countdown may still have issues in dev mode (React strict mode double-mount)
  - Should be tested in production build (`npm run build && npm start`) to confirm it's dev-only
- No PWA icons yet (need 192x192 and 512x512 PNGs)
- Not yet deployed to Vercel
- The `sound/chime.mp3` directory in public/ is empty (sound is generated via Web Audio API, no file needed)

**Next session priorities:**
1. Test timer in production build to confirm dev-mode-only timing issue
2. Deploy to Vercel
3. Generate PWA icons
4. Test PWA install on phone (Android + iPhone)
5. Polish: any UI/text tweaks from user testing

**Future (v2):**
- Saved presets/templates (0-9) with custom names
- Settings management (edit defaults, factory reset)
- User accounts (Firebase/Supabase auth)
- Cloud sync of settings
- Improved session-complete popup with detailed stats
