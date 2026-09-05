# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: someone who trains at the gym and wants to plan workouts by muscle split (Push/Pull/Legs, Upper/Lower, ABC/ABCD, Full Body, or custom), execute sessions with live tracking, and see real progress (load, volume, personal records) over time.

Current stage: this is a portfolio project (built to demonstrate full-stack + AI engineering skill), not a product being launched to acquire real customers. There is no confirmed user base beyond the builder. Despite that, the product itself should be designed and evaluated as if for real gym-goers — the portfolio goal is served by the product working and reading as genuinely production-grade, not by it looking like a demo.

## Product Purpose

FitAI lets a user build a structured training plan, run live workout sessions (rest timer, editable weight/reps per set, real-time volume), and track how their load and volume evolve per exercise and overall. AI (via Groq) generates a personalized training plan from the user's level, goal, available days, and equipment. Success means the user can go from "no plan" to a running, trackable training program, and later see honest evidence of progress (or lack of it) from their own logged sessions.

## Positioning

AI-generated personalized training plans (via Groq, based on profile/goals/days/equipment) is the confirmed differentiator against pure logging apps in this category (Strong, Hevy, Fitbod) — those apps record what the user already decided to do; FitAI also proposes the plan itself.

## Operating Context

- Split-based plan creation: Push/Pull/Legs, Upper/Lower, ABC, ABCD, Full Body, or custom, including duplicated blocks (Upper 1 / Upper 2, Lower 1 / Lower 2) on different days.
- Live session mode: automatic rest timer, stopwatch, editable weight/reps per set, real-time volume calculation.
- Progress review: charts of load evolution per exercise, volume per workout, and personal records, sourced from saved sessions.
- Monthly calendar view of scheduled training days by split.
- Auth via email/password or Google OAuth2, with password recovery by email; unauthenticated users are redirected by route-protection middleware.

## Capabilities and Constraints

- Exercise catalog: 57 predefined exercises across 9 muscle groups, with execution tips and default sets/reps/rest.
- Progress data model is intentionally dual-source: `SetData` holds only the latest execution snapshot per exercise (per-exercise load evolution, with `prev` for comparison); `WorkoutSession` holds one row per executed session and is the source for aggregate stats (total volume, streak). Both exist on purpose — see `ARCHITECTURE.md`.
- Auth uses JWT (access + refresh) plus Google OAuth2; refresh/reset tokens are stored server-side as a hash, never raw.
- Rate limiting protects auth endpoints from abuse.
- Frontend: Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4 — Next.js 16 is newer than most LLM training data, so frontend work should check `node_modules/next/dist/docs/` rather than assume prior knowledge.
- Backend: Spring Boot 4, Java 21, PostgreSQL, Flyway-managed schema.
- No native mobile platform exists or is planned; this is a web product (mobile web is in scope, a native wrapper is not).

## Brand Commitments

- Product name is fixed: **FitAI**.
- Product language is fixed: Brazilian Portuguese (pt-BR), throughout the UI and copy.
- Visual identity is committed: "Combustão" — fixed dark theme, single live accent (orange), reserved green signal for achievement only. Fully documented in `DESIGN.md`; treat it as binding, not open for redecision.

## Evidence on Hand

No real customers, testimonials, case studies, press, or usage data exist yet — this is a portfolio-stage project with the builder as the only user so far. Future work (especially anything Persuade-mode, like a landing page) must not fabricate testimonials, customer counts, benchmarks, or social proof; credibility here comes from the product working correctly, not from marketing claims.

## Product Principles

- Ship the AI plan generation as a real, central mechanism, not a decorative add-on — it is the one thing this product does that a plain logging app doesn't.
- Track truth, not vibes: load/volume/PR data must stay accurate and comparable session-over-session (current vs. `prev`), since that comparison is the product's core value once someone has trained for a while.
- Build and finish features to the standard of a real shipped product, even though the current audience is the builder — the portfolio goal depends on that, not on visible polish shortcuts.
- Never invent social proof, users, or metrics that don't exist; let the absence of evidence be visible rather than fabricated.
- Preserve the fixed commitments (name "FitAI", Brazilian Portuguese) in all future design and copy work.
