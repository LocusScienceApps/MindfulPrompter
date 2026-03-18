# Prosochai TODO

## Status: Session 38 complete — Redesign v2 Stage 1: unified always-editable view (edit-lock removed); regression testing still needed

**Before testing anything:** Run `dev-browser.bat` (browser) or `dev-tauri.bat` (full app).

---

## Immediate next steps

### 1. ✅ Items 1–6 all coded and tested — DONE (Sessions 16–21)
### 2. ✅ Tauri layout, images, title, icon verified — DONE (Session 22)
### 3. ✅ Settings storage: `localStorage` → Tauri AppData — DONE (Session 23)
### 4. ✅ Cowork feature: tested and working (Session 25)
### 5. ✅ Major redesign v1: implemented (Sessions 26–31)
### 6. ✅ Redesign v2 Phase 1: single-screen, edit-lock, timing/coworking in Settings — **implemented (Session 32), needs regression testing**
### 7. ✅ Session 33: tooltip fixes + "Why Prosochai?" modal + tauri-plugin-opener for external links — **implemented**
### 8. ✅ Sessions 34–35: Wikipedia links in Key Terms, edit mode card headers, discard/save-default confirmations, solo schedule click fix + settings snapshot — **implemented**
### 9. ✅ Session 36: Sessions section overhaul — Solo/Coworking subsections, up to 5 solo schedules, locale-aware formatting (`formatLocale.ts`), solo card Options dropdown (Rename/Delete), startup auto-launch bug fix — **implemented**
### 10. ✅ Session 37: UI fixes, Settings modal (⚙ gear → "Restore software defaults"), Why Prosochai text revisions — **implemented**
### 11. ✅ Session 38: Redesign v2 Stage 1 — unified always-editable view; edit-lock toggle + SettingsDisplay removed; all fields always shown as editable form; all changes pending until saved/started — **implemented**

---

## Regression test checklist (Session 32 redesign)

Run `dev-browser.bat` and work through these in order. Fix bugs before moving on.

### A. App startup / main screen
- [ ] App opens on Main screen (only screen — no Customize, no Summary)
- [ ] Header + Prosochai tagline visible
- [ ] **Full editable form always shown** — no locked/display mode; all fields immediately editable
- [ ] No "Edit settings" toggle visible
- [ ] Sound card at top; WhenSection visible; Coworking section visible
- [ ] "Saved Presets" section collapsed if presets exist; hidden if none
- [ ] "Scheduled & Active Sessions" section collapsed if sessions exist; hidden if none
- [ ] "Join a Coworking Session ▼" panel at bottom (collapsed)
- [ ] Main action button: "Start Session Now" (green) when `startType === 'now'` and not coworking
- [ ] "Restore defaults" link in top bar only appears when pending settings differ from saved defaults; hidden when they match

### B. Settings always-editable behavior
- [ ] All fields editable immediately without any toggle
- [ ] Changing any field marks settings as pending (save options bar appears)
- [ ] Loading a preset loads settings into the editable form (does not auto-start or auto-save)
- [ ] Loading a session card loads settings into the editable form
- [ ] "Restore defaults" in top bar loads defaults into editable form (pending state)
- [ ] After restoring defaults, "Restore defaults" button disappears (pending now matches defaults)

### C. Pomodoro section
- [ ] Pomodoro section On/Off toggle present in edit mode
- [ ] Guard: can't turn both Pomodoro and Prosochai off simultaneously
- [ ] Fields only visible when Pomodoro is on: workMinutes, breakMinutes, sessionsPerSet
- [ ] "Multiple sets" toggle shows/hides longBreakMinutes, numberOfSets
- [ ] Combined mode: prompt interval validates it divides evenly into work period length

### D. Prosochai section
- [ ] Prosochai section On/Off toggle present in edit mode
- [ ] Fields only visible when Prosochai is on: promptText, promptIntervalMinutes, dismissSeconds
- [ ] `promptCount` only shown when Pomodoro is OFF (mindfulness-only mode)
- [ ] `bothMindfulnessScope` radio buttons only shown when Pomodoro is ON
- [ ] Mindfulness-only: prompt interval validates it divides evenly into 60

