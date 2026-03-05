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

### Anonymous Install IDs (Phase 2, built into Firebase backend)
- On first launch, generate a UUID and store it locally (Tauri AppData)
- When connecting to Firebase for cowork, this UUID is sent automatically — no login required
- Gives from day 1: unique install count, cowork usage frequency, retention data
- GDPR-friendly — no personal data, disclose in privacy policy
- This is the foundation for traction data before spending on code signing or app stores
- **Design the Firebase data model to be account-aware** even though accounts come later

### User Accounts: Phase 3, Only If There's Traction
- Phase 3 adds optional "Create account to sync across devices" using Firebase Auth + Firestore
- This is NOT full SaaS — no payments, no feature gating, just free account + settings sync
- Anonymous UUID links to the account on creation (no data loss)
- Free accounts do NOT require rewriting anything — Firebase Auth bolts on cleanly
- Cross-device sync via UUID alone is not possible (UUID is per-device) — accounts are the right solution
- **Do not build this until there's evidence people want it**

### Long-Term Goal: Accounts + Payment Tiers (Phase 4, post-traction only)
- If the app gets real users, add paid tiers (e.g., cowork for teams, advanced features)
- Payment processing via Stripe (webhooks, access control — significant work)
- This is NOT being designed now, but keep it in mind: **do not make architectural decisions that close this door**
- Firebase Auth + Firestore as the backend foundation makes this path straightforward when the time comes

### Cowork / Shared Sessions: Phase 2, No Accounts Needed
- Host clicks "Start shared session" → gets a 6-character room code
- Guests enter the code → join the session
- Everyone's app receives the same timer events in real-time via Firebase Realtime Database
- Sessions are ephemeral (nothing stored after session ends)
- Firebase free tier is sufficient for a growing app (100 simultaneous connections, 1GB data)
- **No user accounts needed for this feature**

### Distribution & Launch Strategy

**The code signing problem:**
Without code signing, Windows shows a "Windows protected your PC" SmartScreen block and Mac shows "unidentified developer" — most normal users will not proceed. Code signing costs money:
- Windows: ~$300–500/year for an OV certificate, OR use the Microsoft Store (free cert, review process)
- Mac: Apple Developer Program, $99/year — required to sign and notarize

**How to get traction without spending first:**
1. **Share with tech-adjacent people** — friends, communities (Reddit, Discord, Product Hunt). They know how to bypass the warning. Use this to validate the concept.
2. **Microsoft Store** — free submission, Microsoft's cert covers signing. Tradeoff: store policies + review process. Legitimate free path for Windows.
3. **Web version** — already works in browser, deployable to Vercel (free). Loses the forced popup (core value prop) but can validate the timer/mindfulness concept.
4. **UUID analytics from cowork** — shows real usage data without needing app store downloads.

**Cross-platform (Windows + Mac):**
- Tauri is cross-platform — same code, same features, both platforms
- You can only BUILD a Mac installer on a Mac or via GitHub Actions (Mac runner)
- You are on Windows — Mac builds require GitHub Actions CI/CD (already in plan for launch)
- Testing Mac requires a Mac or borrowing one — plan for this before public release
- **Do not block Windows launch waiting for Mac** — ship Windows first, Mac follows

**Distribution milestones:**
| Milestone | What's needed | Cost |
|-----------|--------------|------|
| You test the full app | `dev-tauri.bat` — already works | Free |
| Share with tech friends (unsigned) | Build unsigned installer | Free |
| General public (Windows) | Code signing cert OR Microsoft Store | $0–$500/yr |
| General public (Mac) | Apple Developer account + GitHub Actions | $99/yr |

---

## Build Plan (4 Phases)

### Phase 1: Update web app to match batch file — COMPLETE ✅ (Sessions 1–21)

### Phase 2: Tauri wrapper + blocking popup + cowork — IN PROGRESS (Sessions 9–22)
- ✅ Tauri wrapper installed and working
- ✅ Blocking native popup window (always-on-top)
- ✅ Window icon set
- ☐ Settings storage: localStorage → Tauri file system API (AppData) — **NEXT**
- ☐ Firebase backend: cowork room codes + anonymous UUID install tracking
- ☐ Test on Windows. Set up GitHub Actions for Mac builds.
- **Firebase data model must be designed with future accounts in mind (Phase 3)**

### Phase 3: Optional accounts (free, only if there's traction)
- Firebase Auth: optional "Create account" button
- On account creation: migrate local UUID + settings to Firestore
- Settings sync across devices for logged-in users
- Does NOT gate any features — everything works without an account
- Only build this if traction data (UUID analytics) shows real usage

