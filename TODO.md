# MindfulPrompter TODO

## Status: Phase 2 (Tauri) in progress — Items 1–3 coded, need testing ⚠️

The Tauri wrapper exists and the native popup is working (fixed in Sessions 10–11).
Sessions 12–15 added significant improvements.
Session 15 was a planning session — 6 features designed, no code written.
Session 16: Phase 0 testing completed on this PC. Items 1, 2, 3 coded (not yet tested).

**Before testing anything:** Run `dev-browser.bat` (browser) or `dev-tauri.bat` (full app).
No need to manually unregister the service worker — the batch files handle port cleanup automatically.

---

## Immediate next steps (in order)

### 1. ✅ Test everything in browser first (`dev-browser.bat`) — DONE Session 16

**Pomodoro mode — timer screen:**
- [ ] Multiple sets: ring shows "Set 2, Period 3", detail line shows "out of 4 *5-period* sets"
- [ ] Single set: ring shows "Period 3 of 4", no detail line
- [ ] Unlimited periods (sessionsPerSet=0): ring shows "Period 3", no detail line
- [ ] Unlimited sets (numberOfSets=0): ring shows "Set 2, Period 3", no detail line

**Pomodoro mode — popup text:**
- [ ] Short break popup: title "Break!", body "Set 2, Period 3 complete. Take a 5-minute break."
- [ ] Long break popup: title "Break!", body "Set 3 complete. Take a 15-minute break."
- [ ] Back-to-work popup: title "Break over!", body "Break over! Set 3, Period 2 starting (of 4 sets)"
- [ ] Single set back-to-work: body "Break over! Period 2 starting" (no set info)
- [ ] Session complete popup: body "3 sets × 4 periods × 25 min = 5h"

**Settings — multiple sets toggle:**
- [ ] Toggling "Yes, multiple sets" shows Number of Sets field with default 3 (not 1)

**Mindfulness mode:**
- [ ] No set/period info shown on timer screen (not applicable)
- [ ] Prompts fire at correct intervals
- [ ] promptCount=0 runs indefinitely; promptCount=N stops after N prompts

**Both Together mode:**
- [ ] Period numbering works alongside mindfulness prompts

**Settings flow:**
- [ ] Preset save/load round-trip (all three modes)
- [ ] "No changes — Start Session" goes directly to timer
- [ ] "Save as Default" confirmation + mode page updates
- [ ] Reset to original defaults works

### 2. ✅ Test Tauri app (`dev-tauri.bat`) — DONE Session 16
- [x] App launches without error
- [x] Native popup appears and works
- [x] Popup text formats correct
- [x] Dismiss works

### 3. ✅ Fix any bugs found — none found in Phase 0

### 4. ✅ Integrate notes from other PC — done

### 5. Test Items 1, 2, 3 (coded in Session 16, NOT YET TESTED)

**Test Item 1 — Helper text (browser only):**
- [ ] Customize.tsx: sessionsPerSet helper reads "Default: N. Enter 0 (= ∞) to run indefinitely." — no sub-note
- [ ] Customize.tsx: numberOfSets helper reads "Default: 3. Enter 0 (= ∞) to run indefinitely." — no sub-note
- [ ] Customize.tsx: promptCount helper reads "Default: 0 (= ∞) to run indefinitely." or "Default: N. Enter 0 (= ∞)…" — no sub-notes

**Test Item 2 — Preset name pre-filled (browser only):**
- [ ] Summary.tsx: preset name field is pre-filled with the auto-generated name (not blank)
- [ ] Placeholder still shows the auto name when field is cleared
- [ ] "Leave blank to use auto-generated name" helper text is GONE

