# MindfulPrompter

A cross-platform mindfulness prompt and Pomodoro timer desktop app. The core value proposition is **forcing an on-screen popup that blocks your work and makes you think about the mindfulness prompt for N seconds before you can dismiss it** — this is the whole point of the tool.

**GitHub:** https://github.com/LocusScienceApps/MindfulPrompter

**Batch file (feature gold standard):** `C:\Users\wmben\Coding\Mindfulness_Prompt_Bat\MindfulnessPrompter.bat`
→ Read this file at the start of every session. The batch file is always the reference for what features should exist and how they should behave. Its UI (console menus, text prompts) is irrelevant — its feature logic is the gold standard.

---

## Architecture Decisions (confirmed 2026-02-28)

### Wrapper: Tauri (not Electron, not pure web)
- Tauri wraps the Next.js web app in a native desktop shell
- **Why Tauri over Electron:** ~5MB installer vs ~150MB. Better for a commercial product.
- **Why not pure web app:** Browsers cannot force popups over other windows. A browser tab can't interrupt your work. This is the entire problem.
- **Development workflow:** Build and test as a normal web app in Chrome. Add Tauri wrapper later. The two Tauri-specific integration points are small and targeted (see below).
- **Mac:** Tauri is cross-platform. Same code runs on Mac. Building for Mac requires a Mac or GitHub Actions CI/CD — set that up before release, not now.

