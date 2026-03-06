# MindfulPrompter TODO

## Status: Phase 2 — cowork tested ✅; major app redesign PLANNED, awaiting approval

Items 1–6 coded + tested (Sessions 16–21). Tauri native window verified (Session 22).
Settings migrated to Tauri AppData (Session 23). Cowork tested ✅ (Session 25).
**Major redesign planned (Session 25) — plan written, not yet approved or implemented.**

**Before testing anything:** Run `dev-browser.bat` (browser) or `dev-tauri.bat` (full app).
Batch files now kill all previous instances (cmd window + exe + port 3000) before starting fresh.

---

## Immediate next steps

### 1. ✅ Items 1–6 all coded and tested — DONE (Sessions 16–21)
### 2. ✅ Tauri layout, images, title, icon verified — DONE (Session 22)
### 3. ✅ Settings storage: `localStorage` → Tauri AppData — DONE (Session 23)
### 4. ✅ Cowork feature: tested and working (Session 25)
Firebase security rules confirmed and set. Two-tab sync test passed.

### 5. ⏳ MAJOR APP REDESIGN — plan written, needs your approval before any code is written

**NEXT SESSION: Read the plan and approve or modify it before proceeding.**

**To pick up where we left off:**
> "Read the redesign plan at `C:\Users\wmben\.claude\plans\proud-soaring-lantern.md` and show it to me so I can approve or adjust it before we start coding."

**What the redesign does (summary):**
- Eliminates the 3-mode system (Mindfulness / Pomodoro / Combo) → unified settings with two toggles: "Timed Work Sessions" on/off and "Mindfulness Prompts" on/off
- Mode-select landing screen goes away → app lands directly on main settings page
- Cowork hosting and joining become inline panels on the main page (no separate screens)
- Scheduling (date+time, recurring) also moves inline on the main page
- Hosted rooms listed like presets (max 5, with show-code / delete / settings buttons)
- Improved timezone picker (UTC offset format, filterable by typing)
- Refresh persistence for cowork sessions (auto-rejoin on page reload)
- Show-room-code toggle in the Timer screen
- Storage format bumped to v3; existing presets wiped (pre-launch, acceptable)

**Full plan file:** `C:\Users\wmben\.claude\plans\proud-soaring-lantern.md`
**Session notes:** SHARED.md Session 25

**First — set Firebase security rules** (5 min, blocks everything else):
- Firebase Console → Realtime Database → Rules → paste:
```json
{
  "rules": {
    "rooms": {
      "$code": {
        ".read": true,
        ".write": "auth != null && (!data.exists() || data.child('hostUid').val() === auth.uid)"
      }
    }
  }
}
```

**Then test** (see SHARED.md Session 24 for full checklist):
- Host creates room → gets code → joins as host → timer starts
- Guest enters code → sees room status → chooses content mode → joins in sync
- Late join: guest joins mid-session → jumps to correct position (no popup flood)
- Recurring session: set future time → both clients count down → start together

**Deferred cowork features** (add in a follow-up session after core is tested):
- Public rooms (discoverable browse list)
- Host "delete room" UI
- Room auto-expiry mechanism
- Vercel deployment (web companion for guests)
- Anonymous UUID analytics (install count / usage tracking)

### 5. Distribution prep (before public launch)
- Build unsigned installer — share with tech-adjacent testers
- Decide: Microsoft Store submission (free signing) vs. paid OV certificate (~$300–500/yr)
- Set up GitHub Actions for Mac builds (required — cannot build Mac on Windows)
- Get Apple Developer account ($99/yr) when ready to target Mac users

---

## Long-term roadmap (post-launch, contingent on traction)

### Phase 3: Free user accounts (only if usage data shows demand)
- Firebase Auth: optional "Create account" button
- Settings sync across devices for logged-in users
- Nothing gated — free accounts only
- UUID migrates to account on signup (no data loss)

### Phase 4: Paid tiers (only if Phase 3 has real users)
- Stripe payment processing
- Access tiers (e.g., team cowork, advanced features)
- This is the commercial endgame
- **Not being designed now** — but Firebase foundation keeps this path open

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
