@AGENTS.md

# web — quick context

Personal site/blog (mehmetunubol.com). Next.js 16 App Router, Tailwind 4.

## Standing rules
- Same repo, separate Vercel project from job-application-helper (two
  projects, one monorepo — confirmed safe for auto-deploy).
- Don't deploy/push without being asked.
- `src/lib/site.ts` is the single source of truth for CV/profile content
  (name, experience, projects list, etc.) — `/api/profile/route.ts` serves
  a subset of it as JSON, gated by `PROFILE_API_SECRET` header (defense in
  depth, not real access control — everything returned is already public).
  job-application-helper's profile-fetch feature is the consumer.
- Cloudflare Bot Fight Mode has blocked server-to-server fetches to this
  API before (403 before even reaching the app) — if debugging a
  mysterious 403 from another service calling this domain, check
  Cloudflare WAF settings before assuming an app bug.
- `PROFILE_API_SECRET` must match between this app's Vercel env and
  whatever service calls `/api/profile` — a missing/mismatched value here
  is a silent 401, not an error in the caller.

## Known open items
- None outstanding as of 2026-07-29.
