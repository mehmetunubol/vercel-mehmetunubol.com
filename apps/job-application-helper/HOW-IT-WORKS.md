# How job tracking works

> Keep this doc in sync: whenever tracking, filtering, or auto-match behavior
> changes, update the relevant section here in the same change.

Short version: **nothing runs automatically unless it's deployed to production.**
Locally, every sync is a button you click. In production, one daily cron job
clicks those same buttons for you.

## The four ways jobs get into the database

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
3. **LinkedIn saved searches** — see the dedicated section below.
4. **Paste a job** — you paste in a posting by hand (for job boards with no
   API, or a one-off you found on LinkedIn).

All four write into the same `jobs` table via `upsertJobs()`
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
the database. Hit **Retrack** to resume it, or **Delete** (only shown while
paused) to remove the board itself — its jobs stay in the database, just
detached from the board.

## LinkedIn saved searches

Go to `/jobs` → "LinkedIn saved searches" to add one:

- **Search name** — a label for the saved search.
- **Keywords** — free text, passed through as-is.
- **Location** — a place name (e.g. "Türkiye"); resolved to a LinkedIn geoId
  on first run via the typeahead endpoint and cached on the saved search row
  (`geo_id` column) so it isn't re-resolved every run.
- **Posted within** — anytime / 1h / 24h / week / month.
- **Experience** — intern / entry / associate / senior / director / executive.
- **Workplace** and **job type** — multi-select checkboxes.
- **Easy Apply only** / **Few applicants** — checkboxes.

Hit **Run** to run it immediately, or **Delete** to remove it. Saved searches
also run as part of the daily cron (see below).

Implementation: `src/lib/linkedin/`.

- `filters.ts` serializes the typed options above into LinkedIn's guest-search
  `f_*`/`sortBy`/`start` query params (`serializeFilters()`); callers never
  construct those params directly.
- `scraper.ts`'s `pageSearch()` is an async generator that pages
  `jobs-guest/jobs/api/seeMoreJobPostings/search` sequentially with a
  randomized 2–5s delay between pages, up to `start` = 1000 (LinkedIn's guest
  pagination ceiling — larger result sets need narrower `postedWithin`
  windows or separate per-geo saved searches instead of deeper paging). A
  `429` response throws `RateLimitError` immediately, no retry. A 0-card page
  is checked against `assertNotBlocked()`: a short response body throws
  `BlockedError` instead of being treated as "no results," since a
  soft-blocked response and a genuinely empty one both come back as a 0-card
  200. `parse.ts`'s `parseSearchResults()` additionally throws whenever a
  non-empty body parses to zero cards at all (selector breakage), even for
  longer bodies.
- `parse.ts` (cheerio) turns each `<li>` card into `{jobId, title, company,
  location, url, postedAt}`; all CSS selectors live in `selectors.ts`'s
  `SELECTORS` constant, called out there as volatile.
- `dedupe.ts`'s `normalizedJobKey()` (lowercased, whitespace-collapsed
  `company::title::location`) and `buildDuplicateKeyIndex()` catch postings
  already present under a different source (e.g. pasted by hand) — a
  LinkedIn find whose normalized key already exists in the `jobs` table is
  dropped before it's added, so it isn't duplicated. Same-source re-finds are
  already deduplicated by the `(source, external_id)` unique index via
  `upsertJobs()`.
