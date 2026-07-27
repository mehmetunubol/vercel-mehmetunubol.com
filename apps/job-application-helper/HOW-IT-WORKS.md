# How job tracking works

Short version: **nothing runs automatically unless it's deployed to production.**
Locally, every sync is a button you click. In production, one daily cron job
clicks those same buttons for you.

## The three ways jobs get into the database

1. **Tracked boards** (Greenhouse / Lever) — you register a specific company's
   job board once, then sync it (manually, or via the daily cron in prod) to
   pull every open posting from that one company.
2. **Aggregators** (RemoteOK / Arbeitnow) — broad feeds, no company-specific
   setup. Syncing pulls whatever is currently listed across many companies.
3. **Paste a job** — you paste in a posting by hand (for job boards with no
   API, or a one-off you found on LinkedIn).

All three write into the same `jobs` table via `upsertJobs()`
(`src/lib/jobs.ts`) — re-syncing an existing job updates it in place instead
of duplicating it.

## Adding a tracked board

Go to `/jobs` → "Track a Greenhouse or Lever board":

- **Board token / site slug** — the company identifier in that ATS's public
  URL, not a secret:
  - Greenhouse: `https://job-boards.greenhouse.io/<TOKEN>` → the `<TOKEN>` part
  - Lever: `https://jobs.lever.co/<TOKEN>` → the `<TOKEN>` part
  - Find it by visiting the company's careers page and checking which ATS
    they use (often linked at the bottom, or visible in the page URL if they
    embed the board directly).
- **Company name** — just a label for the UI, doesn't affect fetching.

Once added, it shows up in the tracked list with a **Sync** button. Clicking
Sync fetches that board's current postings right now.

## What "automatic" actually means

- **Locally (`pnpm dev`)**: nothing is automatic. You click Sync on a board,
  or Sync RemoteOK / Sync Arbeitnow, whenever you want fresh postings.
- **In production (Vercel)**: `vercel.json` defines a daily cron
  (`0 7 * * *`, once a day — Vercel's Hobby plan caps cron frequency) that
  hits `/api/cron/fetch-jobs`. That route re-syncs **every active tracked
  board** plus **both aggregators**, in sequence, no user interaction needed.
  It's protected by a `CRON_SECRET` bearer token so only Vercel's scheduler
  can trigger it.

So: add a board once, and in production it keeps itself fresh daily. Locally,
sync it yourself when you want to check.

## Search preferences filter what you see (`/preferences`)

This is a separate step from *fetching* jobs — preferences don't control what
gets pulled in, they control what's **shown to you** on `/jobs` out of
everything that's already in the database:

- **Keywords** — a job must match at least one (checked against title +
  description).
- **Exclude keywords** — a job is dropped if it matches any of these, even if
  it also matched a keyword.
- **Locations** — a job's location must contain at least one of these
  strings. Leave empty to allow any location.
- **Remote only** — if on, a job's location must contain "remote" (in
  addition to, or instead of, the locations list).

No preferences configured yet → nothing is filtered, and no auto-match runs
either (see below) — configure it once on `/preferences` to turn both on.

## Auto-match against your CV

Whenever a sync happens (board, aggregator, paste, or the daily cron), the
app also looks at jobs that:

1. pass your search preferences, and
2. don't already have a match score for your latest profile,

and scores up to **8 of them** against your most recent CV/profile using
Gemini, saving the result. This is capped on purpose — matching every job on
every sync would be slow and burn through Gemini's free-tier quota fast. If
you have more than 8 new relevant jobs waiting, run the sync again to work
through the backlog a batch at a time.

Scored jobs appear in the **"Recommended for you"** section at the top of
`/jobs`, sorted by score.

## Everyday flow

1. Set your list once on `/preferences`.
2. Add the company boards you care about on `/jobs` (or just rely on the two
   aggregators).
3. In production, ignore it — the daily cron keeps things fresh and
   auto-scores new matches. Locally, hit Sync when you want to check.
4. Check "Recommended for you" and the filtered job list on `/jobs`.
5. Click into a job, draft a cover letter, and track it through
   `/applications`.
