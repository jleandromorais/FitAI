---
target: Dashboard (app/(dashboard)/page.tsx)
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
timestamp: 2026-08-06T15-07-02Z
slug: frontend-app-dashboard-page-tsx
---
Method: dual-agent (A: general-purpose design review · B: general-purpose detector/browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Loading/error/empty states, per-day session checkmarks, count-up, and sparkline pulse all communicate state clearly. |
| 2 | Match System / Real World | 2 | "Sugestão da IA" card now carries the live-dot + HUD-corner + tech-grid vocabulary reserved for "computed/generated" data — but its copy is a static `workouts.length` ternary, not a Groq call. Real mental-model mismatch. |
| 3 | User Control and Freedom | 3 | Retry button and clear escape links; nothing to undo on a read-mostly screen. |
| 4 | Consistency and Standards | 2 | `.stat-num` now renders in JetBrains Mono on the dashboard but stays Space Grotesk for the same semantic values on `progresso/page.tsx` and `VolumeTab.tsx` — same class, different typeface depending on page. |
| 5 | Error Prevention | 4 | Sessions loading/error explicitly distinguished from "genuinely no data," documented in code comments. |
| 6 | Recognition Rather Than Recall | 4 | Eyebrow labels, icons, workout-code avatars all reduce recall load. |
| 7 | Flexibility and Efficiency | 3 | Clear CTAs; no power-user affordances beyond that, acceptable for this surface. |
| 8 | Aesthetic and Minimalist Design | 2 | Up to 6 concurrent animation sources (4 counters + hero glow + AI dot + sparkline pulse) fire unstaggered at mount. |
| 9 | Error Recovery | 4 | pt-BR copy is curated; raw error text goes to console only, not the user. |
| 10 | Help and Documentation | 3 | Low need for this surface; no major gap. |
| **Total** | | **31/40** | **Good** |

## Design Specificity Verdict

**LLM assessment:** The new tech/AI layer is, on the whole, a disciplined and genuinely FitAI-specific extension — not a generic "cyberpunk dashboard" trope. DESIGN.md was updated in the same pass to codify it (a new "Camada painel de sistema" section with its own Named Rule), the corner brackets and grid texture reuse only the existing accent/gain tokens rather than inventing new hues, and the static cards (Foco muscular, Meus treinos) were deliberately left undecorated — real restraint for a "melhorar muito mais" request. But there's one load-bearing crack: the "Sugestão da IA" card stages itself as "the system just computed this live" (live-dot + HUD corners + tech-grid) when the copy behind it is a hardcoded ternary on `workouts.length`, not an actual Groq call. Dressing static rule-based text in the exact visual vocabulary DESIGN.md now reserves for "dado computado ou gerado" is the one place this reads as trope-first rather than product-first — and it directly cuts against PRODUCT.md's own principle ("track truth, not vibes… never fabricate"). Everywhere else — hero, PR card — the tech layer decorates something genuinely real (today's scheduled workout, real PR deltas), so the pattern itself is sound; this one application of it isn't.

**Deterministic scan:** Clean across all three files touched this round (`page.tsx`, `HudCorners.tsx`, `useCountUp.ts`) — exit 0, zero findings, and Assessment B verified this is a genuine result (not a broken invocation) by reading the detector's source and testing it against a deliberately-bad scratch file, which it correctly flagged. Worth understanding *why* it's clean: the detector's page-level analyzers (flat-type-hierarchy, monotonous-spacing, dark-glow, etc.) only run on full HTML documents (`<!doctype>`/`<html>`/`<head>`), which a Next.js `page.tsx` component never is — so this scan is structurally narrower here than the story it can tell. Only line-level regex matchers (raw hex, Tailwind gray-on-color, etc.) actually ran, and correctly found nothing, since the new components use CSS custom properties throughout. A clean scan here means "no mechanical token drift," not "no design issues" — the two real issues below are both semantic, invisible to this tool.

**Visual overlays:** Not available. No browser automation tool is exposed in this session (confirmed via ToolSearch), even though a real dev server and seeded test account exist. Assessment B did not fake or simulate a screenshot.

## Overall Impression

The score moved from 24/40 to 31/40 — real progress, and the previously-fixed issues (CTA logic, PR card, curated error copy, headings) continue to hold up under fresh review. The new tech layer is well-judged in scope (3 cards, not 9) and well-implemented technically (reduced-motion handled correctly via initial state, not a setState-in-effect flash). The one thing that actually needs fixing before this ships: the AI card's visual honesty. The others (font consistency, animation orchestration, replay fatigue) are real but smaller.

## What's Working

1. **Reduced-motion handling is genuinely solid** — `useCountUp` decides the reduced-motion case in `useState`'s initializer (not a synchronous `setState` inside the effect), and the global `@media (prefers-reduced-motion: reduce)` block disables `.pulse`, `.live-dot`, and `.glow-live` in one place. This is textbook.
2. **Scope discipline held** — `HudCorners`/`.tech-grid` landed only on the 3 cards that represent real computed/live data (hero, AI, PR); the static cards were deliberately left alone, matching the new "Regra do Painel Único" the same pass wrote into DESIGN.md.
3. **Substate handling from prior rounds is untouched and still exemplary** — sessions loading vs. error vs. genuinely-empty, error page vs. empty-workouts page, all still correctly distinguished.

## Priority Issues

**[P0] "Sugestão da IA" wears a "live/computed" signal it hasn't earned**
- **Why it matters:** The card's copy (`page.tsx`) is a plain ternary on `workouts.length`, not a Groq call — yet it now carries the exact live-dot + HUD-corner + tech-grid vocabulary DESIGN.md reserves for genuinely computed/generated data. PRODUCT.md explicitly warns against this: AI generation is stated as the product's core differentiator, and the same document says to "never invent... let absence of evidence be visible rather than fabricated." Staging static logic as live AI output is exactly that category of problem, on the highest-visibility card of the new layer.
- **Fix:** Either derive this card's content from something genuinely computed from the user's real data (the same way the PR card earns its HudCorners from real delta data), or strip the live-dot/tech framing from this specific card and keep it a plain CTA teaser.
- **Suggested command:** `/impeccable harden`

**[P1] `.stat-num` font-family is now permanently mono on the dashboard only**
- **Why it matters:** The same semantic values ("Volume total," "Total de séries") render in JetBrains Mono on the dashboard but stay in Space Grotesk on `progresso/page.tsx` and `VolumeTab.tsx` — same CSS class, different typeface depending on which page shows them. DESIGN.md's "Regra do Mono ao Vivo" is meant for continuously-changing values; these numbers animate once at mount then sit static, so treating them as permanently "ao vivo" both breaks cross-page consistency and dilutes what the rule means everywhere else.
- **Fix:** Expose a "still animating" flag from `useCountUp` and apply mono only while the value is in motion, reverting to Space Grotesk once it settles.
- **Suggested command:** `/impeccable polish`

**[P2] No orchestration across ~6 simultaneous mount-time animations**
- **Why it matters:** 4 independent count-up numbers, the hero's breathing glow (3.2s), the AI card's pulsing dot (2s), and the sparkline's pulse halo all start at the same instant with no relative delay — violates the "one thing at a time" cognitive-load principle and heuristic 8 (minimalist design). An instrument-panel aesthetic usually reads calmer with a staggered power-on sequence.
- **Fix:** Stagger stat-card count-up start by ~60-80ms per card; delay `glow-live`/`live-dot` onset until after the count-up settles.
- **Suggested command:** `/impeccable animate`

**[P3] Count-up replays on every visit with no session gate**
- **Why it matters:** `useCountUp` resets to 0 on every mount. The dashboard is the primary landing page a daily-active user opens repeatedly — a nice first-login moment becomes a ~700ms tax on every subsequent visit for exactly the users checking this screen most often.
- **Fix:** Gate the animated variant behind a `sessionStorage` "seen" flag, or shorten materially for repeat views in the same session.
- **Suggested command:** `/impeccable optimize`

## Persona Red Flags

**Alex (power user, opens dashboard daily):** Hit by the replay-every-visit count-up (P3) and would notice the font inconsistency (P1) if they ever glance at the Progress page in the same session — small trust erosions that accumulate for a frequent user.

**Sam (accessibility-dependent):** Actually well served — reduced-motion correctly kills glow/pulse/dot/count-up in one global rule, and `useCountUp` avoids the flash-of-zero anti-pattern. One open question, not confirmed broken: dashboard card-links don't have an explicit `:focus-visible` style beyond a couple of unrelated components — worth a follow-up check.

**Jordan (first-timer):** Correctly shielded from the tech layer while their workout list is empty (plain `.card`, no tech-grid) — but the very next visit, once they've added one workout, jumps straight into the full multi-animation hero+stats treatment with zero ramp-up from the calm onboarding screen they just left.

## Minor Observations

- `@keyframes glowPulse` hardcodes `rgba(255,90,46,…)` instead of referencing `--accent` — consistent with existing precedent elsewhere (`.rep-counter-num`'s text-shadow does the same), so not a new sin, but token-drift risk if the accent hex ever changes.
- `Sparkline`'s new `pulse` prop is applied only to the "Volume total" card as intended — not spammed to the other three stat cards.
- `HudCorners` inset/size values sit comfortably inside each card's padding at all documented breakpoints; no overlap found down to the 560px grid collapse.

## Questions to Consider

1. If "Sugestão da IA" doesn't actually call the AI, should it carry any tech-panel visual language at all — or is that vocabulary now doing marketing work the feature hasn't earned?
2. DESIGN.md caps `.glow-live` at one per screen but sets no cap on how many cards can carry `.tech-grid`/`HudCorners` together — what stops a future "melhorar mais" request from adding a fourth panel-styled card?
