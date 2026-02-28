# MindfulPrompter TODO

## Status: Timer is broken — considering restart

The Next.js PWA approach has a persistent timer bug: even after replacing the
Web Worker with setInterval, the timer screen stays stuck on "Starting... 0:00".
The code changes are correct and the build passes, but something in the
Next.js dev environment (React Strict Mode double-invoke, hydration, or
service worker interference) is preventing the interval from ticking in the browser.

**User preference: May want to start fresh with a simpler stack.**

---

## Option A: Fix the current app

Diagnosis steps before giving up:
1. Open browser DevTools → Console — are there any JS errors when the timer starts?
2. Open DevTools → Application → Service Workers — unregister the SW, then hard-refresh
3. Try running `npm run build && npx serve out` (production build, no dev server quirks)
4. Check if React Strict Mode is the culprit: in `next.config.ts`, temporarily add
   `reactStrictMode: false` and test

If the issue is React Strict Mode double-invoking the useEffect:
- The setInterval starts, then the cleanup runs (clearInterval), then it starts again
- The `startTimeRef` is stable across remounts (set at component definition, not in effect)
- BUT `firedSet` is recreated on each effect run — this is fine
- The double-invoke should result in TWO intervals briefly, then one — which would cause
  double-fires but NOT a stuck timer
- **Most likely fix**: wrap the timer useEffect in a ref guard so it only runs once ever

```typescript
const timerStartedRef = useRef(false);
useEffect(() => {
  if (timerStartedRef.current) return;
  timerStartedRef.current = true;
  // ... rest of effect
}, []);
```

---

## Option B: Start fresh with a simpler stack

Simpler stacks that avoid the Next.js/SSR/hydration complexity:
- **Vite + React** (no SSR, no service worker by default, pure client-side)
- **Plain HTML/JS** (no framework at all — just index.html + vanilla JS)

The batch file's logic is simple enough that a plain HTML/JS approach would work well
and be much easier to debug. Tauri can wrap any web page.

---

## Code Changes Already Done (committed this session)

All of these are in git. The logic is correct — just the timer display is broken:

| Feature | Status |
|---------|--------|
| Timer: setInterval replaces Web Worker | Done — but still not ticking in browser |
| SW cache bumped v1→v2 | Done |
| M-mode prompt count (promptCount field) | Done |
| Unlimited sets (numberOfSets=0) for P/B | Done |
| Preset rename + delete | Done |
| Factory reset defaults | Done |
| Build passes | Yes |

---

## If Starting Fresh

Key things to preserve from the current codebase:
- `src/lib/schedule.ts` — the schedule computation logic is solid
- `src/lib/defaults.ts` — mode defaults and generatePresetName are solid
- `src/lib/storage.ts` — localStorage structure is solid (key: `mindful-prompter-v2`)
- `src/lib/types.ts` — the type definitions are complete
- `src/lib/format.ts`, `src/lib/sound.ts`, `src/lib/validation.ts` — all reusable
- The overall UX flow: Mode Select → Defaults Review → Customize → Summary → Timer → Session Complete
- All the settings (work/break/sessions/sets/prompt/interval/dismiss/sound)

What to rebuild simpler:
- No Next.js — use Vite or plain HTML
- No service worker (not needed for desktop Tauri app)
- No React Strict Mode double-invoke issues
- Timer as a simple setInterval in a vanilla JS or simple React component