**Test Item 3 — True popup blocking (Tauri only, `dev-tauri.bat`):**
- [ ] Popup is fullscreen on the active monitor (where the main app window is)
- [ ] Content (white card) is centered within the fullscreen dark background
- [ ] On a multi-monitor setup: other monitors get a dark `notification-overlay-N` window
- [ ] Dismissing the popup closes all overlay windows too
- [ ] Overlay windows block Alt+F4 (can't be closed until popup is dismissed)
- [ ] Single-monitor: popup is fullscreen, no overlay windows created
- [ ] Popup replacement (new notification while one is open) closes old overlays + creates new ones

---

## Session 15 features — status

### Item 1 — Helper text standardization (`Customize.tsx`) ✅ CODED
- [x] promptCount helper: `"Default: 0 (= ∞) to run indefinitely."` or `"Default: N. Enter 0 (= ∞) to run indefinitely."` — sub-notes removed
- [x] sessionsPerSet helper: `"Default: N. Enter 0 (= ∞) to run indefinitely."` — sub-note removed
- [x] numberOfSets helper: `"Default: 3. Enter 0 (= ∞) to run indefinitely."` — sub-note removed

### Item 2 — Preset name pre-filled (`Summary.tsx`) ✅ CODED
- [x] Initialize `presetName` state to `autoName` (not `''`)
- [x] `setPresetName(autoName)` when re-opening the save flow
- [x] Remove helper text below name input field

### Item 3 — True popup blocking (`lib.rs`, `popup/page.tsx`, `capabilities/default.json`) ✅ CODED
- [x] Popup becomes fullscreen on active monitor; white card (~480px) centered inside dark bg
- [x] Additional monitors get dark fullscreen `notification-overlay-N` windows
- [x] Overlay windows block close (Alt+F4) until `notification-replacing` or `session-stopped`
- [x] `close_notification_window` closes all overlay windows (emits `notification-replacing` first)
- [x] `capabilities/default.json` adds `notification-overlay-*` glob

### Item 3b — Hard break option (`types.ts`, `defaults.ts`, `schedule.ts`, `Customize.tsx`, `popup/page.tsx`)
- [ ] New `hardBreak: boolean` setting (P and B modes, default false)
- [ ] Toggle in Customize > Break section with amber warning + confirmation
- [ ] When enabled: break events get `isHardBreak: true` + `dismissSeconds = full break duration`
- [ ] Popup shows break countdown; OK button disabled until 0; auto-dismisses

### Item 4 — Mindfulness scope for Both mode (`types.ts`, `defaults.ts`, `schedule.ts`, `Customize.tsx`)
- [ ] New `bothMindfulnessScope: 'prompts-only' | 'breaks' | 'work-starts' | 'all'` (default `'prompts-only'`)
- [ ] A/B/C/D selector at bottom of Mindfulness section (Both mode only)
- [ ] Scope B: add `promptText` + `dismissSeconds` to short_break, long_break, session_complete
- [ ] Scope C: add `promptText` + `dismissSeconds` to non-first work_start events
- [ ] Scope D: both B and C

### Item 5 — Popup redesign (`types.ts`, `schedule.ts`, `lib.rs`, `Customize.tsx`, `DefaultsReview.tsx`, `Summary.tsx`, `popup/page.tsx`)
- [ ] Remove all `popupLabel*` Settings fields + `resolveLabel()` + chip label rendering (Session 12/13 rollback)
- [ ] Remove "Popup labels" subsection from DefaultsReview + Summary
- [ ] Update title strings: long_break → "Set complete! Long break starting."; work_start (short break) → "Break over. Back to Work!"; work_start (long break/new set) → "Long break over. Time to start the next set!"; session_complete → "Session Complete! Great Work!"
- [ ] Fix body: remove leading "Break over! " from work_start body text
- [ ] M-mode session_complete: add `promptText + dismissSeconds` (final mindfulness moment)
- [ ] P-mode session_complete: `dismissSeconds: 0`
- [ ] Detect work_start context: `period1 > 1` = after short break; `period1 === 1 && set1 > 1` = after long break

### Item 6 — Prompt counter in M-mode (`types.ts`, `schedule.ts`, `lib.rs`, `popup/page.tsx`)
- [ ] Add `promptCountTotal?: number` to `TimerEvent`; set it in `computeMindfulnessOnlySchedule`
- [ ] Pass as URL param from lib.rs
- [ ] Popup renders "Prompt X of Y" (finite) or "Prompt X" (indefinite) below prompt text; M-mode only

---

## After Items 1–6 → remaining Phase 2 work
- Settings storage: switch from localStorage → Tauri file system API (AppData)
- Cowork feature: Firebase Realtime Database for shared session codes

---

## Completed work (all committed)

### Sessions 1–9 (see SHARED.md for full history)
- [x] All Phase 1 features (mode-specific defaults, presets, session stats, UX flow)
- [x] Tauri wrapper scaffold + native popup window (Sessions 9–11)
- [x] Popup blank-white bug fixed (Session 10)
- [x] Blocking popup + popup replacement (Session 11)
- [x] Popup labels customizable per event type (Session 12)
- [x] ∞ display for unlimited periods/sets (Sessions 12–13)
- [x] Two-step preset save (Session 12)
- [x] Overlay redesign (Session 12)

### Session 14 (2026-03-03, new PC)
- [x] Batch files fixed: %USERPROFILE% replaces hardcoded username; port 3000 cleanup added
- [x] Default sets = 3 when "multiple sets" toggled on
- [x] Terminology: "session" (25-min unit) → "period" throughout all user-facing text
- [x] Period numbering: now shows period-within-set (not global count)
- [x] Timer screen detail line: "out of 4 *5-period* sets" with italics
- [x] Popup text rewrite: Break!/Break over! titles + position-aware body text
- [x] TimerEvent gains totalSets and periodsPerSet fields

---

## Important gotchas

- **Service worker cache**: Handled automatically — batch files kill old server before starting fresh.
- **React strict mode**: Double-mounts in dev. Timer uses `startTimeRef` to preserve start time.
- **JavaScript falsy 0**: Don't use `||` with numeric settings (0 is a valid value).
- **Static export**: `output: 'export'` in next.config.ts — required for Tauri compatibility.
- **Cargo PATH**: `dev-tauri.bat` uses `%USERPROFILE%\.cargo\bin` — works on any Windows username.
- **Terminology**: work period → set → session. "Session" only means the whole thing start to finish.
