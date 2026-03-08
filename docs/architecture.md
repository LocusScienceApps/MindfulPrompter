# MindfulPrompter — Architecture & Strategy

## Why Tauri (not Electron, not pure web)

- **Why not pure web app:** Browsers cannot force popups over other windows. A browser tab can't interrupt your work — this is the entire problem the app solves.
- **Why Tauri over Electron:** ~5MB installer vs ~150MB. Better for a commercial product.
- **Development workflow:** Build and test as a normal web app in Chrome. Two Tauri-specific integration points are small and targeted (see below).
- **Mac:** Tauri is cross-platform. Building for Mac requires a Mac or GitHub Actions CI/CD — set that up before release.

## The Two Tauri-Specific Integration Points

Everything is normal web code EXCEPT:
1. **Popup window** — Rust creates a native window with `always_on_top: true, fullscreen: true`. Shows HTML from `src/app/popup/page.tsx`.
2. **Settings file storage** — Tauri file API reads/writes `config.json` to AppData. (localStorage during web dev only.)

## Static Export Requirement

`output: 'export'` in `next.config.ts` — required for Tauri compatibility. No API routes, no server-side data fetching.

## Settings Storage Strategy

- Local AppData file via Tauri file API (survives reinstalls — same as VS Code, Slack)
- localStorage used ONLY during web dev phase; switch to Tauri file API in Phase 2
- Export/Import settings buttons planned for user backup to Dropbox etc.
- Current localStorage key: `mindful-prompter-v3` (v2 data auto-wiped on first load)

## Anonymous Install IDs

- On first launch, generate a UUID and store it in Tauri AppData
- Sent automatically when connecting to Firebase for cowork (no login needed)
- Gives: unique install count, cowork usage frequency, retention data
- GDPR-friendly — no personal data; disclose in privacy policy
- Foundation for traction data before spending on code signing

## Phase 3: Optional Accounts (only if there's traction)

- Firebase Auth: optional "Create account to sync across devices"
- Anonymous UUID migrates to account on creation — no data loss
- Everything stays free; nothing gated
- Do NOT build until UUID analytics shows real usage

## Phase 4: Paid Tiers (post-traction only)

- Stripe integration for payment processing
- Planned tier features: more presets/rooms, private group rooms (invite-only)
- Do NOT design now — Firebase/Firestore foundation keeps the path open

## Distribution & Code Signing

**The code signing problem:** Without signing, Windows shows SmartScreen block; Mac shows "unidentified developer."
- Windows: ~$300–500/yr OV certificate, OR use Microsoft Store (free cert, review process)
- Mac: Apple Developer Program, $99/yr — required for notarization

**Getting traction without spending first:**
1. Share with tech-adjacent people (can bypass warning)
2. Microsoft Store — free submission
3. Web version on Vercel (loses forced popup but validates concept)
4. UUID analytics from cowork shows real usage data

| Milestone | Needed | Cost |
|-----------|--------|------|
| You test full app | `dev-tauri.bat` | Free |
| Share with tech friends (unsigned) | Build unsigned installer | Free |
| General public (Windows) | Code signing OR Microsoft Store | $0–$500/yr |
| General public (Mac) | Apple Developer + GitHub Actions | $99/yr |

## Build Plan (4 Phases)

### Phase 1 ✅ COMPLETE (Sessions 1–21)
Update web app to match batch file feature set.

### Phase 2 🔄 IN PROGRESS (Sessions 22–30)
- ✅ Tauri wrapper + blocking native popup window
- ✅ Window icon, layout, images verified in Tauri
- ✅ Firebase: cowork rooms, host/guest flows, recurring sessions, host-rooms index
- ✅ Major redesign: unified settings model (useTimedWork + useMindfulness), v3 storage
- ✅ Scheduling UX: WhenSection, inline cowork toggle, recurring solo schedule
- ✅ Row redesign: dropdowns, badges, room sort, rename, smart join button
- ✅ Session 30: click-to-load for presets/rooms, full hostSettings saved in rooms, Options ▾ button
- ☐ Full regression test (TODO.md sections A–V)
- ☐ Settings storage: localStorage → Tauri AppData (after tests pass)
- ☐ Test on Windows Tauri. Set up GitHub Actions for Mac builds.

### Phase 3 (optional, post-traction)
Firebase Auth, free accounts, cross-device settings sync.

### Phase 4 (long-term, if Phase 3 succeeds)
Stripe, paid tiers, team cowork, advanced features.

## Cowork Architecture

- **Sync the clock, not the timer.** Firebase stores `startTime` (Unix ms). Each client runs `computeSchedule()` locally and computes `elapsed = now - startTime`. Session runs without host being present.
- **Two sharing layers.** Timing always shared. Content (mindfulness prompts) is guest's choice: pomodoro-only / own prompts / host's prompts (if shared).
- **Recurring sessions.** `RecurrenceRule` (days + time + timezone + duration). Clients compute occurrence locally — no Cloud Functions.
- **Late join.** `firedSet` pre-populated with past events on Timer mount.
- **Room codes.** 6-char alphanumeric (unambiguous charset). Host gets up to 5 saved rooms.
- **`hostSettings`** (added Session 30): full `Settings` snapshot saved in every room, restoring ALL host settings (timing, prompts, dismissSeconds, etc.) on room load. Legacy rooms fall back to timing-overlay behavior.
