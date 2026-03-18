# Prosochai — Session History

Reverse chronological order (most recent first).

---

## Session 38 — 2026-03-18 (wmben PC — Redesign v2 Stage 1: unified always-editable view)

**What was done:**

**Stage 1 of three-stage redesign — unified main view (no more edit-lock toggle):**
- Removed `editMode` state, the Edit toggle card, the discard-changes confirm dialog, and the "Edit mode" banner
- `SettingsDisplay` (read-only summary cards) removed from Main screen — full editable form is always shown
- `p` (pending settings) is now unconditionally the displayed settings — no more `editMode ? pendingSettings : settings`
- Timing section always shows `WhenSection` (no more plain-text fallback)
- Sound, Coworking, and sharePrompts toggles now all go through `updatePending` (previously committed immediately)
- `isDirty` = pending ≠ last committed (controls save options bar, which now shows whenever there are unsaved changes regardless of any mode)
- `isPendingAtDefaults` = pending ≠ saved defaults — fires `onDirtyStateChange` to control top-bar "Restore defaults" button
- "Restore my defaults" renamed to **"Restore defaults"** in top bar; condition simplified to just `editDirty` (pending ≠ defaults)
- Bottom "Restore my defaults" link in Main removed (redundant)
- Loading a preset or session no longer exits edit mode — settings load directly into pending state
- Removed props from Main: `isAtDefaults`, `onLoadDefaults`, `onResetToOriginal`, `forceRestore`
- Removed `forceRestore` state from App; removed `isAtDefaults` computed value from App
- `SettingsDisplay` component still exists in codebase (used nowhere currently — candidate for deletion later)

**Stages 2 and 3 still to do:**
- Stage 2: Combine Presets and Scheduled Sessions into a single card with collapsible subsections
- Stage 3: Redesign Start/Save button area — single card at bottom with context-sensitive buttons

---

## Session 37 — 2026-03-14 (wmben PC — UI fixes, Settings modal, Why Prosochai text revisions)

**What was done:**

**Bug fixes:**
- Prompt interval minimum lowered to 0.015 (≈1 second) for work period, break, long break, and Prosochai interval fields
- Sound toggle now routes through `updatePending` in edit mode (previously wrote directly to settings, bypassing pending system — changes persisted even after discarding edit mode)
- Toggling Pomodoros off in edit mode now correctly resets Prosochai interval to saved standalone default (previously left it at half the work period)
- "Restore my defaults" buttons (top bar + bottom of page) now appear whenever there are unsaved edits in edit mode, not just when applied settings differ from defaults
- Fixed "Cannot access 'isDirty' before initialization" error caused by useEffect referencing isDirty before its declaration

**Settings gear icon + modal:**
- New ⚙ button in top bar (right of Help / FAQ) opens a Settings modal
- Settings modal contains "Restore software defaults" with confirmation step
- Link is grayed out with tooltip if settings are already at software defaults
- Removed old "Reset to original defaults" link from edit mode (moved into Settings modal)

**Why Prosochai text revisions:**
- Rewrote opening paragraphs (both modal and standalone page): new phrasing about managing attention in two ways, removed Pierre Hadot/Marcus Aurelius passage, updated examples
- Minor wording tweaks throughout ("read, and reflect" → "and reflect"; "did not need to get written" → "didn't need to be written")

**Known bug noted in TODO.md:**
- "Save options" bar doesn't appear for all edit mode changes (only reliable trigger is changing the timing field); to be fixed in planned save/start button overhaul

---

## Session 36 — 2026-03-12 (wmben PC — Sessions section overhaul: Solo/Coworking subsections, up to 5 solo schedules, locale-aware formatting)

**What was done:**

