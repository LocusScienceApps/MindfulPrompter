# Prosochai — Major Redesign Proposal (v2)

**Status:** Awaiting planning discussion. Do NOT implement anything here until discussed in planning mode.
**Written by:** User (wmben), session 31, 2026-03-10.

---

## (1) Core Problems Being Solved

### (A) Start settings are treated as independent from session settings
A major problem is that the "start settings" for a room, preset, and defaults are managed separately from other settings on the main and summary pages. In reality they're not independent:
- When a room starts is integral to the coworking room state
- If I set a solo session that starts at a future date, there should be a way to see and manage that future date setting — currently there isn't
- Start time settings are treated as independent from saved settings, so a preset can't include its timing settings

### (B) Coworking vs. solo is treated as independent from session settings
Whether a session is a hosted coworking room or a solo session is treated independently from the main settings:
- It's not part of the "current settings" summary
- Can't save presets that are coworking-only vs. solo-only
- This creates a bunch of remaining bugs and unintuitive behavior

### (C) Major redesign proposed
A redesign to resolve both (A) and (B) and make the app more intuitive and cleaner overall. To be discussed in planning mode after clearing the context window. Full spec below — preserve as-is for that planning discussion.

---

## (2) Proposed Changes

### (A) Timing AND coworking settings become first-class settings
Both (but separately):
- Part of what gets displayed on the main page
- Part of what gets defined when you click "Change Settings"

### (B) No more "summary" pages
Clicking any of the "Save" options below all the settings in edit mode saves and returns to main page. Main page then displays whatever settings were just created. If a preset/room was created, that section would be expanded and the newly created/edited item would be outlined, with the label at the top as it currently works when a preset is selected. Users should also be able to click to return to user-defined defaults (make sure this always displays when applicable).

