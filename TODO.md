# Prosochai TODO

## Status: Session 32 complete — redesign v2 Phase 1 implemented, regression testing needed

**Before testing anything:** Run `dev-browser.bat` (browser) or `dev-tauri.bat` (full app).

---

## Immediate next steps

### 1. ✅ Items 1–6 all coded and tested — DONE (Sessions 16–21)
### 2. ✅ Tauri layout, images, title, icon verified — DONE (Session 22)
### 3. ✅ Settings storage: `localStorage` → Tauri AppData — DONE (Session 23)
### 4. ✅ Cowork feature: tested and working (Session 25)
### 5. ✅ Major redesign v1: implemented (Sessions 26–31)
### 6. ✅ Redesign v2 Phase 1: single-screen, edit-lock, timing/coworking in Settings — **implemented (Session 32), needs regression testing**

---

## Regression test checklist (Session 32 redesign)

Run `dev-browser.bat` and work through these in order. Fix bugs before moving on.

### A. App startup / main screen
- [ ] App opens on Main screen (only screen — no Customize, no Summary)
- [ ] Header + Prosochai tagline visible
- [ ] **Locked mode (default):** SettingsDisplay shows Pomodoro + Prosochai cards; no editable inputs visible
- [ ] Top-right shows "✎ Edit settings" toggle
- [ ] "Saved Presets" section collapsed if presets exist; hidden if none
- [ ] "Scheduled & Active Sessions" section collapsed if sessions exist; hidden if none
- [ ] "Join a Coworking Session ▼" panel at bottom (collapsed)
- [ ] Main action button: "Start Session Now" (green) when `startType === 'now'` and not coworking

### B. Edit-lock toggle
- [ ] Click "✎ Edit settings" → edit mode activates; all fields become editable inputs
- [ ] Toggle reads "✕ Done" in edit mode
- [ ] Toggle off with no changes → returns to locked mode silently
- [ ] Toggle off with unsaved changes → prompt: discard or stay in edit mode
- [ ] Sound, isCoworking, useTimedWork, useMindfulness toggles work in **both** locked and edit mode (quick-intent changes)
- [ ] Changing a toggle in locked mode automatically enters edit mode

### C. Edit mode — Pomodoro section
- [ ] Pomodoro section On/Off toggle present in edit mode
- [ ] Guard: can't turn both Pomodoro and Prosochai off simultaneously
- [ ] Fields only visible when Pomodoro is on: workMinutes, breakMinutes, sessionsPerSet
- [ ] "Multiple sets" toggle shows/hides longBreakMinutes, numberOfSets
- [ ] Combined mode: prompt interval validates it divides evenly into work period length

### D. Edit mode — Prosochai section
- [ ] Prosochai section On/Off toggle present in edit mode
- [ ] Fields only visible when Prosochai is on: promptText, promptIntervalMinutes, dismissSeconds
- [ ] `promptCount` only shown when Pomodoro is OFF (mindfulness-only mode)
- [ ] `bothMindfulnessScope` radio buttons only shown when Pomodoro is ON
- [ ] Mindfulness-only: prompt interval validates it divides evenly into 60

### E. Edit mode — Timing section (WhenSection)
- [ ] WhenSection embedded in edit mode (no Start/Schedule buttons; action button is at bottom)
- [ ] "Start now" / "Specific date & time" / "Recurring schedule" work as before
- [ ] Specific date/time: date + time inputs expand
- [ ] Recurring: day picker + time + timezone inline
- [ ] startType, startTime, startDays saved into settings (persist in presets)

### F. Edit mode — Coworking section
- [ ] `isCoworking` toggle shown
- [ ] When on: session name field + `sharePrompts` toggle visible
- [ ] When off: coworking fields hidden
- [ ] Locked fields for guests shown with "set by host" indicator (see K)