**Sessions section UI overhaul:**
- Restructured "Scheduled & Active Sessions" into two collapsible subsections: "Solo" and "Coworking"
- Removed "Join" buttons from coworking session cards (reserved for future bottom-of-screen join panel)
- Replaced solo "Cancel schedule" button with Options dropdown (Rename + Delete) matching coworking style
- Solo card badge now shows timing on left, matching coworking card layout (e.g. "Mar 14 at 4:30 PM")
- Recurring cowork badge now shows recurrence pattern ("Every Mon & Wed at 09:00 ↻") instead of next-occurrence date

**Solo sessions: single slot → up to 5 (matching coworking cap):**
- New `SoloSession` discriminated union type with `id: string` (and optional `name`, `settings` snapshot)
- New storage functions: `getSoloSchedules()` (array, migrates legacy), `addSoloSchedule()`, `updateSoloSchedule()`, `deleteSoloSchedule()`
- App.tsx: polling iterates all sessions, tracks `upcomingSessionId` / `activeSessionId`
- Main.tsx: `soloSchedules: SoloSession[]` state; all UI renders list of cards

**`src/lib/formatLocale.ts` (new file):**
- `locale12h()`: detects 12h vs 24h by formatting a known 13:00 time with `undefined` locale (respects Windows regional settings, not just display language)
- `sortDays(days)`: locale-aware week start via `Intl.Locale.weekInfo`
- `formatTime(hhmm)`: "16:30" → "16:30" or "4:30 PM"
- `formatDate(date, time)`: "Mar 14 at 4:30 PM"
- `formatTimestamp(ms)`: "Today at 4:30 PM" or "Mar 14 at 4:30 PM"
- `formatRecurring(days, time)`: "Every Mon & Tue at 09:00"

**Bug fixes:**
- Startup auto-launch into countdown: `onBack` on ScheduledStart wasn't clearing `COWORK_SESSION_KEY`; fixed to remove key and reset cowork state
- Solo rename pre-fill was blank: now shows current display name (formatDate/formatRecurring fallback)
- "When" section showing only time for specific-date sessions: now shows full date+time
- Wrong date in "When" when clicking cowork session card: now extracts date from `timing.startMs`

**TypeScript:** Clean ✅

**Files changed:** `src/lib/types.ts`, `src/lib/storage.ts`, `src/lib/formatLocale.ts` (new), `src/components/App.tsx`, `src/components/screens/Main.tsx`

---

## Session 35 — 2026-03-12 (wmben PC — solo schedule click fix + settings snapshot storage)

**What was done:**

**Bug fix — solo schedule card click did nothing after loading a cowork session:**
- Root cause: click handler did `{ ...settings, ...timingUpdates }` — when `settings` was already a cowork room load, timing-only patch didn't clear `isCoworking`, `promptSettings`, etc.
- Fix: extended `soloSchedule` storage to include a full `Settings` snapshot at save time; click handler now restores from that snapshot

**`src/lib/types.ts`:**
- Added `settings?: Settings` to both branches of the `soloSchedule` union type in `SettingsFile`

**`src/components/screens/Main.tsx`:**
- `handleSaveRecurring`: now passes `settings: p` when calling `saveSoloSchedule`
- Specific-date path in `handleMainAction`: now passes `settings: p` when calling `saveSoloSchedule`
- Solo schedule card click handler: uses `soloSchedule.settings ?? modeDefaults` as base (restores saved settings; falls back to user defaults for old schedules without snapshot)

**Note for testing:** existing saved solo schedules predate this fix and won't have a snapshot — delete and re-save once to get proper restoration behavior.

**TypeScript:** Clean ✅

**Files changed:** `src/lib/types.ts`, `src/components/screens/Main.tsx`

---

## Session 34 — 2026-03-12 (wmben PC — Wikipedia links in Key Terms, edit mode card headers, discard/save-default confirmations, sessions section bug fix)

---

## Session 31 — 2026-03-10 (wmben PC — app rename + bug fixes + room card redesign + WhenSection headings)

**What was done:**

