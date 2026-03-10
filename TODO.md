# Prosochai TODO

## Status: Session 31 complete — regression testing needed + major redesign planned

**Before testing anything:** Run `dev-browser.bat` (browser) or `dev-tauri.bat` (full app).

---

## Immediate next steps

### 1. ✅ Items 1–6 all coded and tested — DONE (Sessions 16–21)
### 2. ✅ Tauri layout, images, title, icon verified — DONE (Session 22)
### 3. ✅ Settings storage: `localStorage` → Tauri AppData — DONE (Session 23)
### 4. ✅ Cowork feature: tested and working (Session 25)
### 5. ✅ Major redesign: implemented (Session 26) — needs regression testing
### 6. ✅ Scheduling redesign + cowork toggle: implemented (Session 27) — **needs regression testing**
### 7. ✅ Row redesign + room badges + Summary.tsx overhaul: implemented (Session 29) — **needs regression testing**
### 8. ✅ Click-to-load + full room settings + Options ▾: implemented (Session 30) — **needs regression testing**
### 9. ✅ UX polish: app rename → Prosochai, bug fixes, room card redesign, WhenSection headings: implemented (Session 31) — **needs regression testing**

---

## ⚠️ Pending small fixes (Session 31 leftovers)

- [ ] **Tauri window title** still reads "MindfulPrompter" (visible in OS title bar / taskbar). Fix: `src-tauri/tauri.conf.json` → change `productName` / window title to "Prosochai". See Screenshot5 from session 31.
- [ ] **`generateRoomName` in `src/lib/defaults.ts` line 110**: still returns `'Prosochai every ${X}m'` ← OK, but the hybrid case (line 104) returns `'${X}m Pomodoro + mindfulness'` — "mindfulness" should be "Prosochai".
- [ ] **Copy button feedback**: currently no visual cue when room code is copied. Should show "Copied!" or similar animation. Research best practice and implement.

---

## ⚠️ Major redesign planned (DO NOT IMPLEMENT until planning discussion)

Full spec: [docs/redesign-v2.md](docs/redesign-v2.md)

**First step for next session:** Open in planning mode, read `docs/redesign-v2.md`, and discuss/clarify before writing any code.

Key themes:
- Timing and coworking settings become first-class settings (displayed + editable on main page)
- No more separate Summary/Settings-Updated page
- All presets include timing + coworking settings
- New "saved non-preset sessions" section (replaces coworking rooms section)
- Settings editable inline on main page (unlock toggle) — no separate Customize page
- New bottom-button logic for all session states
- Redesigned coworking join flow
- Backend admin tool for owner defaults
- Minor: rename "rooms" → "sessions" throughout

---

## Regression test checklist (Sessions 26–30 redesign)

Run `dev-browser.bat` and work through these in order. Fix bugs before moving on.

### A. App startup / main screen
- [ ] App opens on Main screen with correct layout:
  - Header / tagline / SettingsDisplay at top
  - Presets section hidden if none saved; if presets exist, shows collapsed (+ Saved presets (N))
  - Coworking rooms section hidden if none; if rooms exist, shows collapsed (+ Your coworking rooms (N))
  - Cowork toggle (inline switch) is OFF by default
  - "When should this session start?" section always visible
  - "Start session now" radio selected → green "Start Session" button visible
  - "Change Settings" button at bottom
  - "Join a Coworking Session ▼" at very bottom

### B. "When should this session start?" section — Start Now
- [ ] "Start session now" selected → green "Start Session" button visible
- [ ] Enter key starts session (when focus is not in an input)
- [ ] Session starts immediately → Timer screen

### C. "When should this session start?" section — Specific date & time
- [ ] Select "Schedule a specific date & time" → date+time inputs expand
- [ ] Fill in date+time ~1 min from now → "Schedule Session" button appears
- [ ] Click "Schedule Session" → ScheduledStart countdown screen
- [ ] ScheduledStart auto-starts when countdown hits 0 → Timer starts
- [ ] "Start Now" on ScheduledStart screen starts timer immediately

