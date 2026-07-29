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
- **Auto-apply (Greenhouse/Lever)** was scoped and explicitly declined by
  the user after exploration. Blockers found, if revisited:
  - No CV file bytes are stored anywhere — only Gemini-parsed structured
    JSON (`profiles.data`). Real submission needs the actual PDF.
  - Nothing captures the ATS-specific data a submission needs (Greenhouse
    board token / Lever posting-application fields) — `jobs` and
    `trackedBoards` only keep `externalId`/`url`.
  - Greenhouse's public Job Board API is documented as read-only
    (listings only); there's no officially documented endpoint for
    third-party automated submission — the same ToS-grey-zone risk this
    app otherwise avoids. Lever does publish a documented Postings API
    apply endpoint, so it's on firmer footing if this is revisited.
  - The public landing page (`src/app/page.tsx`) currently states "No
    auto-apply... a human applies" — building this would require
    updating that copy.
  - `applicationStatusEnum`'s `ready` and `applied` values are currently
    unused by any code path.