**App rename: MindfulPrompter → Prosochai**
- `layout.tsx`: title + description updated
- `App.tsx`: nav logo text
- `HelpModal.tsx`: notification permission text
- `NotificationBanner.tsx`: two instances of brand name
- `Timer.tsx`: notification fallback title
- `defaults.ts`: `generateRoomName` hybrid label ("Prosochai" not yet fully consistent — see pending fixes)

**Bug fixes:**
- Customize.tsx: toggling Prosochai ON while Pomodoros active no longer fails validation (resets `promptIntervalMinutes` to `derivedInterval`)
- Main.tsx: same fix for Pomodoro toggle ON while Prosochai active
- cowork.ts: `stripUndefined()` helper added; applied to `createRoom` and `updateRoom` Firebase writes — prevents "value argument contains undefined" error when `promptSettings: undefined`

**Delete UX overhaul (presets + rooms, Main.tsx + Summary.tsx):**
- Old: two-click in-dropdown confirm
- New: click Delete → close dropdown → inline red confirmation panel below item with Cancel + Confirm delete buttons

**Button redesign:**
- Start/Join buttons moved to LEFT of item name on preset/room cards
- Styled as solid emerald pill buttons
- Play icon (▶) removed from button text
- Enter key shortcut removed

**Room card two-row layout (new in Session 31):**
- Row 1: state badge (always shown) + room name + Options ▾
- Row 2: Join button (always present for all room states)
- Badge label: "In progress" → **"Live"**
- Join button: bright green when joinable (active or ≤5 min to start), grayed+disabled otherwise with native `title` tooltip

**WhenSection headings:**
- Added `heading` and `headingHint` props to `WhenSection.tsx`
- Main.tsx: heading is "Start a solo session" / "Schedule a new coworking room" based on toggle
- Main.tsx: hint line below heading when a room is selected + toggle OFF (directs to Join button or Options ▾)
- Summary.tsx: same heading logic (no hint)

**Selection highlight:**
- Preset cards: indigo border/bg when selected
- Room cards: emerald border/bg when selected

**Summary page cleanup (Settings Updated view):**
- Removed PresetList and RoomList from main view
- Removed bottom "Change Settings" button from main view
- "Save Changes to Preset/Room" button → `save` variant (indigo) to distinguish from green session-start actions

**Button.tsx:**
- Added `save` variant (indigo): `bg-indigo-600 text-white hover:bg-indigo-700`

**Pending from this session:**
- Tauri window title still says "MindfulPrompter" (fix: `src-tauri/tauri.conf.json`)
- `generateRoomName` hybrid case still says "mindfulness" not "Prosochai" (`defaults.ts` line 104)
- Copy button has no visual feedback

**Files changed:** `src/app/layout.tsx`, `src/components/App.tsx`, `src/components/ui/HelpModal.tsx`, `src/components/ui/NotificationBanner.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/WhenSection.tsx`, `src/components/screens/Main.tsx`, `src/components/screens/Customize.tsx`, `src/components/screens/Summary.tsx`, `src/components/screens/Timer.tsx`, `src/lib/cowork.ts`

**TypeScript:** Clean ✅

---

## Session 30 — 2026-03-08 (wmben PC — click-to-load + full room settings + Options ▾)

**What was done:**

**Issue 1 — Click-to-load restored (presets + rooms):**
- Preset names: bold blue clickable span (`font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer`). Clicking calls `handleLoad(slot)` / `handlePresetLoad(slot)` — loads settings silently, stays on current page. The page-level "Change Settings" button then opens Customize tied to that preset.
- Room names: same bold blue clickable span. Clicking calls `onLoadRoom?.(room)` without navigating. Updates `selectedRoom` indicator.
- Applied to both Main.tsx and Summary.tsx (PresetList + RoomList components).

