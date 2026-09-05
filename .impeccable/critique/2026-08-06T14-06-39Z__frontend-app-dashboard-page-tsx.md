---
target: Dashboard (app/(dashboard)/page.tsx)
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-06T14-06-39Z
slug: frontend-app-dashboard-page-tsx
---
Method: dual-agent (A: general-purpose design review · B: general-purpose detector/browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Distinct loading/error/empty states, plus the new independent `sessionsLoading`/`sessionsError` sub-state for the weekly panel — no longer renders a false "no training this week" during a slow fetch. |
| 2 | Match System / Real World | 2 | "Começar treino" (Play icon) implies immediate start, but only navigates to the workout detail page — a second "Iniciar treino" click is needed to actually begin. |
| 3 | User Control and Freedom | 3 | Working retry on error state; no traps or destructive actions on this page. |
| 4 | Consistency and Standards | 1 | pt-BR/pt-PT copy split visible within one screen — "Você...cadastrados" (AI card) sits directly above "o teu primeiro PR" (PR card) in the same column. Also "Começar" vs "Iniciar" for the same action, and this page's "Foco muscular" uses a different computation than Progress page's near-identical-looking "Por grupo muscular." |
| 5 | Error Prevention | 3 | Little destructive surface area; retry is idempotent. |
| 6 | Recognition Rather Than Recall | 3 | Live date eyebrow, "Treino de hoje" vs. "Treino em destaque" label swap gives contextual grounding. |
| 7 | Flexibility and Efficiency | 2 | No fast path for a returning user — same two clicks every visit to start a session; nothing dismissible or reorderable. |
| 8 | Aesthetic and Minimalist Design | 3 | Card/type/spacing discipline matches DESIGN.md tokens, but two simultaneous `card-accent` cards (hero + AI) work against the system's own "one accent moment" rule. |
| 9 | Error Recovery | 2 | The error state renders the raw hook error string verbatim, no friendly translation layer. |
| 10 | Help and Documentation | 2 | No explanation anywhere of "Volume total," "PR," or how "Foco muscular" % is computed. |
| **Total** | | **24/40** | **Acceptable** |

**Note on comparability:** the previous run of this same target scored 26/40. This is an independent re-assessment (fresh sub-agents, no memory of the prior report or of what was fixed) rather than a diff — some score movement between runs is expected variance in what a reviewer notices and how strictly a borderline heuristic gets scored, not a regression caused by this session's fixes. Reading the two reports together: every issue fixed in the last pass is independently confirmed as sound (see below), and the score moved because this pass surfaced real issues the first pass didn't — most importantly that the pt-PT locale fix was incomplete.

## Design Specificity Verdict

**LLM assessment:** Genuinely improved in the parts that were touched: the PR card correctly uses `--gain` green exclusively for the achievement moment (this reviewer explicitly called it out as following DESIGN.md's "Regra do Verde-Sinal" correctly), the "Treino de hoje"/"Treino em destaque" label swap reads as real contextual awareness, and the independent loading/error sub-state on the weekly panel was flagged as a genuine strength. But the locale fix from the last pass only changed `toLocaleDateString` locale codes and one "Usuário"→"Utilizador" — it did not audit the surrounding copy. The AI suggestion card and the empty-state copy still use Brazilian vocabulary ("você," "cadastrado," "seu/sua," "sob medida") sitting directly beside newly-written European Portuguese ("teu," "registados," "veres") in the PR card — a self-contradicting mix that is arguably worse for brand credibility than a consistently-wrong locale, because it now reads as unfinished rather than uniformly mistaken. Separately, this pass caught a real DESIGN.md violation the last one missed: the hero and the AI suggestion card both use `card-accent`, splitting the "one lit element per screen" rule the system commits to in its own document.

**Deterministic scan:** Clean again — `detect.mjs --json` on the same file, exit 0, zero findings, verified against config/inline-ignore suppression. Same read as last time: the detector has nothing to flag because everything it catches (missing tokens, raw hex, etc.) is absent. Every issue in this report is semantic/product-level, invisible to pattern matching.

**Visual overlays:** Skipped again, same reason — auth-gated route, no backend running in this environment.

## Overall Impression

The three targeted fixes from the last pass held up under independent review — CTA logic, the PR/`--gain` card, and the loading states are all specifically praised here. What's now most visible is that "fix the locale" turned out to be bigger than the literal `pt-BR`→`pt-PT` string swap: the actual brand commitment is consistent European Portuguese *vocabulary*, and half the page's copy still reads Brazilian. That, plus a genuine dual-accent-card violation of DESIGN.md's own rule, are the two things worth a next pass.

## What's Working

1. **Independent loading/error sub-states hold up** — the weekly-training panel's own `sessionsLoading`/`sessionsError` branch (added last pass) was specifically flagged as preventing a false "no training this week" during a slow fetch — exactly the bug it was built to fix.
2. **`--gain` green used correctly and only for the PR card** — matches DESIGN.md's semantic reservation rule, confirmed by an assessor with no knowledge of that rule's recent violation history.
3. **Disciplined chunking throughout** — every list on the page is explicitly capped (top 3 PRs, top 4 muscle groups, top 4 workouts), never dumping unbounded data.

## Priority Issues

**[P0] pt-BR/pt-PT copy inconsistency is now visible *within* one screen**
- **Why it matters:** PRODUCT.md fixes European Portuguese as a brand commitment. The prior fix corrected locale codes and one fallback string, but "você," "seu/sua," "cadastrado," "sob medida" remain in the AI suggestion card and the empty state, sitting directly next to newly-Portuguese-corrected copy in the PR card ("teu," "registados," "veres") — a native speaker sees both in the same glance.
- **Fix:** Full copy audit of every literal string in this file (including its error/empty branches) for pt-PT grammar: você→tu (and restructure verb forms), seu/sua→teu/tua, cadastrado→registado, sob medida→à medida.
- **Suggested command:** `/impeccable polish`

**[P1] Hardcoded "Bom dia" ignores real time of day**
- **Why it matters:** It's the first line read on every visit and is wrong most of the day, despite `new Date()` already being called on the same line for the date eyebrow.
- **Fix:** Branch the greeting on local hour (Bom dia / Boa tarde / Boa noite).
- **Suggested command:** `/impeccable polish`

**[P1] Raw fetch/hook error string shown verbatim to the user**
- **Why it matters:** `{error}` renders whatever the underlying exception produced — untranslated, possibly technical — exactly at the moment reassurance matters most.
- **Fix:** Map known failure cases to curated pt-PT copy; keep the raw message for logging only.
- **Suggested command:** `/impeccable harden`

**[P2] Hero and AI card both use `card-accent`, splitting DESIGN.md's "one lit element" rule**
- **Why it matters:** DESIGN.md documents `card-accent`'s glow as the treatment for *the* featured card of a screen (singular); using it twice weakens the hero's authority as the primary CTA.
- **Fix:** Demote the AI card to a plain `.card` with an accent-colored icon/eyebrow only, reserving the full glow for the hero.
- **Suggested command:** `/impeccable shape`

**[P2] Card sections still aren't real headings**
- **Why it matters:** "Sugestão da IA," "Recordes recentes," "Foco muscular," and "Treinado esta semana" are all `<div class="h-eyebrow">`, not headings — a screen-reader user navigating by heading list skips 4 of 7 content sections. (Carried over from the first critique; not in scope of the fixes just made.)
- **Fix:** Convert to `<h2>`/`<h3>` styled with the existing `.h-eyebrow` class — no visual change needed.
- **Suggested command:** `/impeccable audit`

## Persona Red Flags

**Alex (power user):** Hits "Começar treino → Iniciar treino" as a double-click every single day; gets no reorder/dismiss control over cards that become irrelevant to a daily habit.

**Sam (accessibility-dependent):** Heading navigation still skips 4 of 7 sections; no `focus-visible` styling on cards/buttons on this page, so keyboard focus falls back to browser-default outlines against the dark surface.

**Jordan (first-timer):** The empty state — the very first content this persona reads — still carries the pt-BR copy bug ("Nenhum treino cadastrado," "Crie seu primeiro treino"); no explanation anywhere of what "Volume total," "PR," or "Foco muscular %" mean.

## Minor Observations

- The error-state icon (`AlertCircle`, red) sits inside `.auth-status-icon`, whose background/border is accent-orange — an error signal wrapped in the brand's energy color, no danger variant of that container exists.
- Dashboard's "Foco muscular" (counts exercises across *planned* workouts) and Progress page's "Por grupo muscular" (volume from *executed* sessions) use near-identical bar-chart UI for genuinely different metrics, no disambiguating label.
- "Ver tudo" and "Ver treinos" are two differently-worded links to the same `/treinos` destination on one screen.

## Questions to Consider

1. If AI-generated plans are the product's core differentiator, why does that card share visual weight with a static muscle-group bar chart instead of a more assertive placement?
2. Is "Começar treino" meant as a genuine one-tap start, or a deliberate confirm-before-you-commit step — and if the latter, why do both its icon and verb signal immediate action?
