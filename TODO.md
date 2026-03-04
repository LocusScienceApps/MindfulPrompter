# MindfulPrompter TODO

## Status: Phase 2 (Tauri) in progress — Items 1–3b + UX polish + Settings bugs done ✅; Items 4+5+6 next

The Tauri wrapper exists and the native popup is working (fixed in Sessions 10–11).
Session 16: Items 1, 2, 3, 3b implemented and tested. 7 UX bugs found and fixed.
Session 17: UX polish — mode rename, preset indicator, post-save layout redesign, home button.
Session 18: Settings bug fixes — Customize.tsx helpers/placeholders now use mode defaults, not preset values.
Items 4 and 5 are now INTERTWINED — implement together (see revised plans below).

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

### 9. ✅ Test Session 17 changes — confirmed working (Session 18)
### 10. ✅ Test Session 16 + 18 bug fixes — confirmed working (Session 18)

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

### Items 4+5 — COMBINED: Popup customization restructured + mindfulness scope (Both mode)
⚠️ These were originally separate items but are now intertwined. Implement together.

**The big picture:** Remove the grouped "Popup Labels" section. Instead, inline label AND body text
customization alongside each relevant settings section. In Both mode, each popup type also gets a
"include mindfulness prompt?" toggle — this replaces the old single `bothMindfulnessScope` selector.

#### New Settings fields needed (`types.ts`)

Popup body text (all optional — empty/undefined = use auto-generated default):
- `popupBodyBreakStart?: string`    — body text for short-break popup (work period ends)
- `popupBodyWorkStart?: string`     — body text for back-to-work popup (after short break)
- `popupBodyLongBreak?: string`     — body text for long-break popup (set ends)
- `popupBodySetStart?: string`      — body text for new-set-start popup (after long break)
- `popupBodySessionDone?: string`   — body text for session-complete popup

Mindfulness-in-popup toggles (Both mode only, all default false):
- `mindfulAtBreakStart?: boolean`   — include mindfulness prompt in short-break popup
- `mindfulAtWorkStart?: boolean`    — include mindfulness prompt in back-to-work popup
- `mindfulAtLongBreak?: boolean`    — include mindfulness prompt in long-break popup
- `mindfulAtSetStart?: boolean`     — include mindfulness prompt in new-set-start popup
- `mindfulAtSessionEnd?: boolean`   — include mindfulness prompt in session-complete popup

Keep existing label fields: `popupLabelMindfulness`, `popupLabelWorkStart`, `popupLabelShortBreak`,
`popupLabelLongBreak`, `popupLabelSessionDone`.

#### Customize.tsx layout changes

**Mindfulness section** (already has prompt text):
- Add `popupLabelMindfulness` input field below prompt text (move from old Popup Labels section)
- Helper: shows label + text together as "What users will see on the mindfulness popup"

**Pomodoro Settings section — work period subsection:**
- After sessionsPerSet: add "Work period popup" sub-group:
  - Label field (`popupLabelWorkStart`) — what appears as the chip/title
  - Body text field (`popupBodyWorkStart`) — customizable body; leave blank for auto-generated
  - (Both mode only) "Include mindfulness prompt?" toggle (`mindfulAtWorkStart`, default No)

**Pomodoro Settings section — break subsection:**
- After break length / hardBreak toggle: add "Break popup" sub-group:
  - Label field (`popupLabelShortBreak`)
  - Body text field (`popupBodyBreakStart`)
  - (Both mode only) "Include mindfulness prompt?" toggle (`mindfulAtBreakStart`, default No)

**Multiple sets subsection** (only shown when `s.multipleSets`):
- After long break length / number of sets: add two sub-groups:

  "Long break popup":
  - Label field (`popupLabelLongBreak`)
  - Body text field (`popupBodyLongBreak`)
  - (Both mode only) `mindfulAtLongBreak` toggle

  "New set popup" (work_start after long break):
  - Label field (reuse `popupLabelWorkStart`? or new `popupLabelSetStart`? — TBD)
  - Body text field (`popupBodySetStart`)
  - (Both mode only) `mindfulAtSetStart` toggle

  "Session complete popup":
  - Label field (`popupLabelSessionDone`)
  - Body text field (`popupBodySessionDone`)
  - (Both mode only) `mindfulAtSessionEnd` toggle

Remove the old grouped "Popup Labels" section entirely.

#### schedule.ts changes
- When `mindfulAtBreakStart/WorkStart/etc.` is true, add `promptText` + `dismissSeconds` to that event
- Body text: use `s.popupBodyXxx` if set, otherwise keep auto-generated text (no breaking change)
- No more `bothMindfulnessScope`; individual toggles replace it

#### Other files
- `defaults.ts`: add new fields with false/undefined defaults; remove `bothMindfulnessScope`
- `DefaultsReview.tsx` + `Summary.tsx`: update settings summary display for new fields
- `lib.rs` + `popup/page.tsx`: no changes needed (already handles promptText on any event type)

#### Open design question: "new set" popup label
Currently `popupLabelWorkStart` covers ALL work_start events (after short AND long break).
Do we split into two separate labels (one for after short break, one for after long break/new set)?
Probably yes — the text would differ ("Back to work!" vs "New set starting!"). Resolve when implementing.

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