### D. "When should this session start?" section — Recurring schedule
- [ ] Select "Repeat on a weekly schedule" → day-picker + time expand
- [ ] Select day(s), set time → timezone abbreviation shown inline (e.g. "Prague (UTC+1)")
- [ ] "Save Schedule" button saves to storage (confirmation message appears)
- [ ] Navigate away and come back → schedule is still saved (persists across page loads)
- [ ] Session-start notice banner: set a recurring schedule for "now" (or a time just passed) → banner shows "▶ Your scheduled session started X minutes ago" + "Skip this session" + "→ Join now"
- [ ] Set a time ≤5 min in the future → banner shows "⏰ Your scheduled session starts in X minutes" + "Cancel session" + "→ Go to session"
- [ ] "→ Go to session" → ScheduledStart countdown
- [ ] "→ Join now" → Timer starts immediately
- [ ] "Cancel session" → "Are you sure?" confirm → clears schedule, banner disappears

### E. Customize screen
- [ ] "Timed Work" section has an On/Off toggle
- [ ] "Mindfulness Prompts" section has an On/Off toggle
- [ ] Guard: trying to turn both off simultaneously is blocked (one stays on)
- [ ] Timed Work fields only visible when Timed Work is on
- [ ] Mindfulness fields only visible when Mindfulness is on
- [ ] Combined mode: prompt interval validates it divides evenly into work period length
- [ ] Mindfulness-only mode: prompt interval validates it divides evenly into 60
- [ ] No changes → "Start Session" skips Settings Updated screen
- [ ] With changes → goes to Settings Updated screen
- [ ] "Reset to original defaults" → confirmation → resets correctly
- [ ] "← Back" returns to main screen without saving

### F. Settings Updated screen (Summary.tsx)
- [ ] Shows updated settings correctly
- [ ] Save options: "Save Changes to Preset: [name]" (if preset context), "Save as a Preset", "Save as Default"
- [ ] Cowork toggle and "When should this session start?" section present (same as Main)
- [ ] "Start session now" → "Start Session" button → session starts
- [ ] Specific date → "Schedule Session" → ScheduledStart
- [ ] Recurring → "Save Schedule" → schedule saved
- [ ] Post-save view (after saving preset): preset list collapsed by default (+ Saved presets (N))
- [ ] "Change Settings" button at bottom

### G. Presets (unified S1–S5 namespace, v3 storage)
- [ ] Save as Preset → appears on Main screen collapsed under "+ Saved presets (N)"
- [ ] Click header to expand → preset list visible
- [ ] **Click preset name (bold blue text)** → settings summary updates, "Preset selected: SX — Name" shows, page does NOT navigate
- [ ] Then click "Change Settings" (bottom button) → Customize opens tied to that preset (save button reads "Save Changes to Preset: [name]")
- [ ] `▶ Start` button: loads preset AND immediately starts session
- [ ] `Options ▾` dropdown: "Change Settings", "Rename", "Delete"
- [ ] "Change Settings" in dropdown: loads preset + navigates to Customize
- [ ] "Rename": inline rename field; Enter/Save saves; Escape cancels
- [ ] "Delete": first click shows "Confirm delete?" in red; second click deletes
- [ ] Clicking outside the `Options ▾` dropdown closes it
- [ ] Up to 5 presets (S1–S5)

### H. Cowork toggle + room creation
- [ ] Toggle OFF → only "Start Session" button visible in "start now" option
- [ ] Toggle ON → cowork creation form appears below "When?" section
- [ ] Cowork ON + "Start session now" → no "Start Session" button in WhenSection; form handles launch
- [ ] Room name field pre-filled with a descriptive name (e.g. "Mindfulness every 15m", "25m Pomodoro + mindfulness")
- [ ] "Share prompts" checkbox visible only when Mindfulness is on
- [ ] "Generate Room Code" → room created, 6-char code shown
- [ ] "Copy" button copies code to clipboard
- [ ] "Join as Host & Start Session" → timer starts (or ScheduledStart if future)
- [ ] After generating: room appears in "+ Your coworking rooms" list on next load

