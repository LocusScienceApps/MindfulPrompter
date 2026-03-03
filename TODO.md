# MindfulPrompter TODO

## Status: Phase 2 (Tauri) in progress — needs testing ⚠️

The Tauri wrapper exists and the native popup is working (fixed in Sessions 10–11).
Sessions 12–14 added significant improvements. **None have been tested on the new PC.**

**Before testing anything:** Run `dev-browser.bat` (browser) or `dev-tauri.bat` (full app).
No need to manually unregister the service worker — the batch files handle port cleanup automatically.

---

## Immediate next steps (in order)

### 1. Test everything in browser first (`dev-browser.bat`)

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

### 2. Test Tauri app (`dev-tauri.bat`)
- [ ] App launches without error (new PC, new username — Cargo path fixed)
- [ ] Native popup appears (not blank white) for work_start, short_break, long_break, session_complete
- [ ] New popup text formats display correctly in native window
- [ ] Popup dismiss works; session_complete dismissal navigates to completion screen

### 3. Fix any bugs found

### 4. Integrate notes from other PC
The other PC (wmben) may have session notes for Sessions 10–13 that were never pushed.
When back on that PC, check Claude's memory files and any local SHARED.md edits.
Merge those notes into this file and SHARED.md.

### 5. After all tests pass → remaining Phase 2 work
See SHARED.md Phase 2 section. Key items:
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