- Incremental re-runs: `runSavedSearch()` passes the saved search's own
  `last_run_at` to `pageSearch()` as a `sinceMs` cutoff (same pattern as
  Arbeitnow's `sinceMs`). Under the default "newest" sort, cards posted at or
  before that cutoff are dropped and paging stops once a page's oldest card
  is at or before it — so re-running the same saved search only fetches
  postings newer than its last run instead of re-walking the same window
  every time. A card with no parsed `postedAt` is always kept (treated as
  fresh) rather than guessed at. Under "relevance" sort the cutoff is
  ignored entirely, since result order isn't chronological there — every
  page is fetched in full regardless of dates. Either way, anything already
  in the `jobs` table is separately caught by `dedupe.ts`, so a re-run can
  never insert the same posting twice even without the cutoff.
- `index.ts`'s `runSavedSearch()` ties it together: resolves/caches the
  geoId, pages results (with the cutoff above), drops cross-source
  duplicates, fetches a description per new listing via
  `fetchJobDescription()` (also 2–5s delayed), and returns `NormalizedJob[]`
  for `upsertJobs()`. It does not catch `RateLimitError`/`BlockedError` —
  those propagate so a run fails loudly instead of silently reporting zero
  new jobs.
- Discovered LinkedIn jobs land in the same `jobs` table as every other
  source, at the same pre-application state as any other newly discovered
  job — nothing about them is marked "applied" until you draft a cover
  letter or otherwise create an `applications` row for them.

LinkedIn's User Agreement prohibits automated access to the site even though
the underlying job data is public. This integration only hits the
unauthenticated guest endpoints (no login, no cookies, no headless browser)
and is intended for personal use at a low, human-paced request rate — a
managed job-data provider (e.g. Adzuna, Jooble) would be the appropriate
choice at any larger scale.

## What "automatic" actually means

- **Locally (`pnpm dev`)**: nothing is automatic. You click Sync on a board,
  Sync RemoteOK / Sync Arbeitnow, or Run on a saved search, whenever you want
  fresh postings.
- **In production (Vercel)**: `vercel.json` defines a daily cron
  (`0 7 * * *`, once a day — Vercel's Hobby plan caps cron frequency) that
  hits `/api/cron/fetch-jobs`. That route re-syncs every tracked board,
  aggregator, and LinkedIn saved search that has **auto-sync enabled**, in
  sequence, no user interaction needed. It's protected by a `CRON_SECRET`
  bearer token so only Vercel's scheduler can trigger it. A saved search that
  throws (rate-limited or blocked) is caught and logged per-search so it
  doesn't stop the rest of that cron run.

Auto-sync is a separate switch from whether something is tracked/manually
runnable at all:

- **Boards**: **Untrack** disables both manual Sync and the cron for that
  board. While tracked, **Disable auto-sync** / **Enable auto-sync** controls
  only whether the cron includes it — manual Sync keeps working either way.
- **Aggregators**: each of RemoteOK/Arbeitnow has its own **Disable
  auto-sync** / **Enable auto-sync** toggle (`aggregator_settings` table,
  defaults to enabled). Manual Sync buttons ignore this toggle.
- **LinkedIn saved searches**: the same **Disable auto-sync** / **Enable
  auto-sync** toggle on each saved search (the `active` column). Manual Run
  always works regardless of this setting.

So: add a board or saved search once, and in production it keeps itself
fresh daily unless you've disabled its auto-sync. Locally, sync it yourself
when you want to check.

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
through the backlog a batch at a time. The 8 Gemini calls in a batch are
spaced 2s apart rather than fired back to back, to stay under the free
tier's requests-per-minute limit. Any Gemini call (auto-match, manual match,
cover letter draft) that hits a 429 backs off longer before retrying than a
transient error would (`withGeminiRetry` in `src/lib/gemini.ts`).

Scored jobs appear in the **"Recommended for you"** section at the top of
`/jobs`, sorted by score.

## The job list on `/jobs`

The filtered list is paginated, 50 per page (`?page=` in the URL). A search
box (`?q=`, matched against title/company/description) and a platform
dropdown (`?source=`) narrow it further, on top of whatever the preferences
filter already applies; both are plain GET params so the URL is shareable.
Each row has a checkbox; check some and hit **Discard selected** to delete
just those jobs. **Clear all non-matching jobs** (shown when preferences are
configured) deletes every job that currently fails the preferences filter in
one click. Both bulk-delete actions skip any job that already has an
`applications` row — tracked jobs are never bulk-deleted.

A job whose application has moved past the `discovered` status (i.e. it's
matched/drafted/ready/applied/interviewing/rejected/offer on `/applications`)
gets an "In application — &lt;status&gt;" tag, is shown dimmed, and sorts to
the end of the list — this is computed in SQL so it holds across pages, not
just within one page.

## Sync progress indicator

Any Sync/Run/Discard/Clear button sets `aria-busy="true"` on itself while its
server action is in flight (`SubmitButton`, via React's `useFormStatus`).
Global CSS in `globals.css` keys off that attribute with a `:has()` selector
to dim the page and show an indeterminate progress bar at the top — no extra
state wiring, so it applies to every existing and future form on the page
automatically.

## Turning a job into a tracked application

On a job's detail page (`/jobs/[id]`), **Track in applications** creates an
`applications` row for it — status `matched` if a match score already exists
for it, otherwise `discovered` — which is what makes it show up on
`/applications`. Drafting a cover letter also creates this row if one doesn't
exist yet (with status `drafted`). Running a match again re-scores the same
job (button reads **Re-run match** once a score exists) — if Gemini fails or
is rate-limited, the error is shown inline next to the button and the button
stays there to retry.

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

## Moving a card on `/applications`

Each card is draggable — drop it on another column to change its status.
Every card also keeps a status dropdown + **Update** button as a
non-drag alternative. Both call the same server action
(`updateApplicationStatus` in `src/app/applications/page.tsx`) and update the
card optimistically (`src/components/kanban-board.tsx`); on failure the move
is rolled back and an inline error is shown.
