# MindfulPrompter TODO

## Status: Session 28 complete — needs regression testing before Phase 2 resumes

**Before testing anything:** Run `dev-browser.bat` (browser) or `dev-tauri.bat` (full app).

---

## Immediate next steps

### 1. ✅ Items 1–6 all coded and tested — DONE (Sessions 16–21)
### 2. ✅ Tauri layout, images, title, icon verified — DONE (Session 22)
### 3. ✅ Settings storage: `localStorage` → Tauri AppData — DONE (Session 23)
### 4. ✅ Cowork feature: tested and working (Session 25)
### 5. ✅ Major redesign: implemented (Session 26) — needs regression testing
### 6. ✅ Scheduling redesign + cowork toggle: implemented (Session 27) — **needs regression testing**

---

## Regression test checklist (Sessions 26–27 redesign)

Run `dev-browser.bat` and work through these in order. Fix bugs before moving on.

### A. App startup / main screen
- [ ] App opens on Main screen with correct layout:
  - Header / tagline / SettingsDisplay at top
  - Presets section hidden if none saved; if presets exist, shows collapsed (▶ Saved presets (N))
  - Coworking rooms section hidden if none; if rooms exist, shows collapsed (▶ Your coworking rooms (N))
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
- [ ] Post-save view (after saving preset): preset list collapsed by default (▶ Saved presets (N))
- [ ] "Change Settings" button at bottom

### G. Presets (unified S1–S5 namespace, v3 storage)
- [ ] Save as Preset → appears on Main screen collapsed under "▶ Saved presets (N)"
- [ ] Click header to expand → preset list visible
- [ ] Load preset → settings summary updates, "Preset selected: SX — Name" shows
- [ ] Rename preset → name updates inline
- [ ] Delete preset → confirm button → removed from list
- [ ] Up to 5 presets (S1–S5)

### H. Cowork toggle + room creation
- [ ] Toggle OFF → only "Start Session" button visible in "start now" option
- [ ] Toggle ON → cowork creation form appears below "When?" section
- [ ] Cowork ON + "Start session now" → no "Start Session" button in WhenSection; form handles launch
- [ ] Room name field pre-filled with a descriptive name (e.g. "Mindfulness every 15m", "25m Pomodoro + mindfulness")
- [ ] "Share prompts" checkbox visible only when Mindfulness is on
- [ ] "Generate Room Code" → room created, 6-char code shown; timing set from current startType:
  - startType 'now' → room starts immediately
  - startType 'specific' → room has future startTime
  - startType 'recurring' → room has recurrenceRule
- [ ] "Copy" button copies code to clipboard
- [ ] "Join as Host & Start Session" → timer starts (or ScheduledStart if future)
- [ ] After generating: room appears in "▶ Your coworking rooms" list on next load
- [ ] "Make this a NEW Hosted Coworking Session" label when a room is already loaded

### I. Coworking rooms list
- [ ] Collapsed by default (▶ Your coworking rooms (N))
- [ ] Click header → expands list
- [ ] Load room settings → "Room loaded: [name]" indicator updates
- [ ] "Join as host" → timer starts
- [ ] "Show code" / "Hide code" toggle
- [ ] Delete room → "Confirm delete?" → deleted from Firebase

### J. Join a Coworking Session (panel at bottom)
- [ ] "Join a Coworking Session ▼" expands at bottom of page
- [ ] Invalid code → "Room not found" error
- [ ] Valid code → room summary shown; content mode options
- [ ] "Join Session" → timer starts synced to host's start time

### K. Timer screen (cowork features)
- [ ] During a hosted session: room code toggle visible → shows/hides code
- [ ] During a guest session: room code toggle visible
- [ ] Host sees "End Session for Everyone" with confirmation dialog
- [ ] Stop button label is "Leave Session" during cowork session
- [ ] Two-tab sync test: host starts → guest joins → both timers fire at same time

### L. ScheduledStart screen
- [ ] Shows countdown to the scheduled time
- [ ] "Start Now" starts immediately
- [ ] Auto-starts when countdown reaches zero
- [ ] Cowork: if arriving here via cowork host start, timer preserves cowork context (room code, host flag)
- [ ] Page refresh while on ScheduledStart for a future cowork room → auto-rejoin restores ScheduledStart

### M. Session complete
- [ ] Stats displayed correctly after a short test session
- [ ] "Start another session" returns to main screen

---

## 7. ⏳ Settings storage: `localStorage` → Tauri AppData — NEXT after tests pass

Once regression tests pass:
- Migrate `mindful-prompter-v3` key from localStorage to Tauri file system API
- Then run full Tauri end-to-end test (`dev-tauri.bat`)

---

## 7. Distribution prep (before public launch)
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
