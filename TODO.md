# MindfulPrompter TODO

## Status: Phase 1 UX complete, needs testing ⚠️

**Phase 1 feature work is done.** The UX flow has been significantly redesigned.
**Before any new work:** Always unregister the service worker (DevTools → Application →
Service Workers → Unregister) and hard-refresh (Ctrl+Shift+R). Otherwise you'll be testing stale cached code.

---

## Immediate next steps (in order)

### 1. Fix SVG icons on landing page
The current hand-drawn SVG icons are unsatisfactory. Options:
- **Recommended:** Use Lucide React or Heroicons — cleaner, consistent, maintained icon libraries
- Or: redraw from scratch with better proportions

Required icons:
- **Mindfulness Prompts**: meditation gong — large disc on a goalpost frame, small mallet beside it
- **Pomodoro Timer**: round tomato + stem/leaves + clock face (4 tick marks + 2 clock hands)
- **Both Together**: gong + "+" + tomato side by side at reduced scale, same height as singles

### 2. Keyboard accessibility
Pressing Enter on a focused element should activate it. Check:
- Landing page mode cards (Card.tsx has a basic keyDown handler — verify it works)
- Yes/No toggle buttons in Change Settings
- All other interactive buttons throughout the app

### 3. Test all three modes end-to-end
After fixing icons and keyboard nav:

**Mindfulness mode:**
- [ ] promptCount = 0 runs indefinitely until Stop
- [ ] promptCount = N stops after N prompts
- [ ] Interval validation: must divide evenly into 60 minutes
- [ ] Preset save → load round trip
- [ ] Reset to original defaults: confirmation, reverts, returns to mode page

**Pomodoro mode:**
- [ ] Single set (multipleSets=false)
- [ ] Multiple sets with long break
- [ ] Unlimited sets (numberOfSets=0) cycles until Stop

**Both Together mode:**
- [ ] Interval must fit evenly into work session (validated on button press)
- [ ] Prompts fire during work sessions at correct intervals

**Settings flow:**
- [ ] "No changes made — Start Session" goes directly to timer (skips review page)
- [ ] "Review Changes" shows Settings Updated page with correct summary
- [ ] "Save as a Preset" → slot picker → preset saved correctly
- [ ] "Save as Default" → confirmation → mode page shows updated defaults
- [ ] "Start Session (use new settings)" goes directly to timer
- [ ] "Reset to original defaults" grayed out when already on originals (tooltip shows)
- [ ] "Reset to original defaults" shows confirmation when active, reverts correctly

**General:**
- [ ] Back navigation works at every step
- [ ] Session complete screen shows correct stats
- [ ] Auto-dismiss countdown works on session complete screen

### 4. Bug fixes
Fix anything found in testing.

### 5. After testing passes → Phase 2
See SHARED.md for Phase 2 details (Tauri wrapper + blocking popup + cowork via Firebase).

---

## Completed work (all committed)

### Phase 1 features (Sessions 3–6)
- [x] Mode-specific defaults (defaultsP / defaultsM / defaultsB)
- [x] Mode-specific presets (5 slots per mode: P1-P5, M1-M5, B1-B5)
- [x] Preset save / load / rename / delete
- [x] M-mode prompt count (0=indefinite, N=stops after N)
- [x] Unlimited sets for P/B (numberOfSets=0)
- [x] M-mode interval divisibility validation (must divide 60)
- [x] Session stats tracked and displayed on completion screen
- [x] 60-second auto-dismiss on session complete screen
- [x] Service worker cache fix (bumped to v2)
- [x] Landing page: two-line tagline, tooltip links, "Choose your mode:" heading
- [x] Landing page: SVG icons (placeholder quality — needs redoing, see above)
- [x] Mode page title: mode name in indigo + "Mode" in gray
- [x] "Start Session" goes directly to timer (removed intermediate review page)
- [x] "Change Settings" (was "Customize for this session")
- [x] Settings page: 5-step wizard → single scrollable page with consistent formatting
- [x] "Reset to original defaults" in Change Settings (grayed out + tooltip / confirmation)
- [x] Dynamic bottom button: "No changes — Start Session" vs "Review Changes"
- [x] "Settings Updated" review page: summary + 3 action buttons
- [x] "Save as Default" confirmation dialog
- [x] Renamed "factory defaults" → "original defaults" throughout

---

## Important gotchas

- **Service worker cache**: Always unregister + hard-refresh before testing.
- **React strict mode**: Double-mounts in dev. Timer uses `startTimeRef` to preserve start time.
- **JavaScript falsy 0**: Don't use `||` with numeric settings (0 is a valid value).
- **Static export**: `output: 'export'` in next.config.ts — required for Tauri compatibility.