**Issue 2 — Full settings saved in CoworkRoom:**
- `hostSettings?: Settings` added to `CoworkRoom` type in `types.ts`
- `buildHostSettings()` in `cowork.ts` now returns `room.hostSettings` directly when present (restores ALL settings: timing, prompts, dismissSeconds, hardBreak, sound, etc.). Legacy rooms without `hostSettings` fall back to timing-overlay behavior.
- Both `handleGenerateRoom` call sites (Main.tsx + Summary.tsx) now pass `hostSettings: settings / localS` when creating a room.
- `sharePrompts` still controls what GUESTS can optionally use — independent of what's saved for the host.

**UI improvement — `···` → `Options ▾`:**
- Tiny `···` button replaced with `Options ▾` (text + border + proper sizing) on all preset and room rows in both Main.tsx and Summary.tsx.

**Files changed:** `src/lib/types.ts`, `src/lib/cowork.ts`, `src/components/screens/Main.tsx`, `src/components/screens/Summary.tsx`

**TypeScript:** Clean ✅

---

## Session 29 — 2026-03-08 (wmben PC — row redesign + Summary.tsx overhaul)

- `···` dropdown menus on every preset row and room row (Main.tsx + Summary.tsx)
- `▶ Start` button on preset rows (loads + starts immediately); `▶ Join Room` on "In progress" room rows
- State badges on room rows: "In progress" (emerald), "Starts…" (indigo), "Ended…" (gray). Time always shown.
- `↻` recurring icon + tooltip on rooms with `recurrenceRule`
- Room sorting: In Progress → Upcoming (soonest first) → Ended (most recent first)
- Room rename: `updateRoom(code, { name })` via Firebase
- "Change Settings" shortcut in dropdown: loads context + navigates to Customize
- Expand/collapse icons changed from `▶`/`▼` to `+`/`−`
- Smart post-room-generation join button: within 5 min → green `▶ Join Room Now`; otherwise secondary button
- Preset list added to Summary.tsx main view; Rooms list added to Summary.tsx (both views)
- Summary.tsx section reorder: cowork toggle first, save options hidden when cowork ON
- Cowork toggle defaults ON on Summary.tsx when `editContext.type === 'cowork-room'`

**Files changed:** Main.tsx, Summary.tsx, App.tsx

---

## Session 28 — 2026-03-07 (wmben PC — scheduling UX polish)

- `WhenSection.tsx`: removed timezone picker; replaced with inline timezone label after time input (e.g. "Prague (UTC+1)"); `specificDate` now pre-filled with today
- `defaults.ts`: added `generateRoomName(settings)` — e.g. "Mindfulness every 15m", "25m Pomodoro"
- Main.tsx + Summary.tsx: room name default uses `generateRoomName` with deduplication

---

## Session 27 — 2026-03-07 (wmben PC — scheduling redesign + cowork toggle)

Minor fixes from Session 26:
- Summary.tsx: preset save button reads "Save Changes to Preset: [name]"
- Main.tsx: cowork button says "Make this a NEW Hosted Coworking Session" when room loaded

Major UX redesign:
- `types.ts`: added `soloSchedule?` union type to `SettingsFile`
- `storage.ts`: added `getSoloSchedule`, `saveSoloSchedule`, `clearSoloSchedule`
- `WhenSection.tsx` (new): shared "When?" component — 3 radios (now / specific / recurring), day picker, used by Main + Summary
- Main.tsx: complete layout restructure — presets/rooms collapsed, cowork inline toggle, always-visible WhenSection, Enter key only starts when startType=now + cowork OFF
- Summary.tsx: same redesign applied; post-save preset list collapsible
- App.tsx: session-start polling every 30s (shows notice banner ≤5 min from schedule); `handleCoworkHostStart` routes future rooms to `scheduled-start`; auto-rejoin on refresh

---

## Session 26 — 2026-03-07 (wmben PC — major redesign implemented)

