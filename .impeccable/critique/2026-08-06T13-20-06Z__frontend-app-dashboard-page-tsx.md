---
target: Dashboard (app/(dashboard)/page.tsx)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-06T13-20-06Z
slug: frontend-app-dashboard-page-tsx
---
Method: dual-agent (A: general-purpose design review · B: general-purpose detector/browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Loading spinner has no text/`aria-live`; `useSessions`'s own loading state is never checked, so the week-tracker can show false "0 dias treinados" while still fetching. |
| 2 | Match System / Real World | 3 | Gym vocabulary reads authentic, but the greeting is time-invariant ("Bom dia" always) and locale is `pt-BR` against a `pt-PT` product commitment. |
| 3 | User Control and Freedom | 3 | Read/navigate-only surface with a working retry on error — appropriate for an Operate dashboard. |
| 4 | Consistency and Standards | 2 | Design-system classes used correctly almost everywhere, but this exact page renders the two selectors DESIGN.md already flags as legacy off-brand debt (`.chip.chip-accent`, `.side-item-cta`). |
| 5 | Error Prevention | 3 | No destructive actions here; error vs. empty states are cleanly differentiated. |
| 6 | Recognition Rather Than Recall | 3 | Icons paired with text labels throughout; heading structure correct where present, but most sections aren't real headings. |
| 7 | Flexibility and Efficiency | 2 | No shortcuts; the one "fast path" CTA ("Começar treino") points at highest-volume-ever, not today's scheduled workout, despite schedule data existing. |
| 8 | Aesthetic and Minimalist Design | 2 | Total volume is shown twice with identical data on an already-dense 9-block screen. |
| 9 | Error Recovery | 4 | Genuinely strong — distinct error/empty states, real error message, clear retry CTA, with a code comment explaining the reasoning. |
| 10 | Help and Documentation | 2 | No explanation of "Volume," no distinction between "highest volume" and a true PR — costs more here because the app already has real PR data it isn't showing. |
| **Total** | | **26/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment (Assessment A):** The token layer is genuinely specific to FitAI — warm-charcoal steps, the single Brasa accent, the `card-accent` glow, eyebrow labels, tabular-nums discipline are all present and match DESIGN.md. But the page's *information architecture* is the generic fitness-SaaS template: greeting → 4 stat tiles → hero card → tip card → trophy card → distribution bars → sparkline is the same shape any competitor (Strong, Hevy, Fitbod) would ship. Nothing about the layout is derived from FitAI's own stated differentiator — AI-generated plans, per PRODUCT.md, are "the one thing this product does that a plain logging app doesn't" — yet the AI card gets a small tip box with the *same* visual weight as three other cards, not the hero slot. Concrete regressions compound this: `toLocaleDateString("pt-BR", …)` (3 call sites) and "Usuário" in the sidebar are Brazilian Portuguese, directly contradicting PRODUCT.md's explicit fixed commitment to European Portuguese — on the very first screen a logged-in user sees.

**Deterministic scan (Assessment B):** `detect.mjs --json` against `frontend/app/(dashboard)/page.tsx` returned exit code 0, zero findings — confirmed genuine (re-run with `--no-config` to rule out ignore-list suppression, identical clean result). This is worth reading correctly: the automated detector has nothing to flag here because everything it catches (missing tokens, raw hex, hardcoded spacing, etc.) is absent. The issues that matter on this page — wrong CTA target, redundant data, misapplied achievement color, wrong locale — are all *semantic/product* problems no pattern-matching detector can see. Clean detector output and a 26/40 heuristic score are both true at once; treat the clean scan as "no mechanical drift," not "no problems."

**Visual overlays:** Not available for this pass. The Dashboard route is auth-gated behind Next.js middleware, and no backend (Spring Boot + Postgres) is running in this environment, so there's no live, logged-in render to inject a detector overlay into. Assessment B explicitly skipped this step rather than fake it — spinning up the full backend + a seeded session was judged out of scope for this check.

## Overall Impression

The visual system (DESIGN.md's tokens) is real and consistently applied — this isn't a generic template wearing FitAI's colors. What's missing is product-level intent translated into layout: the page's structure doesn't know FitAI has a differentiator, its one "trophy" moment shows the wrong data in the wrong color, and its primary CTA silently routes to the wrong workout. The single biggest opportunity: make the AI generator and real PR data the two things this dashboard is *for*, instead of two more cards among nine equally-weighted ones.

## What's Working

1. **Error vs. empty state differentiation** (`page.tsx:78-104` vs. `106-136`) — the code carries an explicit comment on *why* these must differ (a failed fetch must never look like "you have no workouts yet"). That's deliberate product thinking baked into the implementation, not boilerplate.
2. **Refusal to fabricate trend data** (`page.tsx:39-40`, `useProgressStats.ts:7-16`) — sparse history renders as "not enough data" rather than an interpolated fake trend line. This directly honors PRODUCT.md's "track truth, not vibes" principle in actual code, not just documentation.
3. **Correct heading hierarchy where it exists** — `h1` → `h2` (featured workout) → `h3` ("Meus treinos") is clean and unskipped, a real (if incomplete) accessibility foundation to build the rest of the page on.

## Priority Issues

**[P1] "Começar treino" doesn't point at today's workout**
- **Why it matters:** The primary CTA on the primary card of the primary screen routes an impatient user to the wrong session — `featured` is picked by highest-ever volume (`page.tsx:62`), ignoring the `schedule` field that's already rendered elsewhere on the page.
- **Fix:** Select `featured` by matching today's date against `schedule`, falling back to highest-volume only when nothing is scheduled today; relabel the eyebrow ("Treino de hoje" vs. "Treino em destaque") to match.
- **Suggested command:** `/impeccable clarify`

**[P1] `pt-BR` locale and "Usuário" contradict the documented `pt-PT` brand commitment**
- **Why it matters:** PRODUCT.md fixes European Portuguese as a durable brand commitment; `toLocaleDateString("pt-BR", …)` appears 3× in this file and Sidebar.tsx uses "Usuário" instead of "Utilizador" — on the first screen every authenticated user sees.
- **Fix:** Switch to `"pt-PT"` and sweep the shell (sidebar, dashboard) for other BR-isms.
- **Suggested command:** `/impeccable adapt`

**[P1] Redundant volume display + the one "achievement" card shows the wrong color and the wrong data**
- **Why it matters:** Total volume + the same sparkline render twice (`page.tsx:176-187` and `350-363`) on an already dense screen; meanwhile the Trophy/"Maior volume" card uses `--accent` instead of the `--gain` green DESIGN.md reserves specifically for achievement moments — and never surfaces the real per-exercise PRs that `useProgressStats.prs` already computes.
- **Fix:** Replace the duplicate volume card with an actual PR card sourced from `useProgressStats.prs`, styled `card-gain`.
- **Suggested command:** `/impeccable distill`

**[P2] Legacy neon-green tokens leak onto this exact page**
- **Why it matters:** `.chip.chip-accent` (used for `featured.tags`) and `.side-item-cta` (the sidebar's always-visible AI CTA) both hardcode `rgba(0,255,136,…)` — DESIGN.md already names this as known debt on these exact two selectors, and it's rendering on the first screen a user sees.
- **Fix:** Swap both `border-color` values to `--gain`/`--gain-soft`.
- **Suggested command:** `/impeccable harden`

**[P2] No reassurance during loading; a real fetch failure looks identical to "0 workouts this week"**
- **Why it matters:** The page-level spinner has no text or `aria-live`; `useSessions` silently converts fetch errors into an empty array (`.catch(() => setSessions([]))`), so the week-tracker can show a false "you trained 0 days" during a slow load or a swallowed error — actively demoralizing and wrong.
- **Fix:** Gate the week-tracker on `useSessions().loading`/error state; add visible loading text + `aria-live="polite"` to the page spinner.
- **Suggested command:** `/impeccable harden`

## Persona Red Flags

**Alex (Power User):** Clicks "Começar treino" expecting today's session, lands on the all-time-highest-volume workout instead — no scheduling logic used despite the data existing. Scans past the same total-volume number twice (stat card + "Volume acumulado" card) for zero new information. Two equally bold `card-accent` treatments (hero vs. AI card) force a beat of "which one is the actual next step." Hits the unlabeled loading spinner during the exact OAuth-token race the code comments call out, with nothing telling him it's still working.

**Sam (Accessibility-Dependent):** Only 3 real headings exist on the whole page — "Sugestão da IA," "Maior volume," "Foco muscular," "Treinado esta semana," and "Volume acumulado" are all `<div class="h-eyebrow">`, invisible to heading-based screen-reader navigation. Both `Sparkline` instances pass no `label` prop, so both fall back to the same generic `aria-label="Mini-gráfico de tendência"` — no indication of what's trending or its actual values, no data-table fallback. (Fair note: the week-tracker's ✓/– state is real text alongside color, so that one widget does pass the color-only-meaning check.)

## Minor Observations

- The `h1` greeting pairs an emoji with a time-invariant "Bom dia" (always says "good morning") — a small tonal slip on a project whose stated principles emphasize production-grade seriousness over demo polish.
- "Total de séries" and "Média / treino" are mathematically derived from each other — not wrong, but low incremental information for 2 of only 4 stat slots.
- No custom `focus-visible` styling on `.card`, `.btn`, or `.chip` (only `.input`/`.auth-tab`/`.side-user-link` define one) — keyboard access still works via default browser outline, but the focus experience is visually inconsistent with the branded treatment used elsewhere.
- With exactly 1-2 logged workouts, `Sparkline` silently renders nothing (returns `null` below 2 data points) rather than an explicit "not enough data yet" message — a first-timer sees a blank void under the label.

## Questions to Consider

1. If AI-generated plans are the one thing FitAI does that a plain logging app doesn't, why does the dashboard give that card the same visual weight as "Foco muscular" instead of the hero slot?
2. The app already computes real personal records and reserves a whole color to signal them — why does the dashboard's only "trophy" moment use neither?
3. Was `pt-BR` a conscious tradeoff, or did the first screen just never get checked against the product's own documented brand commitment?
