# MindfulPrompter TODO

## Status: Phase 2 (Tauri) in progress — Items 1–6 all done ✅; remaining Phase 2 next

Items 4, 5, 6 coded (Session 19) + bugs fixed (Sessions 20–21).
All three modes tested in browser and working.

**Before testing anything:** Run `dev-browser.bat` (browser) or `dev-tauri.bat` (full app).
Batch files now kill all previous instances (cmd window + exe + port 3000) before starting fresh.

---

## Immediate next steps

### 1. ✅ Items 1–6 all coded and tested — DONE (Sessions 16–21)
### 2. ✅ Session 20 + 21 commits pushed to GitHub
### 3. Test Tauri (`dev-tauri.bat`) — verify layout, images, title changes in native window
### 4. Remaining Phase 2: settings storage → Tauri file API; cowork via Firebase

---

## Session 15 features — status (all done ✅)

### Item 1 — Helper text standardization ✅ DONE
### Item 2 — Preset name pre-filled ✅ DONE
### Item 3 — True popup blocking ✅ DONE
### Item 3b — Hard break option ✅ DONE

### Item 4 — Mindfulness scope for Both mode ✅ DONE (Session 19 + 20 bugfixes)
- `MindfulnessScope`: `'work-only' | 'breaks' | 'work-starts' | 'all'` (default `'work-only'`)
- 4-option selector in Customize (Both mode); shown in DefaultsReview + Summary
- `showPromptOn` object in schedule.ts gates promptText/dismissSeconds per event type
- dismissSeconds=0 on events without prompt (so no forced delay on non-mindfulness popups)

### Item 5 — Popup redesign ✅ DONE (Session 19 + 20 bugfixes)
- All popupLabel fields removed; title strings updated; work_start body fixed
- M-mode session_complete: IS the Nth prompt (not a separate extra popup)
- Session-complete body simplified to `"Total session time: X"` (no misleading formula)

### Item 6 — Prompt counter in M-mode ✅ DONE (Session 19 + 20 bugfixes)
- `promptCountTotal` on TimerEvent; 0 = indefinite sentinel; undefined = non-M-mode
- Counter shown in NotificationOverlay (browser) and popup/page.tsx (Tauri)
- Final popup shows "Prompt N of N" correctly

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