### (C) No separate collapsible sections for presets vs. coworking rooms
Just a list of presets that all include both timing settings AND coworking settings (including whether it's a coworking session at all).

### (D) No separate "Change Settings" page
Make settings editable on the main landing page by toggling an "Edit current settings" toggle at the top — that just unlocks the cells so the user can type directly into value fields. Otherwise everything except the toggles could be locked. The dropdown menus in preset/saved-session cards should no longer have a "Change Settings" item.

### (E) New sections: Timing and Coworking
Directly below the "Prosochai" section (above presets). Suggested order: Timing first, then Coworking. Both should have nice image icons:
- Timing: calendar or clock icon
- Coworking: image of a group working together connected in the cloud

### (F) Coworking is toggle-able; Timing is not
- The coworking option (but NOT timing) has an on/off toggle
- Default OFF unless (a) user has changed their defaults or (b) user has clicked on a preset/saved option that is a coworking session

### (G) All toggle state changes are registered as settings changes
Toggling on/off any toggle (including sound) should register as a state change. The user gets options to save those changes as a new default, as a preset, or to run a one-off session.

### (I) Sound is now saved per preset
Sound on/off should be part of what gets saved with presets and defaults. Any toggle of sound should trigger the save options at the bottom.

### (J) No place to see/join future solo sessions — needs fixing
Currently if you set a future solo session you get a "you'll be notified" message but:
- No way to see the scheduled session to know it's even scheduled
- No way to edit or delete it if you change your mind
- Unclear if the feature even works: How are you notified? Does the app need to be running? Is there really a record of future solo sessions?

### (K) New "Saved non-preset sessions" section
Under the collapsible presets, a list of "saved sessions" (one-offs). **Questions to discuss:**

**(a)** How are saved sessions different from presets exactly? They're one-off sessions. Some active, some future, some ended. Which should be saved and how many?

**(b) Suggestion:** Save all active and future sessions. If slots available, fill with most recent past sessions.

**(c)** If user tries to create more than N max current or future sessions, pop-up warning that there are no free slots and they need to delete a previous current/future session.

**(d)** Sort order (like current rooms): active sessions first → future sessions → "recent sessions" (no longer active).

**(e) Suggested N limits:**
- 1 max active session
- 3 max future sessions
- Always show 5 most recent past sessions (with empty slots until there have been 5)

### (L) Backend settings management tool for app owner (me, not users)
**(a)** I should be able to change:
- Factory mindfulness prompt for new users (and what gets restored when users reset to original defaults)
- ALL factory defaults, including defaults users cannot change (max presets, max of each type of saved session)
- For testing: allow 2 current sessions (not presets) even though user default will be 1

**(b)** Design with tiers in mind for future stages even if not implementing now:
- Mechanism for distinct limits per tier: number of hosted coworking sessions, number of each kind of one-off saved session, number of presets

### (M) Tricky cases when clicking on presets / saved non-presets
**(a) Room code reactivation:** Could expired room codes be reactivated when timing settings are updated? Or does this create security issues?

**(b) Smart date/time updating when clicking on a saved session:**
- (i) If originally "start now": retain "start now" option as selected
- (ii) If originally for a specific date (one-time or repeating): select that option instead
- (iii) DATE field replaced with *today's* date, highlighted to show it was auto-updated
- (iv) TIME field retains the original time (e.g., 9:00)
- (v) Recurring days of week are retained

User asks Claude to push back if there's a better approach.

### (N) Preset auto-sort/organization
Different from saved non-presets:
**(a)** Top-level sort: solo vs. coworking session
**(b)** 2nd-level sort within each: session state — (i) set to start immediately; (ii) set to start at future date
**(c)** 3rd-level: Prosochai and/or Pomodoro mode — (i) Prosochai only; (ii) Pomodoro only; (iii) both
**(d)** App owner backend to change these defaults
**(e)** Future (note only): "change sort order" gear for users to customize sort order — saves to their defaults, resets if user resets defaults. Note: consider whether this impacts current design choices.

### (O) Timing section details
**(a)** No toggle (unlike coworking). Default/top option is "start immediately after saving" — but this would NOT be green and would NOT be activated there. It's just a settings selection. Activation happens at the bottom of the screen after all settings and collapsed presets/saved sessions.
**(b)** Below "start now" option: other two start options (specific future date, or repeating weekly schedule)

### (P) Edit toggle replaces separate edit page
"Edit current settings" toggle at top of main page unlocks all value fields. All settings changes made on the main page. No separate edit/change settings page.

### (Q) Default time settings and date handling
Default timing cannot include a specific *date* (dates are fixed). But defaults can be set for a certain time of day or recurring pattern:
- If one-time future time: would start Today at that time
- If recurring days: would start on first day of the recurring pattern

Users should be able to save any settings different from existing defaults. If that setting has a timing setting, they should get a notice that the saved default will always assume "today" (Claude to help with exact English phrasing).

### (R) Buttons at the bottom — full logic

**Ra. No changes from defaults:**
- If timing default is "start now" OR within 5 min: green "Start Now" / "Join Now"
- If timing default is for a future time >5 min: slightly grayed version with warning popup asking if user really wants to override and start now (default response: do NOT override)

**Rb. Changes made to defaults (any change including sound toggle):**
- (i) Timing = "Start Now": first button = green "Start Now"
- (ii) Timing = ≤5 min from now: first button = green "Join Now"
- (iii) Timing = future >5 min: grayed "Start Now" still exists, warning popup about overriding timing
- (iv) Save options appear (only when settings differ from defaults):
  - First: "Save for upcoming session" — saves current settings as new "current settings" (survives app close)
  - (v) If timing ≠ "start now": also saves to "future sessions" in saved non-presets
  - (vi) "Save as a preset" — preset saving popup, but date becomes [today]; closing and reopening app restores defaults (not this preset)
  - (vii) "Save as Default" — with existing warning about overwriting defaults, plus text clarifying original defaults can be restored

**Rc. User clicked a saved preset or saved non-preset (no changes):**
- Same options as Rb except:
  - If preset is already saved as preset: don't show "Save as preset" option
  - "Start Now" for sessions set to start immediately (green) OR future >5min (grayed with warning)
  - "Join Now" for sessions starting ≤5 min
  - "Save for Upcoming Session" is default for future sessions (indigo/non-green)
  - "Save as New Default" still available

**Rd. Clicked saved non-preset AND THEN changed it:**
Same as Rc.

**Re. Clicked saved preset AND THEN changed it:**
- Default save option: "Save changes to [preset name]" (save over existing preset) — same as current behavior
- All other options from Rc also available

**Rf. Future coworking session saved:**
Generated key should be displayed. That key should also always be in the saved non-preset section (replaces current coworking rooms section).

### (S) Starting/joining launches in a separate window
If possible, starting/joining a session launches in a separate window (desktop app) or separate tab (web app), so the main page is always accessible separately from the active session.

### (T) Changes-from-defaults indicators

**Ta.** If current settings differ from user-defined defaults in any way:
- Link-like button at BOTH top and bottom of page to restore default view (friendly language, not alarming — just undoing unsaved changes)
- Applies even if the only change was toggling sound

**Tb.** If user-defined defaults differ from original app defaults:
- Link button (less prominent, single location) to restore original app defaults
- With warning that this overwrites all user-defined defaults
- Consider if current placement is best or if there's a better place/format

### (U) "Start Now" button on cards has same warning
The "Start Now" button in preset/saved-session cards should have the same warning for sessions >5 min in the future (rather than just blocking it): warning that this overrides the settings, asking if user really wants to do it.

### (V) Starting a future session overrides the saved non-preset
If a future saved non-preset is "started now" (overriding timing), that session gets updated to reflect its new active state (so a session scheduled for tomorrow but started now would show as active in the saved non-preset cards).

### (W) Changing solo ↔ coworking during an active session
- From inside an active solo session: button to "Make this a Coworking session" → generates room code in-session to share
- From inside a hosted coworking session: button to change to unshared/private → warning that this kicks all guests out

### (X) Joining a Coworking Session — major redesign

**Xa. Current guest flow problem:**
After entering code and clicking "Look Up", guests get impoverished view + choice to use own or host settings. All-or-none choice; "own" settings forces use of their default Prosochai settings.

**Xb. Current host flow problem:**
App recognizes the host, gives different view. No option to customize personal settings while hosting. Host joins with the settings shared with everyone, even if they want a different personal experience.

**Xc. Proposed new flow:**
- (i) Rename "Look Up" → "Load Session"
- (ii) Pressing "Load Session" updates the Main Page settings with host's defined settings as "current settings" — exactly like clicking a preset
- Host's shared Prosochai settings displayed in Prosochai section if they were shared; guest's default Prosochai if not (collapsed by default if that's their preference)

**Xd. After loading:**
User can change settings that only affect them: sound and Prosochai settings (NOT Pomodoro settings or start time settings). Any changes get the main option "Save changes to the coworking session" → then get joining options; session added to their saved non-preset list. Parallel to how changing a preset triggers "Save changes to the preset."

**Xe. Warnings when trying to change shared settings (Pomodoro or start timing):**
- (i) GUESTS: warning that changing those settings won't affect the loaded coworking session (can still change for their own presets/defaults). Must confirm to make changes.
- (ii) HOSTS (session already in progress): same warning as guests — can't change those settings mid-session
- (iii) HOSTS (session NOT yet started): warning that changing Pomodoro/start time will change everyone's experience; option to cancel or confirm

**Xf. At save time ("Save changes to the coworking session"), for changes to Prosochai or sound only:**
- (i) GUESTS: warning that this changes sound/Prosochai just for themselves; cancel or confirm
- (ii) HOSTS (session in progress): same options as guests
- (iii) HOSTS (session NOT started): option to change for all guests, or just for themselves

**Xf (duplicate letter from user — for changes to Pomodoro/timing):**
- (i) GUESTS: strong warning — not a host, cannot change those settings for the coworking session. Only option: close warning and return to main. Other save options still available for non-coworking changes. Should be a way to reload the room state (maybe next to "Load Session" button when changes have been made).
- (ii) HOSTS (session in progress): same warning — can't change even as host. Only option: close warning; restore those settings or choose a different save option.
- (iii) HOSTS (session not started): warning about changing for everyone, default = cancel, additional option to change room settings for everyone.

**Xg. No warnings when changing non-shared settings (Prosochai or sound).**

**Xg (duplicate letter from user):** Did I miss anything? [Note for Claude to answer in planning discussion]

### (Y) Minor issues

**(a) Terminology:** "Rooms" → get rid of "room" terminology throughout. Coworking sessions are sessions, not rooms. Private sessions are also sessions.

**(b) Copy button feedback:** Currently nothing visible happens when "Copy" is clicked even though the code IS copied. Need visual feedback (e.g., button changes state, "Copied!" text, camera-click animation). Research best practice.

**(c) Tauri window title still says "MindfulPrompter":** The upper-left window title (native OS title bar in Tauri) still reads "MindfulPrompter" — must be changed to "Prosochai". Likely in `src-tauri/tauri.conf.json`.

### (Z) Reminder
Do not make any of these changes until:
1. Current session changes are committed and pushed
2. Context window is cleared
3. Planning discussion happens in the next session

---

## Questions to resolve in planning discussion

1. Best name for "saved non-preset sessions" — "one-off sessions"? "Saved sessions"? Something else?
2. Can expired room codes be reactivated (security implications)?
3. Better smart date/time approach than what's proposed in (M)?
4. Sort order customization (N-e) — does this affect any current design decisions?
5. "Start Now" warning language for sessions scheduled >5 min in future
6. Language for "saved default will assume today" notice (Q)
7. "Change sort order" gear — future feature only or impacts current design?
8. Response to Xg: did user miss anything in the coworking join redesign?
9. Backend admin tool: web-based? Hidden route? Separate build?