### The Two Tauri-Specific Integration Points
Everything is normal web code EXCEPT these two things, which need Tauri's native API:
1. **The blocking popup window** — must be a second native Tauri window set to always-on-top. Cannot use a CSS overlay (invisible if app isn't in front). ~10 lines of Tauri API code.
2. **Settings storage** — use Tauri's file system API to write JSON to AppData, NOT localStorage. localStorage is unreliable for a desktop app (can be cleared). AppData survives app reinstalls.

### Static Export Required
Next.js must be configured for static export because Tauri cannot run a Node.js server.
**This line must be in `next.config.ts`:** `output: 'export'`
Check this is set before any new code is written.

### Settings Storage Strategy (no accounts needed for v1)
- Settings saved to local AppData file via Tauri file API
- Survives reinstalls, very reliable (what VS Code, Slack, etc. use)
- Provide Export/Import settings buttons so users can back up to Dropbox etc.
- localStorage is NOT used in the final app (only acceptable during web-only dev phase)

### User Accounts: Phase 3 Only, Optional
- Phase 3 adds optional "Create account to sync across devices" using Firebase Auth + Firestore
- This is NOT full SaaS — no payments, no feature gating, just settings sync
- Estimated: 1-2 sessions of work, added without rewriting anything
- Anonymous Firebase IDs (auto-generated on first launch, no login required) give user stats from day 1

### Cowork / Shared Sessions: Phase 2, No Accounts Needed
- Host clicks "Start shared session" → gets a 6-character room code
- Guests enter the code → join the session
- Everyone's app receives the same timer events in real-time via Firebase Realtime Database
- Sessions are ephemeral (nothing stored after session ends)
- Firebase free tier is sufficient for a growing app (100 simultaneous connections, 1GB data)
- **No user accounts needed for this feature**

---

## Three-Phase Build Plan

### Phase 1: Update web app to match batch file (CURRENT PRIORITY)
The web app was built in Session 1 (2026-02-13) based on an early version of the batch file.
The batch file has since had a major Session 3 rewrite (2026-02-24) with significant new features.
**The web app must be brought up to date BEFORE adding the Tauri wrapper.**

Features missing from the web app (present in batch file Session 3):
- **Mode-specific defaults:** Separate default settings for each mode (defaultsP / defaultsM / defaultsB)
  - Mindfulness (M): 15min interval default (must divide evenly into 60min — validated)
  - Pomodoro (P): 25min work, 0sec dismiss delay (immediately closeable)
  - Both (B): 25min work, 12.5min prompts (must divide evenly into work session)
- **Mode-specific presets:** 5 slots per mode (P1-P5, M1-M5, B1-B5 = 15 total)
  - Load by number, view details with number+V
  - Auto-generated names based on differences from defaults
  - Shows available vs occupied slots when saving
- **Two-level UX flow:** Choose mode first → mode-specific menu with options (not one flat flow)
- **No auto-display of settings:** Press V anywhere to view current/default settings
- **Save options after customize:** Start / Save Preset / Save as Default (with confirmation) / View / Back
- **Session-complete popup:** Larger (500x300 equivalent), detailed stats, auto-dismiss after 60 seconds
- **Settings storage:** Structured as `{ defaultsP, defaultsM, defaultsB, P1..P5, M1..M5, B1..B5 }`

Also check: `output: 'export'` in next.config.ts (add if missing).

### Phase 2: Tauri wrapper + blocking popup + cowork
- Add Tauri to the project (`src-tauri/` folder alongside existing `src/`)
- Implement blocking native popup window (always-on-top second window)
- Switch settings storage from localStorage → Tauri file system API (AppData)
- Add Firebase Realtime Database for cowork session codes
- Test on Windows. Set up GitHub Actions for Mac builds.

### Phase 3: Optional accounts (if there's traction)
- Firebase Auth: optional "Create account" button
- On account creation: migrate local settings to Firestore
- Settings sync across devices for logged-in users
- Does NOT gate any features — everything works without an account

---

## Tech Stack
- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Web Worker** for accurate background timing (`public/timer-worker.js`)
- **PWA** manifest + service worker (`public/sw.js`)
- **Tauri** (to be added in Phase 2) for native desktop wrapper
- **Firebase** (to be added in Phase 2) for cowork sessions; Phase 3 for auth

## Architecture
- Single-page app with 6 screens, navigated via React state (`src/components/App.tsx`)
- Core timing logic in `src/lib/schedule.ts` — computes a flat event array from settings
- `public/timer-worker.js` — Web Worker ticks every second, immune to background tab throttling
- `public/sw.js` — Service worker for offline caching
- `src/components/NotificationOverlay.tsx` — In-app popup with dismiss countdown (Phase 1)
- Phase 2: replace/supplement with native Tauri window popup

## Source Files
```
src/
  app/
    layout.tsx, page.tsx, globals.css, favicon.ico
  components/
    App.tsx                    ← main state machine, screen routing
    NotificationOverlay.tsx    ← in-app popup (to be replaced/supplemented by Tauri window)
    screens/
      ModeSelect.tsx, DefaultsReview.tsx, Customize.tsx
      Summary.tsx, Timer.tsx, SessionComplete.tsx
    ui/
      Button.tsx, Card.tsx, NumberInput.tsx
      ProgressRing.tsx, StepIndicator.tsx, ToggleSwitch.tsx
  lib/
    types.ts       ← data types (needs update for mode-specific settings)
    defaults.ts    ← default values (needs update for defaultsP/M/B)
    schedule.ts    ← timing event computation
    storage.ts     ← settings persistence (needs update for mode-prefixed presets)
    validation.ts  ← input validation (needs M-mode divisibility check)
    format.ts      ← display formatting
    sound.ts       ← Web Audio API chime
    registerSW.ts  ← PWA service worker registration
public/
  timer-worker.js, sw.js, manifest.json, icons/
```

## Terminology
- "Sets" not "rounds"
- "Sessions" not "pomodoros" in user-facing text (okay in parenthetical explanations)
- "Prompts" not "reminders"
- "Break" not "short break"

## Important Gotchas
- **React strict mode (dev only):** Double-mounts components. Timer uses `startTimeRef` to preserve start time across re-mounts. Don't use `initializedRef` guards — they prevent worker re-creation after cleanup.
- **JavaScript falsy 0:** Use `settings.dismissSeconds` not `settings.dismissSeconds || 5` — `||` converts valid `0` to `5`.
- **Web apps can't force windows to front:** This is WHY we need Tauri. Do not try to solve this with browser APIs.
- **Audio autoplay:** AudioContext must be initialized from a user gesture (e.g., "Begin Session" click).
- **Static export:** `output: 'export'` in next.config.ts — required for Tauri compatibility. No API routes, no server components that fetch data.
- **localStorage vs AppData:** Use localStorage during web-only dev phase. Switch to Tauri file API in Phase 2. Design storage code to make this swap easy.

---

## Session History

### Session 1 — 2026-02-13
- Created new Next.js project from scratch
- Built all 6 screens with redesigned 3-mode flow
- Built timer engine with Web Worker for background accuracy
- Built notification overlay with dismiss countdown
- Set up PWA manifest and service worker
- Sound via Web Audio API (two-tone chime, no external file)
- Browser notifications fire on every event
- Generated PWA icons (192x192, 512x512, apple-touch-icon, favicon) using sharp
- Production build tested successfully on port 3001
- Committed and pushed to GitHub

### Session 2 — 2026-02-28 (planning only, no code written)
**What was done:**
- Reviewed current state of both projects (batch file and web app)
- Confirmed Tauri (not Electron) as the wrapper approach
- Confirmed three-phase build plan (update web app → Tauri wrapper + cowork → optional accounts)
- Clarified settings persistence strategy (local AppData file, not localStorage)
- Clarified cowork approach (Firebase room codes, no user accounts needed)
- Clarified that Phase 3 accounts are optional sync-only, not full SaaS, ~1-2 sessions of work
- Confirmed static export requirement for Tauri compatibility

**Current state:**
- Web app code unchanged from Session 1
- All decisions documented above, ready to start Phase 1 coding
- `output: 'export'` not yet confirmed in next.config.ts — check this first

**Next steps for AI (start here next session):**
1. Read `C:\Users\wmben\Coding\Mindfulness_Prompt_Bat\MindfulnessPrompter.bat` — understand all Session 3 features in detail before touching any web app code
2. Check `next.config.ts` — add `output: 'export'` if not present
3. Update `src/lib/types.ts` — add mode-specific types (AppMode, ModeSettings, SettingsFile with defaultsP/M/B and mode-prefixed preset keys)
4. Update `src/lib/defaults.ts` — separate defaults for each mode with correct values
5. Update `src/lib/validation.ts` — add M-mode divisibility check (interval must divide evenly into 60)
6. Update `src/lib/storage.ts` — new settings file structure, preset save/load with mode prefix
7. Update `src/components/screens/DefaultsReview.tsx` and `Customize.tsx` — mode-specific flows
8. Update `src/components/screens/SessionComplete.tsx` — larger popup, detailed stats, auto-dismiss
9. Test all three modes end-to-end before proceeding to Phase 2

### Session 8 — 2026-03-01 (bug fixes + Schedule Start Time feature)
**What was done:**
- **Bug fix — notification overlay:** Enter key now dismisses popup once countdown expires. OK button turns emerald green when dismissible (was white).
- **Bug fix — Change Settings defaults:** All fields (helper text + placeholders) now correctly reference the user's saved defaults instead of factory defaults. Fixed: work session, sessions per set, number of sets, dismiss delay, prompt interval (mindfulness), prompt count, and mindfulness prompt textarea. Removed now-unused `factory` variable and `getDefaults` import from Customize.tsx.
- **New feature — Schedule Start Time:** Added a "Schedule Start Time" button on the mode page (DefaultsReview), Customize screen, and Settings Updated screen. Navigates to a new ScheduledStart screen (`src/components/screens/ScheduledStart.tsx`) that shows: a time picker, a live countdown in large green text, and a settings summary. Auto-starts the timer when countdown hits 0. "Start Now" starts immediately. Capped at 2 hours in the future. Useful for cowork sessions where everyone needs to sync to a fixed clock time.

**Current state:**
- All changes committed and pushed. Build passes cleanly.
- Tested by user — all features working.

**Next steps for AI (start here next session):**
1. **FIRST: Service worker cache** — DevTools → Application → Service Workers → Unregister → Ctrl+Shift+R
2. **Phase 2: Tauri wrapper** — see SHARED.md Phase 2 section for full plan.

**Open questions:**
- None carried forward.

---

### Session 7 — 2026-03-01 (UX polish: icons, keyboard, button color, textarea)
**What was done:**
- Replaced hand-drawn SVG icons on landing page with real photos (`public/images/gong.png`, `public/images/tomato.png`). "Both Together" card shows gong + "+" + tomato at smaller scale.
- Changed primary Button color from indigo to emerald green — now visually distinct from the indigo YesNo toggles (selected-state indicator) so it's clear which button Enter will activate.
- Added Enter key shortcut to DefaultsReview (triggers Start Session) and Customize (triggers Review Changes or No-changes Start Session). Guarded so Enter inside any input/textarea/select/button does NOT trigger the shortcut.
- Fixed mindfulness prompt textarea: was pre-filled with the default text; now starts empty and shows the default as grayed-out placeholder text, consistent with all other fields.

**Current state:**
- All changes committed. Build not verified this session — run `npm run build` to confirm.
- No regression testing done. Needs full end-to-end test of all three modes.

**Next steps for AI (start here next session):**
1. **FIRST: Service worker cache** — DevTools → Application → Service Workers → Unregister → Ctrl+Shift+R
2. **Test all three modes** end-to-end:
   - Mindfulness: prompt count 0 (indefinite) and N; interval validation (must divide 60)
   - Pomodoro: single set, multiple sets, unlimited sets (numberOfSets=0)
   - Both Together: interval must fit evenly into work session
   - Presets: save, load, rename, delete
   - Reset to original defaults: confirmation, reverts correctly
   - Settings Updated flow: Save as Preset / Save as Default / Start Session
   - "No changes made — Start Session": verify skips review page
   - Enter key: test on mode page and settings page, verify it doesn't fire inside text fields
3. Fix any bugs found.
4. **After all tests pass → Phase 2**: Tauri wrapper + blocking native popup + cowork via Firebase

**Open questions:**
- None carried forward.

---

### Session 6 — 2026-03-01 (UI/UX overhaul, Phase 1 still in progress)
**What was done:**
- Redesigned landing page (ModeSelect.tsx):
  - New two-line tagline with hoverable tooltip links (Pomodoro Technique, Nudge theory)
  - "Choose your mode:" heading replaces old question
  - Updated mode descriptions to be clearer and more specific
  - Replaced emoji icons with custom SVG icons (gong, tomato timer, combined)
  - NOTE: User was dissatisfied with SVG icon quality — needs redoing (see Next Steps)
- Major UX flow refactoring (all screens):
  - Deleted "Ready to Start" (Summary) review screen — "Start Session" goes directly to timer
  - Mode page (DefaultsReview): mode name in indigo + gray "Mode" suffix; "Start Session" + "Change Settings" buttons; removed "Edit defaults" and "Reset to factory defaults" links
  - "Change Settings" (Customize): converted from 5-step paginated wizard to single scrollable page with consistent formatting; "Reset to original defaults" button at top (grayed out with tooltip if already on originals, confirmation dialog if active); dynamic bottom button ("No changes made — Start Session" vs "Review Changes")
  - New "Settings Updated" page (Summary.tsx): shows mode name + "Mode Settings Updated" title, full settings summary, then "Save as a Preset" / "Save as Default" (with confirmation) / "Start Session (use new settings for this session only)"
  - Updated App.tsx navigation to wire the new flow
  - Renamed all "factory defaults" → "original defaults" throughout
  - Removed the now-unused Summary ("Ready to Start") page concept; repurposed file

**Current state:**
- Build should pass (not verified this session — do `npm run build` to confirm)
- All UX changes are uncommitted as of session end — commit is happening now
- SVG icons are placeholder quality and need proper redoing next session
- No regression testing has been done on the new flow

**Next steps for AI (start here next session):**
1. **FIRST: Service worker cache** — before testing ANYTHING, open DevTools → Application → Service Workers → Unregister → Ctrl+Shift+R
2. **Fix SVG icons** — user was dissatisfied. Options to consider:
   - Use an established icon library (Lucide React, Heroicons) — cleaner, consistent, maintained
   - Or redesign the custom SVGs with better proportions and details
   - Gong: large disc on a goalpost frame with mallet beside it
   - Tomato: round body + stem/leaves + clock face (4 ticks + 2 hands)
   - Both: gong + "+" + tomato at reduced scale, same height as singles
3. **Keyboard accessibility** — pressing Enter on a focused button should activate it. The Card component has a basic keyDown handler; verify all interactive elements (buttons, card options) respond correctly to Enter and Space. Check especially the mode cards on the landing page and the Yes/No toggles in Change Settings.
4. **Testing** — test all three modes end-to-end:
   - Mindfulness: prompt count 0 (indefinite) and N (stops after N prompts); interval validation (must divide 60)
   - Pomodoro: single set, multiple sets, unlimited sets (numberOfSets=0)
   - Both Together: interval must fit evenly into work session
   - Presets: save, load, rename, delete
   - Reset to original defaults: confirmation, reverts correctly, returns to mode page
   - Settings Updated flow: Save as Preset → slot picker → saves; Save as Default → confirmation → updates mode page; Start Session → goes directly to timer
   - "No changes made — Start Session" button: verify it actually skips the review page
5. **Bug fixes** — fix whatever testing reveals
6. **After all tests pass → Phase 2**: Tauri wrapper + blocking native popup + cowork via Firebase

**Open questions:**
- Should we use a React icon library (Lucide, Heroicons) instead of hand-drawing SVGs? Would save time and look more professional.

---

### Session 3 — 2026-02-28 (Phase 1 coding complete)
**What was done:**
- Read batch file (Session 3 rewrite) in full — understood all features
- Added `output: 'export'` to `next.config.ts` (required for Tauri)
- Updated `src/lib/types.ts` — added `PresetSlot`, `Preset`, `SettingsFile`, `SessionStats` types
- Rewrote `src/lib/storage.ts` — full `SettingsFile` structure (`defaultsP/M/B` + 15 preset slots); new key `mindful-prompter-v2`
- Updated `src/lib/defaults.ts` — added `generatePresetName()` (auto-names presets from differences vs defaults)
- Updated `src/components/screens/DefaultsReview.tsx` — loads saved mode defaults; "Load preset" (inline list) and "Edit defaults for this mode" buttons
- Updated `src/components/screens/Customize.tsx` — after last step shows Save Options: Start / Save as Preset / Save as Default; fixed missing M-mode divisibility check
- Updated `src/components/App.tsx` — wired new callbacks; merges saved defaults with factory defaults on mode select
- Updated `src/components/screens/Timer.tsx` — tracks sessions/sets/prompts via refs; passes `SessionStats` to completion callbacks
- Updated `src/components/screens/SessionComplete.tsx` — detailed stats display; 60-second auto-dismiss countdown
- Production build passes cleanly

**Current state:**
- All Phase 1 features implemented and building
- Preset management is Save + Load only (no rename/delete — deferred)
- M mode unlimited (no prompt count limit) — matches current `schedule.ts`
- Old `mindful-prompter-settings` localStorage key is abandoned (no migration needed for dev)
- **Needs browser testing before Phase 2**

**Next steps:**
1. Test all three modes in browser — especially:
   - Preset save/load round-trip
   - M-mode divisibility validation
   - Session stats on completion screen
   - 60s auto-dismiss
2. Fix any bugs found
3. When tests pass → Phase 2 (Tauri wrapper)
