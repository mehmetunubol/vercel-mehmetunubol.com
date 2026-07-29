# job-application-helper — quick context

Personal job-search app. Next.js 16 (App Router), Drizzle ORM (neon-http),
NextAuth v5 Credentials, Gemini for matching/cover-letters/CV parsing.

**Read `HOW-IT-WORKS.md` first** — factual current-behavior doc, kept in sync
every change. No rationale/history there by design; this file has that.

## Standing rules
- DB is shared prod Neon (same `DATABASE_URL` local + Vercel). Schema/data
  changes touch production. Migrations are generated (`pnpm db:generate`)
  but **not auto-applied** — user runs `pnpm db:migrate` manually.
- Don't deploy/push without being asked ("I will push them manually").
- HOW-IT-WORKS.md edits: document current behavior only, no "why we fixed
  X" narrative.
- Before done: `pnpm typecheck && pnpm lint && pnpm test` must be green.
  Vitest, no live network in tests, lives in `src/**/__tests__`.
- Screenshots (`public/screenshots/*.png`) are used on the public landing
  page — DB has real personal job/application data mixed with test rows;
  never screenshot without seeding disposable demo data first and deleting
  it after (see git history for the pattern).

## Known open items
- Gemini free tier is a **hard 20 requests/day** cap per model (not
  per-minute) — confirmed from a real 429 body's quotaId
  (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`). Multi-model
  fallback (`GEMINI_MODELS` env var) is built — see HOW-IT-WORKS.md.
- Auto-match is currently **disabled** (`MAX_AUTO_MATCHES_PER_RUN = 0` in
  `src/lib/auto-match.ts`) — Gemini only fires on manual button clicks
  (Match against profile / Draft cover letter) until re-enabled.
- **Cross-provider fallback** (requested, not built): only Gemini models
  are supported today (`GEMINI_MODELS` switches within the Gemini family).
  Adding another free-tier provider (e.g. Groq, OpenRouter free models,
  Mistral) as a further fallback needs its own SDK/API integration, a
  separate API key, and normalizing its response shape to match what
  `matching.ts`/`cv-parser.ts`/`cover-letter.ts` expect — bigger lift than
  the same-provider model switching in `src/lib/gemini.ts`.
