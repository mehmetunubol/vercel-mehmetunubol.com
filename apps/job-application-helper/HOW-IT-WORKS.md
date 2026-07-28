# How job tracking works

> Keep this doc in sync: whenever tracking, filtering, or auto-match behavior
> changes, update the relevant section here in the same change.

Short version: **nothing runs automatically unless it's deployed to production.**
Locally, every sync is a button you click. In production, one daily cron job
clicks those same buttons for you.

## The three ways jobs get into the database

1. **Tracked boards** (Greenhouse / Lever) — you register a specific company's
   job board once, then sync it (manually, or via the daily cron in prod) to
   pull every open posting from that one company.
2. **Aggregators** (RemoteOK / Arbeitnow) — broad feeds, no company-specific
   setup. Syncing pulls whatever is currently listed across many companies.
   RemoteOK returns its full current listing each sync (~100 jobs, no
   pagination). Arbeitnow paginates (~175 jobs/page); `fetchArbeitnowJobs()`
   follows `links.next` up to 10 pages, optionally stopping once results are
   older than a `sinceMs` cutoff (results are ordered newest-first). Both the
   manual Sync button and the daily cron pass the stored `lastSyncedAt` for
   `aggregator:arbeitnow` (`sync_status` table) as that cutoff, so only jobs
   posted since the last sync are fetched.
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

Once added, it shows up in the tracked list with a **Sync** button, plus an
**Untrack** button. Untracking sets the board to paused (`active = false`) —
it stops showing up for Sync and the daily cron skips it, but its jobs stay in
the database. Hit **Retrack** to resume it.

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

The filter runs as a SQL `WHERE` clause (`preferenceWhereClause()` in
`src/lib/preferences.ts`), applied **before** the "50 most recent" limit on
`/jobs` and before the auto-match candidate limit — not as a JS `.filter()`
after truncating to a page of recent rows. That matters: filtering after a
limit would silently miss a matching job that's older than the 50 most
recent postings. If this ever gets rewritten, keep the filter ahead of any
`LIMIT`.

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

## Automatic cleanup

A second daily cron (`/api/cron/cleanup-jobs`, `0 8 * * *`, an hour after the
fetch cron) deletes jobs that are:

- older than **7 days** (by `discoveredAt`), **and**
- never scored (no `matches` row), **and**
- never carried into an application (no `applications` row).

Anything matched or applied-to is kept regardless of age — this only clears
out stale, untouched postings so the `jobs` table doesn't grow forever. Same
`CRON_SECRET` protection as the fetch cron.

## Everyday flow

1. Set your list once on `/preferences`.
2. Add the company boards you care about on `/jobs` (or just rely on the two
   aggregators).
3. In production, ignore it — the daily cron keeps things fresh and
   auto-scores new matches. Locally, hit Sync when you want to check.
4. Check "Recommended for you" and the filtered job list on `/jobs`.
5. Click into a job, draft a cover letter, and track it through
   `/applications`.
