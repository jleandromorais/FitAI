---
target: Dashboard (app/(dashboard)/page.tsx)
total_score: 38
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
timestamp: 2026-08-07T14-58-22Z
slug: frontend-app-dashboard-page-tsx
---
Method: dual-agent (A: general-purpose design review, verification-weighted · B: general-purpose detector/browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Loading spinner (`aria-live="polite"`), distinct error/empty/loaded states, stat numbers now reliably reflect live data — no more silent freeze. |
| 2 | Match System / Real World | 4 | pt-BR greeting by time of day, natural gym-register copy throughout. |
| 3 | User Control and Freedom | 4 | Explicit retry on fetch error, clear escape links. |
| 4 | Consistency and Standards | 4 | Tokens and HUD-corner rules applied exactly per DESIGN.md's "Regra do Painel Único" and "Regra da Honestidade do Painel." |
| 5 | Error Prevention | 4 | Fetch-failed vs. genuinely-empty deliberately distinguished, documented in code. |
| 6 | Recognition Rather Than Recall | 4 | Icon+label pairing throughout, PR list shows names not just deltas. |
| 7 | Flexibility and Efficiency | 3 | No density/customization for a power user; acceptable for a read-mostly dashboard. |
| 8 | Aesthetic and Minimalist Design | 4 | Flat surfaces, single accent, restrained "live" vocabulary. |
| 9 | Error Recovery | 4 | Curated pt-BR error copy in UI; raw error only in console. |
| 10 | Help and Documentation | 3 | No inline help/tooltips; low necessity here, minor gap. |
| **Total** | | **38/40** | **Excellent** |

## Bug Verification Verdict

**Fixed, cleanly.** Assessment A read the full current `useCountUp.ts` and traced all 4 call sites in `page.tsx`. The skip path (`shouldSkip` true — every session revisit, or any `prefers-reduced-motion` user) now returns `{ value: target, done: true }` computed directly from the live `target` argument on every render, never from stored `useState`. No staleness window exists. This is structurally reinforced by the page's own architecture: the stat cards only render after `loading` is false and `workouts.length > 0`, so by the time `shouldSkip` users see any number, `target` is already real data — belt and suspenders.

The `done`-reset fix (moving `setDone(false)` inside the `setTimeout` callback rather than synchronously at the top of the effect) correctly resolves the earlier `react-hooks/set-state-in-effect` lint violation, and Assessment A traced through the one remaining transition window (up to `delayMs` where a re-triggered animation briefly shows the previous cycle's value if `target` changes after settling) and confirmed it's cosmetic only — never incorrect data, just an occasional brief re-count if two data sources (`useWorkouts` vs `useProgress`) resolve at different times.

No Rules of Hooks issues, no infinite loops; dependency array is correct and complete.

**Deterministic scan:** Clean on both files (`page.tsx`, `useCountUp.ts`), and this round Assessment B additionally proved the detector is genuinely active (not silently broken) by scanning the parent directory and getting 6 real findings in sibling files (`ai-gen/page.tsx`, `treinos/[id]/page.tsx`, `globals.css`) — confirming the zero-finding result on the dashboard files is real, not a tool failure.

**Visual overlays:** Still unavailable — no browser automation tool in this session, consistent with every prior round.

## Cognitive Load

All 8 checklist items pass. One minor scannability note: the right column mixes three differently-styled cards (plain / HUD+gain / plain) in one stack — a deliberate trade-off of the "reserve HUD for genuinely live data" rule, not an oversight, and Assessment A explicitly did not treat it as a defect.

## Strengths

1. The fix follows the right general pattern for this bug class — "compute live from source on every render" instead of "store in state and hope it stays fresh" — and the code comment explains *why*, not just *what*, which matters for whoever touches this hook next.
2. Reduced-motion protection is now genuinely defense-in-depth: the JS-level `shouldSkip` path is correct, *and* `globals.css`'s `@media (prefers-reduced-motion: reduce)` block independently kills the pulse/glow/anim-up classes — two independent layers protecting the same persona (Sam), the one who originally triggered this bug on every single visit.
3. The loading-gate architecture (`if (loading) return <spinner>`) means the fixed hook's correctness is almost redundant for the worst case — the surrounding page structure prevents a fetch-pending value from ever painting in the first place.

## Priority Issues

**None found at P0-P2.** The fix holds up under adversarial reading of the diff, dependency arrays, and the render-gating architecture around it.

One P3, explicitly not recommended for action: the up-to-`delayMs` transition window (§ Bug Verification Verdict) is cosmetic only and tightening it would reintroduce the exact `set-state-in-effect` lint violation this round just resolved — leave as-is.

## Persona Red Flags

**Alex (power user):** No red flags from this fix. Pre-existing, unrelated micro-quirk: if `useProgress()` resolves after the initial workouts-derived render, a stat could briefly re-animate a few hundred ms after the page looks settled — unlikely to be noticed.

**Sam (reduced motion — the persona that triggered the original bug):** Directly verified clean on both the first visit and every revisit. No freeze-at-zero is reachable anymore.

**Jordan (first-timer):** Unaffected either way — the empty-state branch returns before the stat-card JSX exists.

## Minor Observations

- `shouldSkip`'s lazy initializer is mount-time-only; won't react to a live OS accessibility-setting toggle mid-session. Theoretical, not practical.
- `avgCount` is the one derived (non-raw) stat of the four — animated as a float, then rounded for display. Working as intended.

## Questions to Consider

1. Given the loading-gate already guarantees `target` is real data by the time any stat card paints, is the skip/animate duality in `useCountUp` still earning its complexity, or would "animate only if not skipping, otherwise just render `{target}`" have been equally safe with less to audit?
2. Is there a unit test worth adding — e.g. asserting `useCountUp(0, {skip:true})` followed by a target-prop change immediately reflects the new value — so this exact bug class can't quietly return in a future refactor?
