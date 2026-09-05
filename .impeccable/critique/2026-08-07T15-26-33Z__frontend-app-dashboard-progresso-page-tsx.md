---
target: Progresso (app/(dashboard)/progresso/page.tsx)
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-07T15-26-33Z
slug: frontend-app-dashboard-progresso-page-tsx
---
Method: dual-agent (A: general-purpose design review · B: general-purpose detector/browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading spinner has no text/aria-live; tab active state and delta signage are otherwise clear. |
| 2 | Match System / Real World | 3 | pt-BR gym vocabulary is solid; "PC" (bodyweight abbreviation) is unexplained jargon. |
| 3 | User Control and Freedom | 2 | No date-range control (`useSessions` hardcoded to 90 days), no sort/filter anywhere on this page. |
| 4 | Consistency and Standards | 2 | PR/delta color uses `--accent` instead of `--gain` throughout, contradicting the Dashboard's own PR card and DESIGN.md's named color rule for the exact same underlying data. |
| 5 | Error Prevention | 3 | Read-only page, low input risk; retry button on error state works. |
| 6 | Recognition Rather Than Recall | 3 | Current/previous/delta always shown together — no need to remember prior values. |
| 7 | Flexibility and Efficiency | 2 | Exercise switcher has no search/filter/grouping for users with many exercises. |
| 8 | Aesthetic and Minimalist Design | 3 | Clean and on-system, but the top-level 3-stat row duplicates the Volume tab's own 4-card row. |
| 9 | Error Recovery | 2 | Error copy tells the end user to "restart the backend" — dev-facing language in user-facing copy. |
| 10 | Help and Documentation | 2 | No tooltip/explanation for "PC," delta, or how muscle-group volume is derived. |
| **Total** | | **25/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment:** Grounded in FitAI's type system and card vocabulary — this isn't a generic template. But it fails the harder test of PRODUCT.md's own principle, "track truth, not vibes," within a single file. `useProgressStats.ts`'s `buildLoadHistory()` explicitly refuses to interpolate a fake trend line between two real data points, with a comment explaining why fabricating intermediate points would be dishonest — the clearest expression of the product's honesty principle anywhere in the codebase. Sixty lines later in the same file, `muscleBreakdown` and `topExercisesByVolume` compute volume as `currentWeight * 10 * totalSets` — a hardcoded "assume 10 reps" fabrication with no relationship to what the user actually logged. And the page's own Recordes (Records) tab colors personal records in brand orange instead of the reserved `--gain` green, directly contradicting DESIGN.md's "A Regra do Verde-Sinal" — while the Dashboard's PR card, built from the *same underlying data*, already gets this right. This reads as a page built with the right system components before that system's own rules were checked against it.

**Deterministic scan:** Clean — exit 0, zero findings, verified three ways (`--no-config`, `--no-advisory`, independent PowerShell re-run) plus a cross-check against the Dashboard page to confirm consistent engine behavior. As with every prior round, this reflects the detector's page-level analyzers not running on non-HTML `.tsx` component source, not an absence of issues — every issue below is semantic/product-level, invisible to pattern matching.

**Visual overlays:** Not available — no browser automation tool in this session, consistent with every prior round.

## Overall Impression

The page's honest-comparison mechanics (current/previous/delta shown together, refusal to fake intermediate trend points) are genuinely well-built. What's missing is a pass checking this page against the design system's own rules and against its sibling screen (Dashboard) that already solved the same problems: the PR color, the false-empty state for first-time users, and keyboard access to the core interaction (the exercise switcher) are the three things worth fixing first.

## What's Working

1. **Honest two-point load history** — the code explicitly refuses to interpolate a fake trend between the only two real points it has, with a comment stating why. The single clearest expression of "track truth, not vibes" in the reviewed code.
2. **Current/Previous/Ganho triptych** — restates the chart's core comparison as three plain stat cards, so the takeaway doesn't depend on correctly reading an SVG. Reduces working-memory load rather than adding to it.
3. **Consistent empty/error/loading vocabulary** — shares the same icon/card/CTA pattern across all three tabs' empty states, so "no data" feels like one system, not three separately-built screens.

## Priority Issues

**[P1] Personal records use the wrong semantic color, contradicting the design system and the Dashboard itself**
- **Why it matters:** RecordesTab and the delta-color helper render PRs and positive load deltas in orange (`--accent`). DESIGN.md's "A Regra do Verde-Sinal" reserves green (`--gain`) for exactly this — "recorde pessoal" is named explicitly. The Dashboard's PR card already does this correctly on the same underlying data — this page disagrees with its own sibling.
- **Fix:** Swap `--accent`/`--accent-soft` for `--gain`/`--gain-soft` throughout the Records tab and the delta-color helper's positive branch; apply the same `card-gain` + `HudCorners` treatment the Dashboard's PR card uses (genuinely computed real data, so it doesn't violate the panel-honesty rule).
- **Suggested command:** `/impeccable colorize`

**[P1] First-workout users are told they have "no data" while real totals already exist**
- **Why it matters:** The page-level empty state gates on `exercises.some(e => e.prevWeight > 0)` — true only once an exercise has been run *twice*. After exactly one workout, a real user with real logged totals sees the full "Sem dados ainda — execute pelo menos um treino" screen. This is the worst possible moment for a false-empty state: a first-timer's peak (finishing their first session) gets met with "you haven't done anything yet."
- **Fix:** Gate the page-level empty state on `totalWorkouts === 0` instead, and show real header stats plus a lighter "treine de novo para ver comparações" message inside the tabs that genuinely need a second data point.
- **Suggested command:** `/impeccable clarify`

**[P1] Exercise switcher is keyboard/screen-reader inaccessible**
- **Why it matters:** The exercise rows in the "Todos os exercícios" list are plain clickable `<div>`s with no button role, no `tabIndex`, no keyboard handler. A non-mouse user can never view any exercise's chart except whichever one loads by default — a hard functional block, not a degraded experience.
- **Fix:** Convert the rows to real `<button>` elements, matching the interaction pattern already used for `.tab`/`.chip` elsewhere in this codebase.
- **Suggested command:** `/impeccable harden`

**[P2] Secondary text fails WCAG AA contrast across the whole page**
- **Why it matters:** `--text-mute` on `--bg` computes to roughly 3.1:1, below the 4.5:1 AA threshold, at the small sizes it's used for throughout — "anterior:", "vs anterior", session dates, muscle labels. This is the color used for most of the comparison metadata that gives the headline numbers their meaning.
- **Fix:** Promote these specific labels to `--text-dim` (≈6.9:1) or increase size.
- **Suggested command:** `/impeccable harden`

**[P2] "Volume por grupo muscular" and "Top exercícios" fabricate a reps assumption**
- **Why it matters:** Volume there is computed as `currentWeight × 10 × totalSets` — a hardcoded 10-rep assumption with no basis in what the user actually logged, contradicting PRODUCT.md's "track truth, not vibes" and the honest precedent set two functions earlier in the very same file.
- **Fix:** Derive real per-exercise volume from logged set data, or label these panels "estimado" until that's available.
- **Suggested command:** `/impeccable harden`

## Persona Red Flags

**Alex (power user):** Flat, unbounded, ungrouped exercise list with no search despite muscle-group data being available for trivial grouping. Session window hardcoded to 90 days with no way to extend. Volume sparkline caps at the last 12 sessions. The fabricated ×10-reps estimate directly undermines the precision a power user relies on.

**Sam (accessibility-dependent):** Exercise rows unreachable by keyboard. Tabs have `role="tab"`/`aria-selected` but no `aria-controls`/`id` pairing and panels lack `role="tabpanel"` — no programmatic tab-to-content association for a screen reader. Loading spinner has no text alternative or `aria-live`. The pervasive low-contrast `--text-mute` affects most of the secondary labels Sam needs to read.

**Jordan (first-timer, sparse data):** Hits the false-empty state right after finishing their first-ever workout (see P1). The "PC" abbreviation for bodyweight exercises is unexplained. The Volume tab's top-exercises ranking filters on `prevWeight > 0`, so a first workout contributes nothing there either — a jarringly half-empty first-run experience even where real data exists.

## Minor Observations

- `fmtVol()` is duplicated verbatim between the page and the Volume tab component.
- Negative-delta background hardcodes a raw `rgba(255,60,60,0.1)` instead of referencing the actual `--danger` token value — a small case of token drift.
- The page-level 3-card stat row duplicates "Volume total," already shown in the Volume tab's own 4-card row.
- Bodyweight-only exercises (current weight 0) silently drop out of the exercise list's clickable set with no affordance explaining why nothing happens on click.
- Charts have `aria-label` summaries but no text/table fallback for the underlying values.

## Questions to Consider

1. If "Recordes" is the exact word DESIGN.md uses to define where the honesty/panel vocabulary applies, why is it the one screen that hasn't gotten either the green color or the system-panel treatment the Dashboard already earned for the same data?
2. The code refuses to draw a fake trend line between two real points but ships a volume number built on an assumed 10 reps nobody logged — is "we didn't fabricate the chart" enough when the number right next to it is fabricated?
