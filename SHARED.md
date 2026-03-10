# Prosochai

Cross-platform mindfulness prompt + Pomodoro timer desktop app. Core value: **blocking popup that forces the user to read and reflect on a mindfulness prompt before dismissing** — that's the whole point.

**GitHub:** https://github.com/LocusScienceApps/MindfulPrompter (repo still named MindfulPrompter)
**Batch file (feature gold standard):** `C:\Users\wmben\Coding\Mindfulness_Prompt_Bat\MindfulnessPrompter.bat`
→ Feature logic in the batch file is the reference standard. Its UI (console menus) is irrelevant.

**Develop:** Run `dev-browser.bat` (browser) or `dev-tauri.bat` (full app).

---

## Current Status

**Phase 2 in progress.** Session 32 complete — see [TODO.md](TODO.md) for next steps.

- Phase 1 ✅ (Sessions 1–21): all features matching batch file
- Phase 2 🔄 (Sessions 22–32): Tauri + Firebase cowork + redesign v2 Phase 1 — **needs regression testing (TODO.md A–P)**
- Redesign v2 Phase 1 ✅: single-screen design, edit-lock, timing/coworking in Settings, Sessions section, guest locked fields — all implemented
- Phase 3/4: optional accounts + paid tiers — post-traction only

→ Architecture decisions, distribution plan, phase details: [docs/architecture.md](docs/architecture.md)
→ Session notes: [docs/session-history.md](docs/session-history.md)
→ Redesign v2 spec: [docs/redesign-v2.md](docs/redesign-v2.md)

---

## Tech Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Web Worker** for timing (`public/timer-worker.js`) — immune to background tab throttling
- **Tauri** for native desktop wrapper (~5MB installer)
- **Firebase** Realtime Database for cowork rooms; Anonymous Auth (no accounts needed)

---

## Architecture (quick reference)

- Single-page app, 4 screens via React state in `src/components/App.tsx`
- Screens: `main | scheduled-start | timer | session-complete` (Customize + Summary deleted in Session 32)
- Settings model: two independent booleans `useTimedWork` + `useMindfulness` (no AppMode)
- Main.tsx has edit-lock toggle: locked (display-only) by default; edit mode shows inline forms
- `Settings` now includes timing intent (`startType/startTime/startDays/startTimezone`) and coworking intent (`isCoworking/sharePrompts`); ephemeral `lockedFields` for guest field locking
- `src/lib/schedule.ts` — builds flat `TimerEvent[]` from settings
- Storage key: `mindful-prompter-v3` (localStorage for browser dev; Tauri AppData = next step)

---

## Key Source Files

```
src/
  components/
    App.tsx                  ← state machine, screen routing, cowork session polling
    NotificationOverlay.tsx  ← in-app popup (browser fallback to Tauri window)
    screens/
      Main.tsx               ← ONLY settings screen: edit-lock toggle, inline Pomodoro/Prosochai/Timing/Coworking, Sessions section, save options bar, join panel
      ScheduledStart.tsx     ← countdown-only screen (receives startMs prop)
      Timer.tsx              ← active session: room code toggle, host end-session
      SessionComplete.tsx    ← session stats
    ui/
      SettingsDisplay.tsx    ← shared settings summary (sound toggle, Timed Work card, Mindfulness card)
      WhenSection.tsx        ← "When should this session start?" (now / specific / recurring)
      Button.tsx, NumberInput.tsx, ProgressRing.tsx, ToggleSwitch.tsx, etc.
  lib/
    types.ts      ← Settings (incl. startType/isCoworking/lockedFields), CoworkRoom, TimerEvent
    defaults.ts   ← getDefaults(), generatePresetName(), generateRoomName()
    schedule.ts   ← timing event computation; branches on useTimedWork/useMindfulness
    storage.ts    ← persistence; key mindful-prompter-v3; v2 migration (wipe on detect)
    cowork.ts     ← room CRUD, host-rooms index, recurrence, buildHostSettings(), loadCoworkSessionAsSettings()
    firebase.ts   ← Firebase init, anonymous auth
    validation.ts, format.ts, sound.ts, registerSW.ts
src-tauri/
  src/lib.rs     ← show_notification (async), get_notification_data, close_notification_window (async)
  capabilities/default.json  ← windows allowlist: ["main", "notification", "notification-overlay-*"]
public/
  timer-worker.js, sw.js, manifest.json, icons/
```

---

## Terminology

- "Sets" not "rounds" | "Prompts" not "reminders" | "Sessions" = the whole activity start-to-finish
- Hierarchy: **work period** (25 min) → **set** (N periods) → **session** (all sets)

---

## Critical Gotchas

- **Falsy 0:** Use `settings.dismissSeconds` not `settings.dismissSeconds || 5` — `||` converts valid `0` to `5`.
- **React strict mode:** Double-mounts in dev. Timer uses `startTimeRef`. Don't use `initializedRef` guards — they prevent worker re-creation after cleanup.
- **React setState-in-render:** Never call a parent state setter inside a child's `setState` updater. Use `useEffect` or event handler.
- **Tauri async commands:** Any command creating/closing a `WebviewWindow` MUST be `async fn`. Synchronous commands deadlock WebView2 on Windows (wry #583).
- **isTauri() guards:** Any `@tauri-apps/api` call in a page that also loads in browser MUST be guarded. WebView2 treats unhandled rejections as fatal (blanks the page). Use `import { isTauri } from '@/lib/tauri'`.
- **Static export:** `output: 'export'` in `next.config.ts` — required for Tauri. No API routes.
- **Web apps can't force windows to front:** That's WHY we need Tauri. Don't try to solve with browser APIs.
- **Audio autoplay:** AudioContext must be initialized from a user gesture.

---

## Tauri Key Files

- `src-tauri/src/lib.rs` — `show_notification` (async), `get_notification_data`, `close_notification_window` (async)
- `src-tauri/capabilities/default.json` — windows allowlist: `["main", "notification", "notification-overlay-*"]`
- `src/app/popup/page.tsx` — popup UI: dark fullscreen bg, centered white card, handles overlay mode
- `src/lib/tauri.ts` — `isTauri()`, `showNotificationWindow()`, `onNotificationDismissed()`
- `src/components/screens/Timer.tsx` — calls Tauri or overlay depending on environment
