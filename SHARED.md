# Prosochai

Cross-platform mindfulness prompt + Pomodoro timer desktop app. Core value: **blocking popup that forces the user to read and reflect on a mindfulness prompt before dismissing** — that's the whole point.

**GitHub:** https://github.com/LocusScienceApps/MindfulPrompter (repo still named MindfulPrompter)
**Batch file (feature gold standard):** `C:\Users\wmben\Coding\Mindfulness_Prompt_Bat\MindfulnessPrompter.bat`
→ Feature logic in the batch file is the reference standard. Its UI (console menus) is irrelevant.

**Develop:** Run `dev-browser.bat` (browser) or `dev-tauri.bat` (full app).

---

## Current Status

**Phase 2 in progress.** Session 40 complete — see [TODO.md](TODO.md) for next steps.

- Phase 1 ✅ (Sessions 1–21): all features matching batch file
- Phase 2 🔄 (Sessions 22–40): Tauri + Firebase cowork + redesign v2 — **needs regression testing (TODO.md A–P)**
- Session 40 ✅: Bug fix — "End session" now correctly removes Live display and schedule banner; "Leave session" still shows Live + running banner. Fixed via `hasJustEndedSession` flag + `runningSoloSession`-gated `liveSoloItems`.
- Redesign v2 Stage 1 ✅ (Session 38): unified always-editable view — edit-lock removed, full form always shown, all fields pending until saved
- Redesign v2 Stages 2–5 ✅ (Session 39): unified Saved Sessions card (Live/Upcoming/Recent/Templates); `endedAt` cowork tracking; End session from Main; unified Start/Save card; guest fix
- Session 37 ✅: UI fixes, Settings modal, Why Prosochai text revisions
- Session 36 ✅: Sessions section overhaul — Solo/Coworking subsections, up to 5 solo schedules, locale-aware formatting
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
- Main.tsx: no edit-lock — full editable form always shown; all changes go to `pendingSettings` (`p`) until saved/started
- `Settings` includes timing intent (`startType/startTime/startDays/startTimezone`) and coworking intent (`isCoworking/sharePrompts`); ephemeral `lockedFields` for guest field locking
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
      HelpModal.tsx          ← FAQ modal (opened from top nav)
      WhyProsochaiModal.tsx  ← "Why Prosochai?" story/about modal (opened from top nav)
      Button.tsx, NumberInput.tsx, ProgressRing.tsx, ToggleSwitch.tsx, etc.
  lib/
    types.ts      ← Settings (incl. startType/isCoworking/lockedFields), CoworkRoom, TimerEvent
    defaults.ts   ← getDefaults(), generatePresetName(), generateRoomName()
    schedule.ts   ← timing event computation; branches on useTimedWork/useMindfulness
    storage.ts    ← persistence; key mindful-prompter-v3; v2 migration (wipe on detect)
    cowork.ts     ← room CRUD, host-rooms index, recurrence, buildHostSettings(), loadCoworkSessionAsSettings()
    firebase.ts   ← Firebase init, anonymous auth
    formatLocale.ts  ← locale-aware time/date/day formatting (12h/24h, week start, sortDays)
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
- **External links in Tauri:** `<a target="_blank">` does nothing. Use `openExternal(url)` from `@/lib/tauri` which calls `tauri-plugin-opener` in Tauri and `window.open` in browser. Internal app routes (e.g. `/why-prosochai`) cannot be opened in an external browser from Tauri — use modals instead.
- **Tooltip hover gap:** Tooltip components use `useRef` + `setTimeout` (200ms delay) for hide, with `onMouseEnter`/`onMouseLeave` on both the trigger wrapper and the popup itself. This lets the mouse cross the gap without the tooltip disappearing.

---

## Tauri Key Files

- `src-tauri/src/lib.rs` — `show_notification` (async), `get_notification_data`, `close_notification_window` (async)
- `src-tauri/capabilities/default.json` — windows allowlist: `["main", "notification", "notification-overlay-*"]`
- `src/app/popup/page.tsx` — popup UI: dark fullscreen bg, centered white card, handles overlay mode
- `src/lib/tauri.ts` — `isTauri()`, `openExternal()` (opens URL in default browser, Tauri+browser), `showNotificationWindow()`, `onNotificationDismissed()`
- `src/components/screens/Timer.tsx` — calls Tauri or overlay depending on environment
