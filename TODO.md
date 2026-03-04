# MindfulPrompter TODO

## Status: Phase 2 (Tauri) in progress — Items 1–3b + UX polish done ✅; Items 4–6 next

The Tauri wrapper exists and the native popup is working (fixed in Sessions 10–11).
Session 16: Items 1, 2, 3, 3b implemented and tested. 7 UX bugs found and fixed.
Session 17: UX polish — mode rename, preset indicator, post-save layout redesign, home button.
Next: test Session 17 changes in browser, then proceed to Items 4, 5, 6.

**Before testing anything:** Run `dev-browser.bat` (browser) or `dev-tauri.bat` (full app).
No need to manually unregister the service worker — the batch files handle port cleanup automatically.

---

## Immediate next steps (in order)

### 1. ✅ Test everything in browser first (`dev-browser.bat`) — DONE Session 16
### 2. ✅ Test Tauri app (`dev-tauri.bat`) — DONE Session 16
### 3. ✅ Fix any bugs found — none in Phase 0
### 4. ✅ Integrate notes from other PC — done
### 5. ✅ Items 1, 2, 3 coded and tested — DONE Session 16
### 6. ✅ Item 3b coded and tested — DONE Session 16
### 7. ✅ 7 UX bugs found and fixed — DONE Session 16
### 8. ✅ Session 17 UX polish — DONE (mode rename, preset indicator, post-save layout, home button)

### 9. Test Session 17 changes in browser (`dev-browser.bat`)

**Mode rename:**
- [ ] Mode-select landing page: "Both Together" card now reads "Mindfulness Prompts in Work Sessions"
- [ ] Mode page heading: "**Mindfulness Prompts in Work Sessions** Mode" (indigo + gray)

**Preset indicator:**
- [ ] Mode page: click any preset → "Preset selected: B2 — Name" appears below "Current settings"
- [ ] Click a different preset → indicator updates to new preset

**Post-save view:**
- [ ] Change Settings → save a preset → page shows DefaultsReview-style layout with preset indicator
- [ ] "← Back to settings" link present and goes back to Change Settings
- [ ] Preset list shown (including newly saved preset), with Rename/Delete working
- [ ] Start Session, Schedule Start Time, Change Settings buttons all present and functional
- [ ] Home button (⌂ MindfulPrompter) visible at top of screen

**Home button:**
- [ ] Home button appears on: mode page, Change Settings, Settings Updated, Scheduled Start, Session Complete
- [ ] Home button NOT visible on: mode-select landing page, timer screen
- [ ] Clicking home button from any screen returns to mode-select landing page

---

### 10. Test Session 16 bug fixes in browser (`dev-browser.bat`)

**NumericInput fix:**
- [ ] Go to Change Settings → change a value (e.g. work period to 30 min) → Review Changes → Back → values show as BLACK text, not gray placeholder
- [ ] Load a preset → Change Settings → all changed fields show as black text
- [ ] Break length and long break length: if changed from derived default, show as black text when returning

**promptRaw fix:**
- [ ] Mindfulness prompt textarea: always shows current prompt as black text (not gray)
- [ ] Clearing the textarea shows the current prompt as gray placeholder (fallback)

**hardBreak display:**
- [ ] Settings Updated (Summary): "Lock screen during breaks: Yes" row appears when hardBreak enabled
- [ ] Mode landing page (DefaultsReview): same row appears when hardBreak is the default

**Preset UX:**
- [ ] After saving a preset in Summary: "Save as Preset" and "Save as Default" buttons disappear
- [ ] Start Session button still shows after saving a preset

**Always-visible presets:**
- [ ] Mode landing page: saved presets always visible inline (no "Load Preset" button needed)
- [ ] Clicking a preset row loads it and updates the displayed settings immediately
- [ ] Rename and Delete still work

**Periods per set ∞:**
- [ ] Mode landing page: sessionsPerSet=0 shows "∞ (unlimited)" not "0"

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

### Item 3b — Hard break option ✅ CODED + TESTED (Session 16)
- [x] `hardBreak?: boolean` in Settings; `dismissSeconds?` + `autoClose?` on TimerEvent
- [x] defaults.ts: hardBreak: false in P and B factory defaults
- [x] schedule.ts: break events get `dismissSeconds: breakSec/longBreakSec, autoClose: true` when hardBreak
- [x] Customize.tsx: "Lock screen during breaks" toggle after break length; amber confirmation on enable
- [x] Timer.tsx: `event.dismissSeconds ?? settings.dismissSeconds`; passes `event.autoClose`
- [x] NotificationOverlay.tsx: `autoClose` prop; auto-calls onDismiss when countdown hits 0
- [x] popup/page.tsx: parses `autoClose` URL param; `handleDismissRef` auto-fires when countdown hits 0
- [x] lib.rs: `auto_close: bool` in NotificationData + URL param; tauri.ts passes it through

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