### E. Timing section (WhenSection)
- [ ] WhenSection embedded in edit mode (no Start/Schedule buttons; action button is at bottom)
- [ ] "Start now" / "Specific date & time" / "Recurring schedule" work as before
- [ ] Specific date/time: date + time inputs expand
- [ ] Recurring: day picker + time + timezone inline
- [ ] startType, startTime, startDays saved into settings (persist in presets)

### F. Coworking section
- [ ] `isCoworking` toggle shown
- [ ] When on: session name field + `sharePrompts` toggle visible
- [ ] When off: coworking fields hidden
- [ ] Locked fields for guests shown with "set by host" indicator (see K)

### G. Save options bar
- [ ] Appears whenever pending settings differ from committed settings (`isDirty`)
- [ ] "For next session" → commits settings without saving to storage (no longer "Apply (don't save)")
- [ ] "As preset…" → inline slot/name picker; saves
- [ ] "Save to session" → visible only when a cowork room is loaded; calls `onSaveToRoom`
- [ ] "As default" → saves to defaults storage; "Restore defaults" button disappears if pending now matches
- [ ] No save options bar when pending matches committed (not dirty)
- [ ] ⚠ Save/Start button area has known issues — full redesign planned as Stage 3

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
- [ ] Collapsed by default; hidden if no sessions
- [ ] Two collapsible subsections: "Solo" and "Coworking"
- [ ] **Solo subsection:** shows up to 5 solo session cards (specific-date or recurring)
- [ ] Solo cards: timing badge on left (e.g. "Mar 14 at 4:30 PM" or "Every Mon & Tue at 09:00") + name + Options ▾
- [ ] Solo Options ▾: "Rename", "Delete" (confirm pattern)
- [ ] Solo rename: pre-fills current display name; Enter/Save saves; Escape cancels
- [ ] Solo cap: scheduling a 6th shows an error, does not add
- [ ] Clicking a solo card loads its saved settings snapshot into Main
- [ ] **Coworking subsection:** shows hosted cowork rooms that are active or upcoming only
- [ ] Room cards: state badge ("Live" / "Starts…" or recurrence pattern for recurring) + room name + Options ▾
- [ ] Options ▾: "Rename", "Show code / Hide code", "Delete" (no "Change Settings", no "Join")
- [ ] "Rename": inline Firebase updateRoom call
- [ ] "Show code": toggles code display
- [ ] "Delete": confirm pattern
- [ ] Room order: Live first → Upcoming soonest → (no ended rooms shown)
- [ ] Clicking a cowork card loads its settings into Main
- [ ] Recurring cowork badge shows "Every Mon & Wed at 09:00 ↻" (not next-occurrence date)
- [ ] Locale-aware time formatting: 12h on 12h systems, 24h on 24h systems

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

## 9. ⏳ Redesign v2 Stage 2: Combine Presets + Sessions into one card

Currently "Saved Presets" and "Scheduled & Active Sessions" are two separate collapsible cards. Plan: merge into a single card with collapsible subsections (Presets, Solo, Coworking).

## 10. ⏳ Redesign v2 Stage 3: Start/Save button area redesign

Replace the current separate save-options bar + main action button with a single unified card at bottom containing context-sensitive buttons. Buttons shown depend on: whether changes are pending, what template is loaded (default/preset/active session), and start type (now/specific/recurring). Issues with current button states to be fixed as part of this redesign.

**Button placement:** below the Presets/Sessions card, above the "Join a Coworking Session" link.

**Known issue with current buttons:** Several label/activation cases are wrong or buggy — do not attempt to fix individually; address holistically in Stage 3.

**Known issue: start dates in presets/defaults:** When saving with `startType === 'specific'`, user should be warned that the date cannot be saved (only the time), and it should silently convert to `startType: 'now'` or strip the date. Currently does not happen correctly.

---

## 10. ⏳ Settings storage: `localStorage` → Tauri AppData — NEXT after tests pass

Once regression tests pass:
- Migrate `mindful-prompter-v3` key from localStorage to Tauri file system API
- Then run full Tauri end-to-end test (`dev-tauri.bat`)

---

## 11. Distribution prep (before public launch)
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