### G. Save options bar
- [ ] Appears at bottom of edit mode only when `isDirty` (changes exist)
- [ ] "Save as default" → saves to defaults storage; locked mode shows updated values
- [ ] "Save as preset…" → inline slot/name picker; saves; locked mode shows updated values
- [ ] "Save to session" → visible only when a cowork room is loaded; calls `onSaveToRoom`
- [ ] "Apply (don't save)" → commits settings without saving to storage; returns to locked mode
- [ ] No save options bar when no changes (not dirty)
- [ ] "Reset to original defaults" link visible in edit mode

### H. Main action button
- [ ] `startType: 'now'` + coworking off → green "Start Session Now"
- [ ] `startType: 'now'` + coworking on + no room loaded → green "Host Session Now"
- [ ] `startType: 'specific'` → "Schedule Session" (indigo)
- [ ] `startType: 'recurring'` → "Save Schedule" (indigo)
- [ ] Coworking on + specific/recurring → "Schedule Cowork Session"
- [ ] Guest (room loaded, lockedFields set) → "Join Session"

### I. Presets
- [ ] "Saved Presets" collapsed by default (+ N count)
- [ ] Click header to expand
- [ ] Click preset name → loads settings into Main; all fields reflect preset values (including timing + coworking)
- [ ] `▶ Start` → loads preset + immediately starts session
- [ ] `Options ▾` dropdown: "Rename", "Delete" (no "Change Settings" — that's been removed)
- [ ] "Rename": inline; Enter/Save saves; Escape cancels
- [ ] "Delete": confirm pattern
- [ ] Presets include timing + coworking fields (save in edit mode, reload and verify)
- [ ] Up to 5 presets (S1–S5)

### J. Scheduled & Active Sessions section
- [ ] Collapsed by default; hidden if no sessions and no soloSchedule
- [ ] Shows soloSchedule card if one exists (solo recurring schedule)
- [ ] Shows hosted cowork rooms that are active or upcoming only (no past sessions)
- [ ] Room cards: state badge ("Live" / "Starts…") + room name + Options ▾ + Join button
- [ ] Join button (active or ≤5 min): bright green, enabled → calls `onJoinAsHost`
- [ ] Join button (>5 min away): grayed/disabled
- [ ] Options ▾: "Rename", "Show code / Hide code", "Delete" (no "Change Settings")
- [ ] "Rename": inline Firebase updateRoom call
- [ ] "Show code": toggles code display
- [ ] "Delete": confirm pattern
- [ ] Room order: Live first → Upcoming soonest → (no ended rooms shown)
- [ ] Clicking a session card loads its settings into Main (like a preset)
- [ ] soloSchedule card: "Cancel" → confirm → removes schedule; Sessions section hides

### K. Coworking join (guest flow)
- [ ] "Join a Coworking Session ▼" expands at bottom
- [ ] Invalid code → "Room not found" error
- [ ] Valid code → "Load Session" loads host settings into Main; locked fields show "set by host" indicator
- [ ] Locked fields: Pomodoro settings + timing fields are non-editable even in edit mode
- [ ] Prosochai fields remain editable (guest can use own prompts)
- [ ] Content mode selection: "Host prompts" / "Own prompts" / "No prompts"
- [ ] Start button becomes "Join Session"
- [ ] "Join Session" → timer starts synced to host's start time
- [ ] "Join as Host" → joins the room as host

### L. Timer screen (cowork features)
- [ ] During hosted session: room code toggle visible → shows/hides code
- [ ] During guest session: room code toggle visible
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

### O. Persistent state
- [ ] Preset saves include timing and coworking fields; reload app and click preset → all fields restore
- [ ] Save as default → close/reopen app → timing + coworking load correctly
- [ ] Recurring schedule saved in Sessions section persists across page loads
- [ ] `lockedFields` is ephemeral — never appears in saved presets or defaults
- [ ] Window title reads "Prosochai" (OS title bar / taskbar)

### P. Regression: no orphan screens
- [ ] No "Customize" or "Summary/Settings Updated" screen reachable from anywhere in the app
- [ ] No "Change Settings" option in any dropdown
- [ ] App.tsx has no routing to `customize` or `settings-updated`

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