### I. Coworking rooms list
- [ ] Collapsed by default (+ Your coworking rooms (N))
- [ ] Click header → expands list
- [ ] **Click room name (bold blue text)** → settings update with ALL room settings (timing, prompt interval, dismiss delay, sound, etc.), "Room loaded: [name]" indicator shows, page does NOT navigate
- [ ] Then click "Change Settings" (bottom button) → Customize opens tied to that room
- [ ] `Options ▾` dropdown: "Change Settings", "Rename", "Show code" / "Hide code", "Delete"
- [ ] "Change Settings" in dropdown: loads room settings + navigates to Customize
- [ ] **Two-row card layout (Session 31):** Row 1: state badge + room name + Options ▾. Row 2: Join button (always present)
- [ ] **Join button states:** Active or ≤5 min to start → bright green, enabled. >5 min → grayed/disabled, tooltip "You can join 5 minutes before it starts". Ended → grayed/disabled, tooltip "This session has ended"
- [ ] State badge: **"Live"** (green, Session 31), "Starts [date] at HH:mm" (indigo), "Ended [date] at HH:mm" (gray)
- [ ] Recurring rooms show `↻` icon; hovering shows tooltip "Recurring session"
- [ ] "Rename": inline rename; Enter/Save calls Firebase updateRoom; Escape cancels
- [ ] "Show code" / "Hide code": toggles code display below row
- [ ] "Delete": confirm pattern
- [ ] Clicking outside dropdown closes it
- [ ] Room order: Live first → Upcoming (soonest first) → Ended (most recent first)
- [ ] **WhenSection heading (Session 31):** "Start a solo session" when cowork toggle OFF; "Schedule a new coworking room" when ON
- [ ] **WhenSection hint (Session 31, Main.tsx only):** When room selected + toggle OFF → hint below heading

### J. Room full settings restore (new in Session 30)
- [ ] Create a room with non-default settings (e.g. 20-min work, 2-sec dismiss, custom prompt text)
- [ ] Revert app to defaults
- [ ] Click the room name → verify ALL original settings restore (work=20min, dismiss=2sec, custom prompt text)

### K. Join a Coworking Session (panel at bottom)
- [ ] "Join a Coworking Session ▼" expands at bottom of page
- [ ] Invalid code → "Room not found" error
- [ ] Valid code → room summary shown; content mode options
- [ ] "Join Session" → timer starts synced to host's start time

### L. Timer screen (cowork features)
- [ ] During a hosted session: room code toggle visible → shows/hides code
- [ ] During a guest session: room code toggle visible
- [ ] Host sees "End Session for Everyone" with confirmation dialog
- [ ] Stop button label is "Leave Session" during cowork session
- [ ] Two-tab sync test: host starts → guest joins → both timers fire at same time

### M. ScheduledStart screen
- [ ] Shows countdown to the scheduled time
- [ ] "Start Now" starts immediately
- [ ] Auto-starts when countdown reaches zero
- [ ] Cowork: if arriving here via cowork host start, timer preserves cowork context
- [ ] Page refresh while on ScheduledStart for a future cowork room → auto-rejoin restores ScheduledStart

### N. Session complete
- [ ] Stats displayed correctly after a short test session
- [ ] "Start another session" returns to main screen

### O. Summary.tsx preset/room lists (Settings Updated page)
- [ ] Preset list appears in MAIN view (not just post-save)
- [ ] Same `+`/`−` toggle, same `▶ Start` + `Options ▾` dropdown as Main
- [ ] Click preset name → settings load silently (no navigate); "Preset selected" indicator updates
- [ ] Room list appears in MAIN view
- [ ] Click room name → settings load silently (no navigate); "Room loaded" indicator updates
- [ ] After saving a preset: post-save view shows both preset list AND rooms list (collapsible)

### P. Summary.tsx cowork toggle default
- [ ] Navigate: Main → `Options ▾` on a room → "Change Settings" → make a change → "Display Changes"
- [ ] On Settings Updated: cowork toggle should be **ON by default**
- [ ] Navigate: Main → `Options ▾` on a preset → "Change Settings" → make a change → "Display Changes"
- [ ] On Settings Updated: cowork toggle should be **OFF by default**

---

## 9. ⏳ Settings storage: `localStorage` → Tauri AppData — NEXT after tests pass

Once regression tests pass:
- Migrate `mindful-prompter-v3` key from localStorage to Tauri file system API
- Then run full Tauri end-to-end test (`dev-tauri.bat`)

---

## 10. Distribution prep (before public launch)
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

### Phase 4: Paid tiers (only if Phase 3 has real users)
- Stripe payment processing
- Access tiers (e.g., team cowork, advanced features)
- **Not being designed now**