### Phase 4: Paid tiers (long-term, only if Phase 3 succeeds)
- Stripe integration for payment processing
- Access tiers (e.g., team cowork, advanced features)
- This is the commercial endgame if the app gets real users
- Not being designed now — but Firebase/Firestore foundation keeps this path open

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
- **React setState-in-render:** Never call a parent state setter inside a child's `setState` updater function. Call it in a `useEffect` or event handler instead.
- **JavaScript falsy 0:** Use `settings.dismissSeconds` not `settings.dismissSeconds || 5` — `||` converts valid `0` to `5`.
- **Web apps can't force windows to front:** This is WHY we need Tauri. Do not try to solve this with browser APIs.
- **Audio autoplay:** AudioContext must be initialized from a user gesture (e.g., "Begin Session" click).
- **Static export:** `output: 'export'` in next.config.ts — required for Tauri compatibility. No API routes, no server components that fetch data.
- **localStorage vs AppData:** Use localStorage during web-only dev phase. Switch to Tauri file API in Phase 2. Design storage code to make this swap easy. Current localStorage key: `mindful-prompter-v2`.
- **CRITICAL — Tauri async commands:** Any command that creates or closes a `WebviewWindow` MUST be `async fn`. Synchronous commands deadlock WebView2 on Windows (wry #583).
- **CRITICAL — isTauri() guards:** Any `@tauri-apps/api` call in a page that can also load in a browser MUST be guarded with `isTauri()`. WebView2 treats unhandled promise rejections as fatal (unlike Chrome), blanking the page. Use `import { isTauri } from '@/lib/tauri'`.

### Tauri Key Files
- `src-tauri/src/lib.rs` — `show_notification` (async), `get_notification_data`, `close_notification_window` (async)
- `src-tauri/capabilities/default.json` — windows allowlist: `["main", "notification", "notification-overlay-*"]`
- `src/app/popup/page.tsx` — popup UI: dark fullscreen bg, centered white card, handles overlay mode
- `src/lib/tauri.ts` — `isTauri()`, `showNotificationWindow()`, `onNotificationDismissed()`
- `src/components/screens/Timer.tsx` — calls Tauri or overlay depending on environment

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

### Session 9 — 2026-03-01 (Tauri wrapper — popup blocked)
**What was done:**
- Installed Rust, MSVC build tools (Visual Studio 2022 Desktop C++ workload), Tauri CLI
- Added `src-tauri/` folder to the project (Tauri scaffold)
- Created `src-tauri/src/lib.rs` — Rust backend with two commands:
  - `show_notification`: stores popup data in managed state, closes existing popup window, opens new native window always-on-top
  - `get_notification_data`: returns the stored popup data so the popup page can fetch it
- Created `src/app/popup/page.tsx` — the native popup UI (gradient card, prompt text, countdown, dismiss button)
- Created `src/lib/tauri.ts` — bridge utility: `isTauri()`, `showNotificationWindow()`, `onNotificationDismissed()`
- Modified `src/components/screens/Timer.tsx` — calls `showNotificationWindow()` in Tauri, `setShowOverlay()` in browser
- Updated `src-tauri/capabilities/default.json` to include "notification" window
- Set app identifier to `com.locusscienceapps.mindfulprompter`
- Added `url = "2"` to Cargo.toml, `@tauri-apps/api` to package.json
- Set up PowerShell profile to add cargo to PATH permanently
- Fixed Rust borrow error: clone strings before storing in state so originals are available for URL params

**Debugging history (blank popup window):**
1. First attempt: `WebviewUrl::App("popup/index.html")` — only works for static builds, not dev server
2. Second attempt: `WebviewUrl::External("http://localhost:3000/popup")` — page loads but blank
3. Third attempt: pass data via URL query params so popup doesn't depend on IPC to display content
   - Rust builds URL: `http://localhost:3000/popup?eventType=...&title=...&promptText=...`
   - Popup reads `window.location.search` in `useEffect`
   - This compiled successfully but **was not tested** before user went to sleep

**Current state:**
- Main Tauri window: working
- Popup window: opens, but shows blank white — latest fix (URL params) compiled, not yet tested
- **COMMITTED** — partial progress; popup still shows blank white

**Next steps for AI (start here next session):**
1. Launch app: `export PATH="$PATH:/c/Users/wmben/.cargo/bin" && npm run tauri dev`
2. Test the popup — the URL params fix is compiled and waiting. Trigger a notification.
3. If still blank: open `http://localhost:3000/popup?eventType=mindfulness&title=Test&body=&promptText=Take%20a%20breath&dismissSeconds=5` directly in a browser to determine if issue is Tauri-specific or Next.js-specific
4. Once popup shows content: test OK dismiss, session-stopped auto-close, session_complete transition
5. Commit everything once popup is fully working

**Open questions:**
- Does Tauri inject its IPC bridge into dynamically-created windows with `WebviewUrl::External`? (The URL params approach sidesteps this for data display, but dismiss/events still need IPC)

---

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

---

### Session 22 — 2026-03-05 (wmben PC — Tauri icon fix)

**What was done:**

**Tauri window icon:**
- In Tauri v2, window icon cannot be set in `tauri.conf.json` — must be done in Rust
- Added `image` crate (`v0.25`, PNG-only) to `Cargo.toml`
- In `lib.rs` `setup()`: decode `icons/icon.png` → RGBA bytes → `tauri::image::Image::new_owned()` → `main_window.set_icon()`
- Taskbar icon (embedded in `.exe`) was correct already — Windows had cached the old Tauri icon; cleared with `ie4uinit.exe -show` after restart
- Tauri layout, images, and title in native window verified ✅ — Phase 2 Tauri verification DONE

**Current state:**
- All changes committed and pushed
- Phase 2 Tauri verification complete
- Remaining Phase 2: settings storage + cowork

**Next steps:**
1. Settings storage: switch from `localStorage` → Tauri file system API (AppData)
   - Key: `mindful-prompter-v2` in `localStorage` → JSON file in AppData
   - Provide Export/Import buttons for backup to Dropbox etc.
   - Must keep `localStorage` path working for browser dev/testing
2. Cowork feature: Firebase Realtime Database for shared session codes
   - Host generates 6-char room code; guests enter it
   - Everyone receives same timer events in real-time
   - Sessions ephemeral (nothing stored after session ends)

---

### Session 21 — 2026-03-05 (wmben PC — bug fixes + landing page redesign + logo)

**What was done:**

**NumericInput regression fix (`Customize.tsx`):**
- Session 20 introduced a bug: changed minimum validation from `parsed > 0` to `parsed >= 0.5` as a side-effect of adding `minValue` prop support. This silently rejected values like 0.1, 0.2, 0.25 for all non-integer fields (work period, break, prompt frequency), reverting them to the default.
- Fixed: default fallback changed from `0.5` to `0.01` in both `atLeast` and `effectiveMin`. Restores pre-Session-20 behavior (any positive value accepted) while keeping `minValue={0}` override for dismiss delay.

**App max-width increased (`App.tsx`):**
- Changed `max-w-lg` (512px) to `max-w-2xl` (672px) — prevents awkward text wrapping on desktop-sized windows.

**Landing page text updates (`ModeSelect.tsx` + throughout app):**
- "Pomodoro Timer" → "Timed Work Sessions" (ModeSelect, Summary, DefaultsReview, ScheduledStart)
- "Customizable work periods and breaks" → "Pomodoro-style work periods and breaks" (ModeSelect only)
- "Mindfulness Prompts in Work Sessions" → "Combo Mode: Mindfulness Prompts Embedded in Work Sessions" (all four files; "Both Together" in ScheduledStart also updated)
- Combo mode subtitle deleted (title is self-explanatory)
- Removed " Mode" suffix from ALL page headings app-wide (DefaultsReview, ScheduledStart, Summary ×2)
- "X Mode Settings Updated" → "X Settings Updated"; "Here are your updated X Mode settings:" → "Here are your updated X settings:"

**Landing page image updates (`ModeSelect.tsx`):**
- Gong replaced with meditation bowl (`bowl.png`, same `h-20` size as tomato)
- Combo icon (gong + "+" + tomato) replaced with logo (`logo.png`, `h-20`, single image)
- Logo added above "MindfulPrompter" title on landing page (`h-16`)

**Browser favicon (`src/app/icon.png`):**
- `logo.png` copied to `src/app/icon.png` — Next.js App Router picks this up automatically as the browser tab icon.

**Current state:**
- All changes committed and pushed
- All three modes tested and working

**Next steps:**
1. Test in Tauri (`dev-tauri.bat`) — verify layout, images, and title changes in native window
2. Remaining Phase 2: settings storage → Tauri file API; cowork via Firebase

---

### Session 20 — 2026-03-05 (wmben PC — Items 4/5/6 bug fixes + summary screen redesign)

**What was done:**

**Time display overhaul** — replaced `formatDuration` (minutes-based, rounded) with new `formatSummaryTime(seconds)` across all summary displays. Format: `"X sec"` / `"Y min, Z sec"` (omits ", 0 sec") / `"Z hrs, Y min"`. Countdown timers keep existing M:SS format. `formatDuration` kept as deprecated wrapper.

**M-mode finite prompt bug** — session_complete was firing 2 sec AFTER the Nth prompt (separate popup). Fixed: session_complete IS now the Nth prompt (N-1 regular mindfulness events + session_complete at N × interval). Prompt counter now reads "Prompt N of N" on the final popup.

**Stats fixes (Timer.tsx):**
- Added `canonicalEndSecondsRef` — canonical end time = `event.offsetSeconds` (NOT + dismiss delay). This makes the summary screen total match the popup body.
- M-mode session_complete now increments `prompts` counter (final prompt counts).
- `buildStats()` uses canonical end time; falls back to `elapsedRef.current` if not set.

**Batch file fix (`dev-tauri.bat`, `dev-browser.bat`)** — previously only killed port 3000 process, leaving orphaned cmd windows and `MindfulPrompter.exe` running. Now kills by window title AND exe name before starting fresh. No instance accumulation.

**Summary screen redesign (`SessionComplete.tsx`):**
- Removed 60-second auto-close countdown (all modes — stays open until user closes)
- Removed mindfulness prompt box (session is over; no need to re-show it)
- Pomodoro/both mode: new dynamic natural-language summary replacing label:value rows:
  - Heading: "Congratulations! You've just completed a **N-set** work session!" (or no set count if 1 set)
  - Multi-set: each set's period/break structure → set total → session structure → session total
  - Single set, multi-period: period/break structure → session total
  - Single period: one-line description
  - Bold (strong) = counts, italic (em) = durations → clear visual separation of adjacent numbers
- Mindfulness mode: unchanged (Great Work! heading + prompts + total time rows)
- "Total elapsed" renamed to "Total time" (better English)
- "Prompts completed" removed from Both mode (mindfulness-only concept)

**Session-complete popup body simplified (`schedule.ts`):**
- Was: `"2 sets × 2 periods × 0.4 min = 2 min, 12 sec"` (formula omitted breaks, math was wrong)
- Now: `"Total session time: 2 min, 12 sec"` (honest, matches summary screen total)

**dismissSeconds = 0 fix (`Customize.tsx`):**
- Added `minValue` prop to `NumericInput` (separate from `allowZero` which is for ∞ display)
- Dismiss delay field now accepts 0 (immediate dismiss) — previously `parsed > 0` validation silently rejected 0

**Known issue — stale stats when switching settings:** Summary screen occasionally shows stats from a previous session. Code analysis shows the data flow is correct; likely a React Fast Refresh (HMR) artifact triggered when saving code files during dev testing. Not reproducible in a clean run. Will not occur in production build.

**Current state:**
- All changes committed (7 commits this session)
- TypeScript clean
- All modes tested in browser — working
- Items 4, 5, 6 fully done and debugged

**Next steps:**
1. Push to GitHub
2. Test in Tauri (`dev-tauri.bat`) — verify summary screen and popup body changes work in native popup
3. Remaining Phase 2: settings storage → Tauri file API; cowork via Firebase

---

### Session 19 — 2026-03-04 (wmben PC — Items 4, 5, 6)

**What was done:**

**Item 4 — Mindfulness scope (Both mode)**
- New `MindfulnessScope` type (`'work-only' | 'breaks' | 'work-starts' | 'all'`)
- New `bothMindfulnessScope` setting (default: `'work-only'`)
- Previously: every popup in Both mode showed the mindfulness prompt
- Now: prompt only fires where the scope setting says it should
- schedule.ts: selective `promptText` assignment per event type based on scope
- Customize.tsx: 4-option selector in Mindfulness section (Both mode only)
- DefaultsReview + Summary: "Mindfulness shows" row added to settings table
- defaults.ts: `bothMindfulnessScope: 'work-only'` added to Both mode defaults + preset name diff

**Item 5 — Remove all popup labels, update title strings**
- Deleted all `popupLabel*` fields from Settings, `popupLabel` from TimerEvent
- Deleted: `resolveLabel()` in schedule.ts, "Popup Labels" section in Customize.tsx, label blocks in DefaultsReview/Summary/NotificationOverlay, label rendering in popup/page.tsx, `popup_label` param in lib.rs/tauri.ts
- Updated title strings in schedule.ts:
  - Long break: "Set complete! Long break starting."
  - Work start after short break: "Break over. Back to Work!"
  - Work start after long break: "Long break over. Time to start the next set!"
  - Session complete: "Session Complete! Great Work!"
- Removed "Break over! " prefix from work_start body (it's in the title now)
- M-mode session_complete: shows prompt text + uses `dismissSeconds` (it IS a mindfulness moment)
- P-mode + Both-mode session_complete: `dismissSeconds: 0` (immediately dismissible); Both shows prompt only if scope includes breaks

**Item 6 — Prompt counter in M-mode popup**
- `promptCountTotal?: number` added to `TimerEvent`
- schedule.ts: set on all M-mode mindfulness events (undefined if indefinite)
- lib.rs: `prompt_count_total: Option<u32>` + `session_number: u32` added to NotificationData and URL params
- tauri.ts: `popupLabel` removed; `sessionNumber` + `promptCountTotal` added
- Timer.tsx: updated `showNotificationWindow` call signature
- popup/page.tsx: renders "Prompt X of Y" (finite) or "Prompt X" (indefinite) below prompt text, M-mode mindfulness events only

**Current state:**
- TypeScript clean, build passes
- NOT TESTED — committed at end of session, needs testing next time

**Next steps for AI (start here next session):**
1. **Test Items 4, 5, 6** — run `dev-browser.bat`, then:

   **Item 4 — Mindfulness scope:**
   - Both mode → Customize → Mindfulness section: verify 4 scope options appear
   - "At work intervals only" (default): prompt only fires at mid-work intervals — NOT on break or work-start popups
   - "Intervals + at each break": prompt also appears on short break, long break, and session complete
   - "Intervals + returning from breaks": prompt appears on "back to work" popup
   - "All popups": all of the above
   - DefaultsReview shows "Mindfulness shows" row; Summary shows it after saving

   **Item 5 — No labels, new titles:**
   - All modes: verify NO label text appears in any popup (no "Mindfulness Prompt", "Short Break", etc.)
   - Trigger long break: title = "Set complete! Long break starting."
   - Return from short break: title = "Break over. Back to Work!" — body should NOT start with "Break over! "
   - Return from long break: title = "Long break over. Time to start the next set!"
   - Session complete: title = "Session Complete! Great Work!"
   - M-mode session complete: prompt text appears + must wait dismissSeconds before OK
   - P-mode session complete: OK button is immediately clickable (no wait)
   - Both mode session complete with scope "work-only": no prompt, immediately dismissible
   - Both mode session complete with scope "breaks" or "all": prompt appears + must wait

   **Item 6 — Prompt counter:**
   - M-mode, finite count (e.g., 3 prompts): popup shows "Prompt 1 of 3", "Prompt 2 of 3", "Prompt 3 of 3"
   - M-mode, indefinite (promptCount=0): popup shows "Prompt 1", "Prompt 2", etc.
   - Both mode: no counter shown in any popup
   - Pomodoro mode: no counter shown

   **Also test in Tauri** (`dev-tauri.bat`): same checks for the native popup window

2. Fix any bugs found
3. After all tests pass: proceed to remaining Phase 2 (settings storage → Tauri file API)

**Open questions:**
- None carried forward.

---

### Session 18 — 2026-03-04 (wmben PC — settings bug fixes in Customize.tsx)

**What was done:**

**Settings bug fixes** (`Customize.tsx`) ✅ TESTED by user — all working

Root cause: `Customize.tsx` was using `initial` (the loaded settings/preset) for all "Default: X" helper text and `NumericInput.defaultValue`. When a preset is loaded, `initial` IS the preset — not the mode defaults — so helpers showed preset values as if they were defaults.

Fix: added `modeDefaults = { ...getDefaults(mode), ...getDefaultsForMode(mode) }` and replaced all affected `initial.X` references with `modeDefaults.X`.

Specific fixes:
- "Work period length" helper: was showing preset value (e.g. 0.5 min) as Default; now shows 25 min ✓
- "Work period length" NumericInput: preset value now shows as BLACK text (not gray placeholder) ✓
- "Work periods per set" helper and defaultValue: same fix (was showing preset value as Default) ✓
- "Dismiss delay" helper and defaultValue: was showing preset value (e.g. 5s) as Default; now shows 15s ✓
- "Prompt frequency" (M-mode) helper and defaultValue: same fix ✓
- "Number of prompts" helper and defaultValue: same fix ✓
- Mindfulness prompt textarea: `placeholder` and `|| fallback` now use `modeDefaults.promptText` (factory default "Are you doing..."); clearing the textarea now correctly shows the factory default prompt as gray hint, not the preset text ✓
- `NumericInput` ∞ display: when `allowZero=true` and `value=0` but `defaultValue≠0` (preset chose ∞ over a real default), now shows solid black ∞ rather than gray placeholder ∞. Achieved by using `type="text"` for allowZero inputs and initializing `rawInput='∞'` in that case.

**Current state:**
- All changes committed
- TypeScript clean
- Tested by user — all working

**Next steps:**
1. Continue with Items 4, 5, 6 in order (see TODO.md)

---

### Session 17 — 2026-03-04 (wmben PC — UX polish: mode rename, preset indicator, post-save layout, home button)

**What was done:**

**(A) "Both Together" mode renamed to "Mindfulness Prompts in Work Sessions"** (`ModeSelect.tsx`, `DefaultsReview.tsx`, `Summary.tsx`)
- Updated `MODE_NAMES` and `modes` array across all three files
- Heading now reads: **Mindfulness Prompts in Work Sessions** Mode

**(B) Preset-selected indicator** (`DefaultsReview.tsx`)
- Added `selectedPreset` state; set when user clicks a preset in the list
- Shows "Preset selected: B3 — Name" in small indigo text below "Current settings"
- Updates if user clicks a different preset

**(C) Summary post-save view redesigned to match DefaultsReview layout** (`Summary.tsx`, `App.tsx`)
- After saving a preset, Summary now renders: mode name header → "Current settings" subtitle → preset indicator → settings table → full preset list (with rename/delete/load) → 3 buttons (Start Session, Schedule Start Time, Change Settings)
- Added `onCustomize` and `onLoadPreset` props to `SettingsUpdatedProps`; wired in `App.tsx`
- "← Back to settings" link added to post-save view (goes back to Customize via `onBack`)
- Post-save preset list is fully interactive: click to load, rename, delete
- "Save as Preset" and "Save as Default" buttons only appear in the pre-save main view

**(D) Persistent home button** (`App.tsx`)
- Small "⌂ MindfulPrompter" link at top of content area
- Shown on all screens except mode-select and timer (timer excluded to avoid accidental session abandonment)
- Gray text, turns indigo on hover; clicking navigates to mode-select

**Current state:**
- All changes committed and pushed
- TypeScript clean

**Next steps:**
1. Test Session 17 changes in browser (`dev-browser.bat`)
2. Continue with Items 4, 5, 6 in order

---

### Session 16 — 2026-03-04 (wmben PC — Phase 0 testing + Items 1, 2, 3, 3b coded + bug fixes)

**What was done:**
- Phase 0 testing passed (browser + Tauri) — all Sessions 10–14 features verified working
- Implemented Items 1, 2, 3, and 3b from the Session 15 plan
- Tested Item 3b in Both Together mode; found and fixed 7 UX bugs

**Item 1 — Helper text standardization** (`Customize.tsx`) ✅ TESTED
**Item 2 — Preset name pre-filled** (`Summary.tsx`) ✅ TESTED
**Item 3 — True popup blocking** (`lib.rs`, `popup/page.tsx`, `capabilities/default.json`) ✅ TESTED

**Item 3b — Hard break option** (`types.ts`, `defaults.ts`, `schedule.ts`, `Customize.tsx`, `Timer.tsx`, `NotificationOverlay.tsx`, `popup/page.tsx`, `lib.rs`, `tauri.ts`)
- `hardBreak?: boolean` in Settings; `dismissSeconds?` + `autoClose?` on TimerEvent
- Break events get `dismissSeconds: breakSec/longBreakSec, autoClose: true` when `s.hardBreak === true`
- "Lock screen during breaks" toggle in Customize with amber confirmation dialog on enable
- Timer.tsx: uses `event.dismissSeconds ?? settings.dismissSeconds`; passes `event.autoClose`
- Browser overlay and Tauri popup both auto-dismiss after countdown hits 0
- `auto_close: bool` added to Rust `NotificationData` and URL params

**Bug fixes (same session, after Item 3b testing):**
1. **hardBreak display** (`Summary.tsx`, `DefaultsReview.tsx`): "Lock screen during breaks: Yes" now shown in settings summaries when enabled
2. **NumericInput values as gray placeholder** (`Customize.tsx`): NumericInput now initializes `rawInput` to `String(value)` when `value !== defaultValue` — previously always showed as gray placeholder even when a custom value was set; this broke the "back to settings" and "load preset" flows
3. **promptRaw initialization** (`Customize.tsx`): textarea now initializes to `initial.promptText` (black text) instead of `''` (gray placeholder)
4. **Preset saved → hide save buttons** (`Summary.tsx`): "Save as Preset" and "Save as Default" buttons now hide once a preset has been saved in the current session
5. **Preset name 3-diff limit** (`defaults.ts`): intentional — auto-name shows first 3 differences only to keep names readable
6. **Always-visible presets** (`DefaultsReview.tsx`): saved presets now always shown inline on the mode landing page — no "Load Preset" tap needed; removed `showPresets` toggle and "Load Preset" button
7. **Periods per set display** (`DefaultsReview.tsx`): now shows "∞ (unlimited)" when `sessionsPerSet === 0`, matching Summary.tsx

**Current state:**
- Items 1–3b + 7 bug fixes committed and pushed
- Items 1 + 2 tested ✅, Items 3 + 3b partially tested ✅ — multi-monitor overlay untested
- TypeScript passes clean (`npx tsc --noEmit`)

**Next steps:**
1. Test the 7 bug fixes in browser (`dev-browser.bat`)
2. Continue with Items 4, 5, 6 in order
3. After Items 4–6: proceed to remaining Phase 2 (settings storage → Tauri file API)

---

### Session 15 — 2026-03-04 (wmben PC — planning session, no code written)

**What was done:**
- Pulled Session 14 commits from the other PC (benw00)
- Updated Claude memory files on this PC to reflect Sessions 14 changes
- Planned the next 6 features in detail — design finalized, no code written yet

**Planned features (Items 1–6) — implement in order after testing:**

**Item 1 — Helper text standardization** (`Customize.tsx`)
Three "run indefinitely" fields get consistent phrasing: `"Default: X. Enter 0 (= ∞) to run indefinitely."` (or `"Default: 0 (= ∞) to run indefinitely."` when default is already 0). Remove sub-notes below the promptCount field.

**Item 2 — Preset name pre-filled** (`Summary.tsx`)
Initialize `presetName` state to `autoName` instead of `''`. Remove helper text below name input. Keep placeholder for fallback when field is cleared.

**Item 3 — True popup blocking** (`lib.rs`, `popup/page.tsx`)
Make popup fullscreen on active monitor; create dark fullscreen overlay windows on all other monitors. All overlay windows close together. Popup card (480px) remains centered within the fullscreen background.

**Item 3b — Hard break option** (`types.ts`, `defaults.ts`, `schedule.ts`, `Customize.tsx`, `popup/page.tsx`)
New setting `hardBreak: boolean` (default false, P and B modes only). When enabled, break popup stays up for the FULL break duration — user cannot dismiss early. Enable confirmation: "Are you sure? You won't be able to use your computer until the break ends, even if you're in the middle of something important."

**Item 4 — Mindfulness scope (Both mode)** (`types.ts`, `defaults.ts`, `schedule.ts`, `Customize.tsx`)
New setting `bothMindfulnessScope: 'prompts-only' | 'breaks' | 'work-starts' | 'all'` (default: `'prompts-only'`). UI selector at bottom of Mindfulness section (Both mode only):
- A: prompts-only at intervals (default)
- B: + embedded in short_break, long_break, session_complete
- C: + embedded in non-first work_start events
- D: all

**Item 5 — Popup redesign** (`types.ts`, `schedule.ts`, `lib.rs`, `Customize.tsx`, `DefaultsReview.tsx`, `Summary.tsx`, `popup/page.tsx`)
- **Remove chip labels entirely** — delete all `popupLabel*` Settings fields, `resolveLabel()` from schedule.ts, label params from lib.rs, label rendering from popup/page.tsx, and the "Popup labels" subsection from DefaultsReview + Summary (Session 12/13 rollback)
- **Updated title strings:** long_break → "Set complete! Long break starting."; work_start after short break → "Break over. Back to Work!"; work_start after long break → "Long break over. Time to start the next set!"; session_complete → "Session Complete! Great Work!"
- **Body fix:** Remove redundant "Break over! " from start of work_start body text (it's now in the title)
- **M-mode session_complete:** Add `promptText: s.promptText` + `dismissSeconds: s.dismissSeconds` — the session_complete popup IS the final mindfulness moment in M-mode
- **P-mode session_complete:** `dismissSeconds: 0` — immediately closeable
- **Both-mode session_complete:** promptText only when scope is B or D (handled by Item 4)
- Detect work_start context: `period1 > 1` = after short break; `period1 === 1 && set1 > 1` = after long break

**Item 6 — Prompt counter in M-mode** (`types.ts`, `schedule.ts`, `lib.rs`, `popup/page.tsx`)
Add `promptCountTotal?: number` to `TimerEvent`. In M-mode mindfulness events, set `promptCountTotal: s.promptCount`. Popup renders "Prompt X of Y" (finite) or "Prompt X" (indefinite) below the prompt text. M-mode only — not shown in Both or P mode.

**Next steps for AI (start here next session):**
1. Test everything (see TODO.md checklist) — Sessions 10–14 are untested on this PC
2. After tests pass: implement Items 1–6 in order
3. After Items 1–6: proceed to remaining Phase 2 (settings storage → Tauri file API)

---

### ⚠️ DOCUMENTATION GAP — Sessions 10–13 (2026-03-02, other PC)

**Commits exist but were never documented in SHARED.md:**
- Session 10: Fix Tauri popup — async command + isTauri guards + redesigned UI
- Session 11: Blocking popup + popup replacement fix
- Session 11: (separate commit) Session notes saved as permissions only — no actual notes
- Session 12: Popup labels, ∞ fields, two-step preset save, overlay redesign
- Session 13: Popup labels on summary screens + ∞ for numberOfSets=0

**What is known from reading the code:**
- The Tauri native popup window is working (blank popup bug was fixed)
- Popup labels are customizable per event type (Work Period, Short Break, etc.)
- ∞ display works for unlimited periods and sets
- Two-step preset save was implemented
- NotificationOverlay was redesigned
- `dev-browser.bat` and `dev-tauri.bat` were created on that PC

**The other PC likely has session notes** (possibly in the AI's memory files or SHARED.md on that machine)
that were never pushed. When returning to that PC, check for unpushed notes and integrate them here.

**None of Sessions 10–13 code changes have been tested on this (new) PC.**

---

### Session 14 — 2026-03-03 (new PC setup + terminology + timer improvements)

**Context:** Working on a new PC (username: benw00). Previous PC username was wmben.
All Session 10–13 code was present but undocumented (see gap above).

**What was done:**

- **New PC fix:** `dev-tauri.bat` had hardcoded `C:\Users\wmben\.cargo\bin` — changed to `%USERPROFILE%\.cargo\bin` so it works on any PC
- **Batch file improvements:** Both `dev-browser.bat` and `dev-tauri.bat` now kill any process on port 3000 before starting, preventing the "port in use" error when switching between browser and Tauri modes. Both use `cmd /k` so the window stays open on errors.
- **Default sets fix:** When user toggles "Yes, multiple sets", the Number of Sets field now defaults to 3 (not 1). Previously showed "1" as placeholder even though 3 is the meaningful default.
- **Terminology overhaul — "session" → "period"** for the 25-minute work unit, across all user-facing text in 8 files:
  - `Customize.tsx`, `DefaultsReview.tsx`, `Summary.tsx`, `ModeSelect.tsx`, `ScheduledStart.tsx`, `SessionComplete.tsx`, `Timer.tsx`, `NotificationOverlay.tsx`, `popup/page.tsx`
  - Final hierarchy: **work period** (25 min) → **set** (N periods) → **session** (all sets, start to finish)
  - "Start Session", "Stop Session", "Session complete", "Session Done" deliberately kept — those refer to the whole thing
- **Period numbering fix:** Timer screen was showing global period count (e.g., "Period 7 of 12 total"). Now shows period within set (e.g., "Set 2, Period 3").
- **New timer screen detail line:** Below the countdown ring, shows *"out of 4 5-period sets"* with "5-period" in italics. Only appears for multiple defined sets. Single-set shows "Period 3 of 4" inside the ring. Unlimited shows just "Period 3".
- **Popup text rewrite** (schedule.ts):
  - Short break: title "Break!" + body "Set 2, Period 3 complete. Take a 5-minute break."
  - Long break: title "Break!" + body "Set 3 complete. Take a 15-minute break."
  - Back to work: title "Break over!" + body "Break over! Set 3, Period 2 starting (of 4 sets)"
  - Session complete: body "3 sets × 4 periods × 25 min = 5h"
  - Single-set and unlimited variants handled (omit set info / omit "of X" respectively)
- **Two new fields on TimerEvent** (`types.ts`): `totalSets` and `periodsPerSet` (0 = unlimited/not applicable)

**Current state:**
- All changes committed and pushed from this PC
- **NONE of this session's changes have been tested** — run `dev-browser.bat` and test all three modes
- Sessions 10–13 changes also untested on this PC

**Next steps for AI (start here next session):**
1. **If on the other PC first:** Check for any unpushed notes or memory files. Pull this session's changes. Integrate any notes from Sessions 10–13 into this SHARED.md.
2. **Testing priority** — run `dev-browser.bat`, then test:
   - Pomodoro mode: single set, multiple sets (check period numbering and detail line on timer screen)
   - Pomodoro mode: unlimited periods, unlimited sets (check that "of X" is omitted correctly)
   - Break popups: verify new title/body format
   - Back-to-work popups: verify "Break over! Set X, Period Y starting (of Z sets)"
   - Session complete: verify "N sets × M periods × W min = T" format
   - Mindfulness mode: verify no set/period info shown (not applicable)
   - Both Together mode: verify period numbering works alongside prompts
   - Preset save/load in all three modes
3. **Run `dev-tauri.bat`** and test the native popup window with the new text formats
4. Fix any bugs found
5. **After testing passes:** Update SHARED.md Phase 2 section status and proceed with any remaining Phase 2 work