Full implementation of Session 25 redesign plan:
- Removed 3-mode system (`AppMode`); replaced with `useTimedWork + useMindfulness` booleans
- Rewrote: types.ts, defaults.ts, storage.ts (key → `mindful-prompter-v3`, v2 auto-wiped), schedule.ts, cowork.ts, App.tsx
- New Main.tsx (replaces DefaultsReview.tsx): unified main screen with inline expandable panels
- Rewrote Customize.tsx: two collapsible sections with On/Off toggles; guard prevents both off
- Updated Summary.tsx: inline Host + Schedule panels
- Updated Timer.tsx: room code toggle, "End for Everyone" confirmation, "Leave Session" label
- Rewrote ScheduledStart.tsx: simple countdown screen; receives `startMs` prop
- Deleted: ModeSelect.tsx, CoworkSetup.tsx, CoworkJoin.tsx, DefaultsReview.tsx
- Updated Firebase rules: added `host-rooms` path

---

## Session 27 (SettingsDisplay + hero header) — 2026-03-07

- Created `SettingsDisplay.tsx`: sound toggle, Timed Work card (inline toggle, tomato.png, collapsible), Mindfulness card (inline toggle, bowl.png, collapsible). Toggle guards.
- Updated Main.tsx: hero header with logo.png, tagline with Wikipedia tooltip links, SettingsDisplay, "Reset to my saved defaults"
- Updated App.tsx: logo image in back-link, `handleLoadDefaults`, `isAtDefaults`
- Rewrote Summary.tsx: local settings state (`localS`), SettingsDisplay, simplified headings

---

## Session 25 — 2026-03-06 (wmben PC — redesign planned, cowork tested)

- Tested cowork feature: two-tab test passed ✅
- Firebase security rules updated
- Designed major app redesign (plan only; implemented in Session 26)

---

## Session 24 — 2026-03-05 (wmben PC — cowork: Firebase rooms, host/guest flows, Timer sync)

**Firebase setup:** Created project, enabled Realtime DB + Anonymous Auth, stored config in `.env.local`

**New files:**
- `firebase.ts` — Firebase init, anonymous auth
- `cowork.ts` — room CRUD, timing, `buildGuestSettings()`, `buildHostSettings()`, `computeSessionDurationMs()`
- `CoworkSetup.tsx` — host flow (now deleted in Session 26)
- `CoworkJoin.tsx` — guest flow (now deleted in Session 26)

**Key design decisions:** Sync the clock (not the timer); two sharing layers (timing always, content optional); recurring sessions via `RecurrenceRule`; late join via `firedSet` pre-population.

---

## Session 23 — 2026-03-05 (wmben PC — settings storage migration to Tauri AppData)

- `storage.ts`: added `isTauri()` branch — reads/writes JSON via `@tauri-apps/plugin-fs`; keeps localStorage for browser dev
- Export/Import settings buttons on ModeSelect (now removed in Session 26 redesign)

---

## Session 22 — 2026-03-05 (wmben PC — Tauri icon fix)

- Window icon set in Rust `lib.rs` setup() via `image` crate (PNG → RGBA → `set_icon()`)
- Taskbar icon cache cleared with `ie4uinit.exe -show`
- Tauri layout, images, title verified ✅ — Phase 2 Tauri verification DONE

---

## Session 21 — 2026-03-05 (wmben PC — bug fixes + landing page redesign + logo)

- NumericInput regression fix: min validation changed back to `0.01` (was incorrectly `0.5`)
- App max-width: `max-w-lg` → `max-w-2xl`
- Text updates: "Pomodoro Timer" → "Timed Work Sessions"; "Both Together" → "Combo Mode: Mindfulness Prompts Embedded in Work Sessions"
- Images: gong replaced with bowl.png; combo icon replaced with logo.png; logo.png added to title bar
- Browser favicon: `logo.png` → `src/app/icon.png`

---

## Session 20 — 2026-03-05 (wmben PC — Items 4/5/6 bug fixes + summary screen redesign)

- `formatSummaryTime(seconds)` — replaces `formatDuration` across summary displays
- M-mode finite prompt bug: session_complete IS now the Nth prompt (N-1 regular + session_complete at N×interval)
- Stats fixes: `canonicalEndSecondsRef`, M-mode session_complete increments prompts counter
- Batch file fixes: kills by window title AND exe name before restart
- SessionComplete.tsx redesign: removed 60s auto-close; removed prompt box; natural-language summary for Pomodoro/Both; bold/italic distinction for counts/durations
- `dismissSeconds = 0` fix: `minValue` prop on NumericInput; accepts 0 (immediate dismiss)

---

## Session 19 — 2026-03-04 (wmben PC — Items 4, 5, 6)

**Item 4 — Mindfulness scope:** `MindfulnessScope` type + `bothMindfulnessScope` setting; selective prompt assignment per event type in schedule.ts; 4-option selector in Customize.

**Item 5 — Remove all popup labels:** Deleted all `popupLabel*` fields; updated title strings in schedule.ts; M-mode session_complete shows prompt + uses dismissSeconds; P-mode session_complete dismissSeconds=0.

**Item 6 — Prompt counter in M-mode:** `promptCountTotal?: number` on TimerEvent; "Prompt X of Y" (finite) or "Prompt X" (indefinite) in popup. M-mode only.

---

## Session 18 — 2026-03-04 (wmben PC — settings bug fixes in Customize.tsx)

- Root cause: Customize.tsx used `initial` (preset values) for "Default: X" helpers when a preset is loaded
- Fix: `modeDefaults = { ...getDefaults(mode), ...getDefaultsForMode(mode) }` used for all helper text and defaultValues
- All fields now correctly show factory defaults as gray helpers, preset values as black text ✅

---

## Session 17 — 2026-03-04 (wmben PC — UX polish)

- "Both Together" → "Mindfulness Prompts in Work Sessions"
- Preset-selected indicator on DefaultsReview
- Summary post-save view redesigned to match DefaultsReview layout; `onCustomize` + `onLoadPreset` props added
- Persistent home button on all screens except mode-select and timer

---

## Session 16 — 2026-03-04 (wmben PC — Phase 0 testing + Items 1, 2, 3, 3b)

- Phase 0 testing passed (browser + Tauri) ✅
- Items 1–3b implemented and partially tested

**Item 1:** Helper text standardization in Customize.tsx
**Item 2:** Preset name pre-filled in Summary.tsx
**Item 3:** True popup blocking — fullscreen Tauri window + overlay windows on other monitors
**Item 3b:** Hard break — `hardBreak?: boolean`; break popup fills full break duration; `autoClose: true` on TimerEvent; amber confirmation on enable

7 UX bugs fixed after Item 3b testing.

---

## Sessions 10–15 — 2026-03-02 to 2026-03-04 (gap + planning)

Sessions 10–13 were on a different PC (benw00) and undocumented in SHARED.md. Known from code:
- Tauri native popup window fixed (blank popup bug resolved; async command + isTauri guards)
- Popup labels, ∞ fields, two-step preset save implemented
- `dev-browser.bat` and `dev-tauri.bat` created

Session 14 (new PC, benw00): Terminology overhaul "session" → "period"; period numbering fix; popup text rewrite; `totalSets` + `periodsPerSet` on TimerEvent.

Session 15 (wmben PC): Planning session — Items 1–6 designed; no code.

---

## Sessions 1–9 — 2026-02-13 to 2026-03-01

- **Session 1:** Created Next.js app; all 6 screens; timer engine with Web Worker; notification overlay; PWA; sound
- **Sessions 2–5:** Architecture decisions; static export; types/storage/defaults rewrites; settings UI; session stats
- **Sessions 6–8:** UI/UX overhaul (Customize → single scrollable page, new Summary flow); icon redesign; keyboard shortcuts; "Schedule Start Time" feature; ScheduledStart.tsx
- **Session 9:** Tauri wrapper installed; `show_notification` Rust command; popup page created; URL params approach for data passing (blank popup bug not yet resolved at end of session)
