import { Badge, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { and, desc, eq, ilike, inArray, not, notExists, or, sql } from "drizzle-orm";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { autoMatchNewJobsForUser } from "@/lib/auto-match";
import { fetchArbeitnowJobs, fetchRemoteOkJobs } from "@/lib/ats/aggregators";
import { fetchGreenhouseJobs } from "@/lib/ats/greenhouse";
import { fetchLeverJobs } from "@/lib/ats/lever";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  aggregatorSettings,
  applications,
  jobs,
  jobSourceEnum,
  linkedinSavedSearches,
  matches,
  profiles,
  searchPreferences,
  syncStatus,
  trackedBoards,
} from "@/lib/db/schema";
import { recordSyncStatus, upsertJobs } from "@/lib/jobs";
import { runSavedSearch } from "@/lib/linkedin";
import type { ExperienceLevel, JobType, PostedWithin, Workplace } from "@/lib/linkedin/filters";
import { preferenceWhereClause } from "@/lib/preferences";
import { AppShell } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";

const inputClass =
  "w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm transition-colors focus:border-accent focus:outline-none";

async function addBoard(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const source = formData.get("source");
  const boardToken = formData.get("boardToken");
  const companyName = formData.get("companyName");
  if (source !== "greenhouse" && source !== "lever") return;
  if (typeof boardToken !== "string" || typeof companyName !== "string") return;
  if (!boardToken || !companyName) return;

  await db.insert(trackedBoards).values({ source, boardToken, companyName });
  revalidatePath("/jobs");
}

async function syncBoard(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const boardId = formData.get("boardId");
  if (typeof boardId !== "string") return;

  const [board] = await db.select().from(trackedBoards).where(eq(trackedBoards.id, boardId)).limit(1);
  if (!board) return;

  const normalized =
    board.source === "greenhouse"
      ? await fetchGreenhouseJobs(board.boardToken, board.companyName)
      : await fetchLeverJobs(board.boardToken, board.companyName);

  await upsertJobs(normalized, board.id);
  await db.update(trackedBoards).set({ lastFetchedAt: new Date() }).where(eq(trackedBoards.id, board.id));
  await autoMatchNewJobsForUser(userId);
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
}

async function setBoardActive(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const boardId = formData.get("boardId");
  const active = formData.get("active") === "true";
  if (typeof boardId !== "string") return;

  await db.update(trackedBoards).set({ active }).where(eq(trackedBoards.id, boardId));
  revalidatePath("/jobs");
}

async function deleteBoard(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const boardId = formData.get("boardId");
  if (typeof boardId !== "string") return;

  const [board] = await db.select().from(trackedBoards).where(eq(trackedBoards.id, boardId)).limit(1);
  if (!board || board.active) return; // only untracked (paused) boards can be deleted

  // trackedBoardId has no ON DELETE behavior — detach its jobs first so the
  // board row can be removed; the jobs themselves stay.
  await db.update(jobs).set({ trackedBoardId: null }).where(eq(jobs.trackedBoardId, boardId));
  await db.delete(trackedBoards).where(eq(trackedBoards.id, boardId));
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
}

async function toggleBoardAutoSync(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const boardId = formData.get("boardId");
  const autoSyncEnabled = formData.get("autoSyncEnabled") === "true";
  if (typeof boardId !== "string") return;

  await db.update(trackedBoards).set({ autoSyncEnabled }).where(eq(trackedBoards.id, boardId));
  revalidatePath("/jobs");
}

async function toggleAggregatorAutoSync(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const id = formData.get("id");
  const autoSyncEnabled = formData.get("autoSyncEnabled") === "true";
  if (typeof id !== "string") return;

  await db
    .insert(aggregatorSettings)
    .values({ id, autoSyncEnabled })
    .onConflictDoUpdate({ target: aggregatorSettings.id, set: { autoSyncEnabled } });
  revalidatePath("/jobs");
}

async function toggleSavedSearchAutoSync(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const searchId = formData.get("searchId");
  const active = formData.get("active") === "true";
  if (typeof searchId !== "string") return;

  await db.update(linkedinSavedSearches).set({ active }).where(eq(linkedinSavedSearches.id, searchId));
  revalidatePath("/jobs");
}

async function syncAggregator(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const source = formData.get("source");
  if (source !== "remoteok" && source !== "arbeitnow") return;

  let normalized;
  if (source === "remoteok") {
    normalized = await fetchRemoteOkJobs();
  } else {
    const [status] = await db.select().from(syncStatus).where(eq(syncStatus.id, "aggregator:arbeitnow")).limit(1);
    normalized = await fetchArbeitnowJobs(status?.lastSyncedAt.getTime());
  }
  await upsertJobs(normalized);
  await recordSyncStatus(`aggregator:${source}`);
  await autoMatchNewJobsForUser(userId);
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
}

async function pasteJob(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const title = formData.get("title");
  const company = formData.get("company");
  const rawText = formData.get("rawText");
  const url = formData.get("url");
  if (typeof title !== "string" || typeof company !== "string" || typeof rawText !== "string") return;
  if (!title || !company || !rawText) return;

  await upsertJobs([
    {
      source: "manual",
      externalId: randomUUID(),
      url: typeof url === "string" && url ? url : "",
      title,
      company,
      rawDescription: rawText,
    },
  ]);
  await autoMatchNewJobsForUser(userId);
  revalidatePath("/jobs");
}

const JOB_TYPE_OPTIONS: JobType[] = ["full-time", "part-time", "contract", "temporary", "volunteer", "internship", "other"];
const WORKPLACE_OPTIONS: Workplace[] = ["onsite", "remote", "hybrid"];
const EXPERIENCE_OPTIONS: ExperienceLevel[] = ["intern", "entry", "associate", "senior", "director", "executive"];
const POSTED_WITHIN_OPTIONS: PostedWithin[] = ["1h", "24h", "week", "month"];

async function addSavedSearch(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const name = formData.get("name");
  const keywords = formData.get("keywords");
  const location = formData.get("location");
  if (typeof name !== "string" || !name) return;

  await db.insert(linkedinSavedSearches).values({
    userId,
    name,
    keywords: typeof keywords === "string" ? keywords : "",
    location: typeof location === "string" ? location : "",
    postedWithin: (formData.get("postedWithin") as string) || null,
    experience: (formData.get("experience") as string) || null,
    jobType: formData.getAll("jobType").filter((value): value is string => typeof value === "string"),
    workplace: formData.getAll("workplace").filter((value): value is string => typeof value === "string"),
    easyApplyOnly: formData.get("easyApplyOnly") === "on",
    fewApplicants: formData.get("fewApplicants") === "on",
  });
  revalidatePath("/jobs");
}

async function runSavedSearchAction(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const searchId = formData.get("searchId");
  if (typeof searchId !== "string") return;

  const [savedSearch] = await db
    .select()
    .from(linkedinSavedSearches)
    .where(eq(linkedinSavedSearches.id, searchId))
    .limit(1);
  if (!savedSearch) return;

  const normalized = await runSavedSearch(savedSearch);
  await upsertJobs(normalized);
  await db
    .update(linkedinSavedSearches)
    .set({ lastRunAt: new Date() })
    .where(eq(linkedinSavedSearches.id, searchId));
  await autoMatchNewJobsForUser(userId);
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
}

async function deleteSavedSearch(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const searchId = formData.get("searchId");
  if (typeof searchId !== "string") return;

  await db.delete(linkedinSavedSearches).where(eq(linkedinSavedSearches.id, searchId));
  revalidatePath("/jobs");
}

const PAGE_SIZE = 50;

/** A job with an existing applications row is never bulk-deleted — it's being tracked. */
const notTrackedClause = notExists(db.select().from(applications).where(eq(applications.jobId, jobs.id)));

async function discardSelectedJobs(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const jobIds = formData.getAll("jobIds").filter((value): value is string => typeof value === "string");
  if (jobIds.length === 0) return;

  await db.delete(jobs).where(and(inArray(jobs.id, jobIds), notTrackedClause));
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
}

async function clearUnmatchedJobs() {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const [prefs] = await db.select().from(searchPreferences).where(eq(searchPreferences.userId, userId)).limit(1);
  const whereClause = prefs ? preferenceWhereClause(prefs) : undefined;
  if (!whereClause) return; // no preferences configured — "not filtered" would mean "everything"

  await db.delete(jobs).where(and(not(whereClause), notTrackedClause));
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
}

const SOURCE_OPTIONS = jobSourceEnum.enumValues;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; source?: string }>;
}) {
  const userId = await requireUserId();
  const { page: pageParam, q, source } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const sourceFilter = SOURCE_OPTIONS.includes(source as (typeof SOURCE_OPTIONS)[number])
    ? (source as (typeof SOURCE_OPTIONS)[number])
    : undefined;

  const boards = await db.select().from(trackedBoards).orderBy(desc(trackedBoards.createdAt));
  const savedSearches = await db
    .select()
    .from(linkedinSavedSearches)
    .orderBy(desc(linkedinSavedSearches.createdAt));
  const aggregatorSettingsRows = await db.select().from(aggregatorSettings);
  const aggregatorAutoSync = new Map(aggregatorSettingsRows.map((row) => [row.id, row.autoSyncEnabled]));
  const isAggregatorAutoSyncOn = (id: string) => aggregatorAutoSync.get(id) ?? true;

  const [prefs] = userId
    ? await db.select().from(searchPreferences).where(eq(searchPreferences.userId, userId)).limit(1)
    : [];

  // Filter in SQL before LIMIT — filtering in JS after truncating to a page
  // of recent rows would silently miss matches outside that page.
  const prefsClause = prefs ? preferenceWhereClause(prefs) : undefined;
  const extraClauses = [
    q ? or(ilike(jobs.title, `%${q}%`), ilike(jobs.company, `%${q}%`), ilike(jobs.rawDescription, `%${q}%`)) : undefined,
    sourceFilter ? eq(jobs.source, sourceFilter) : undefined,
  ].filter((clause): clause is NonNullable<typeof clause> => clause !== undefined);
  const whereClause =
    prefsClause && extraClauses.length > 0
      ? and(prefsClause, ...extraClauses)
      : extraClauses.length > 0
        ? and(...extraClauses)
        : prefsClause;
  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jobs)
    .where(whereClause);
  const filteredCount = countRows[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const filteredJobs = await db
    .select()
    .from(jobs)
    .where(whereClause)
    .orderBy(desc(jobs.discoveredAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const [latestProfile] = userId
    ? await db.select().from(profiles).where(eq(profiles.userId, userId)).orderBy(desc(profiles.createdAt)).limit(1)
    : [];
  const recommended = latestProfile
    ? await db
        .select({ job: jobs, score: matches.score })
        .from(matches)
        .innerJoin(jobs, eq(matches.jobId, jobs.id))
        .where(eq(matches.profileId, latestProfile.id))
        .orderBy(desc(matches.score))
        .limit(10)
    : [];

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sourceFilter) params.set("source", sourceFilter);
    params.set("page", String(targetPage));
    return `/jobs?${params.toString()}`;
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
            <p className="text-sm text-muted">Track boards, sync aggregators, or paste one in by hand.</p>
          </div>
          <Link href="/preferences" className="shrink-0 text-sm text-accent hover:underline">
            Search preferences →
          </Link>
        </div>

        {recommended.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommended for you</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recommended.map(({ job, score }) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm transition-colors hover:border-accent/40"
                >
                  <span className="min-w-0 truncate">
                    {job.title} <span className="text-muted">— {job.company}</span>
                  </span>
                  <Badge variant={score >= 70 ? "accent" : "default"} className="shrink-0 tabular-nums">
                    {score}/100
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Track a Greenhouse or Lever board</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <form action={addBoard} className="flex flex-wrap gap-2">
                <select name="source" className={`${inputClass} w-auto`}>
                  <option value="greenhouse">Greenhouse</option>
                  <option value="lever">Lever</option>
                </select>
                <input name="boardToken" placeholder="board token / site slug" required className={`${inputClass} flex-1`} />
                <input name="companyName" placeholder="Company name" required className={`${inputClass} flex-1`} />
                <SubmitButton size="sm" pendingText="Tracking…">
                  Track
                </SubmitButton>
              </form>

              {boards.length > 0 ? (
                <ul className="space-y-2">
                  {boards.map((board) => (
                    <li
                      key={board.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        {board.companyName} <Badge variant="outline">{board.source}</Badge>{" "}
                        {board.active ? (
                          <Badge variant="accent">active</Badge>
                        ) : (
                          <Badge variant="default" className="text-muted">
                            paused
                          </Badge>
                        )}{" "}
                        {board.active && !board.autoSyncEnabled ? (
                          <Badge variant="default" className="text-muted">
                            auto-sync off
                          </Badge>
                        ) : null}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        {board.active ? (
                          <form action={syncBoard}>
                            <input type="hidden" name="boardId" value={board.id} />
                            <SubmitButton size="sm" variant="outline" pendingText="Syncing…">
                              Sync
                            </SubmitButton>
                          </form>
                        ) : null}
                        {board.active ? (
                          <form action={toggleBoardAutoSync}>
                            <input type="hidden" name="boardId" value={board.id} />
                            <input type="hidden" name="autoSyncEnabled" value={board.autoSyncEnabled ? "false" : "true"} />
                            <SubmitButton size="sm" variant="ghost" pendingText="…">
                              {board.autoSyncEnabled ? "Disable auto-sync" : "Enable auto-sync"}
                            </SubmitButton>
                          </form>
                        ) : null}
                        <form action={setBoardActive}>
                          <input type="hidden" name="boardId" value={board.id} />
                          <input type="hidden" name="active" value={board.active ? "false" : "true"} />
                          <SubmitButton
                            size="sm"
                            variant="ghost"
                            pendingText={board.active ? "Untracking…" : "Retracking…"}
                          >
                            {board.active ? "Untrack" : "Retrack"}
                          </SubmitButton>
                        </form>
                        {!board.active ? (
                          <form action={deleteBoard}>
                            <input type="hidden" name="boardId" value={board.id} />
                            <SubmitButton size="sm" variant="ghost" pendingText="Deleting…">
                              Delete
                            </SubmitButton>
                          </form>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted">No boards tracked yet — add one above.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aggregators</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(["remoteok", "arbeitnow"] as const).map((id) => (
                <div key={id} className="flex flex-wrap items-center gap-2">
                  <span className="text-sm capitalize">
                    {id}{" "}
                    {!isAggregatorAutoSyncOn(id) ? (
                      <Badge variant="default" className="text-muted">
                        auto-sync off
                      </Badge>
                    ) : null}
                  </span>
                  <form action={syncAggregator}>
                    <input type="hidden" name="source" value={id} />
                    <SubmitButton size="sm" variant="outline" pendingText="Syncing…">
                      Sync
                    </SubmitButton>
                  </form>
                  <form action={toggleAggregatorAutoSync}>
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="autoSyncEnabled" value={isAggregatorAutoSyncOn(id) ? "false" : "true"} />
                    <SubmitButton size="sm" variant="ghost" pendingText="…">
                      {isAggregatorAutoSyncOn(id) ? "Disable auto-sync" : "Enable auto-sync"}
                    </SubmitButton>
                  </form>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">LinkedIn saved searches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={addSavedSearch} className="grid gap-2 sm:grid-cols-2">
              <input name="name" placeholder="Search name" required className={inputClass} />
              <input name="keywords" placeholder="Keywords" className={inputClass} />
              <input name="location" placeholder="Location (e.g. Türkiye)" className={inputClass} />
              <select name="postedWithin" className={`${inputClass}`} defaultValue="">
                <option value="">Posted anytime</option>
                {POSTED_WITHIN_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    Last {value}
                  </option>
                ))}
              </select>
              <select name="experience" className={inputClass} defaultValue="">
                <option value="">Any experience</option>
                {EXPERIENCE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2 text-xs text-muted sm:col-span-2">
                {WORKPLACE_OPTIONS.map((value) => (
                  <label key={value} className="flex items-center gap-1">
                    <input type="checkbox" name="workplace" value={value} /> {value}
                  </label>
                ))}
                {JOB_TYPE_OPTIONS.map((value) => (
                  <label key={value} className="flex items-center gap-1">
                    <input type="checkbox" name="jobType" value={value} /> {value}
                  </label>
                ))}
                <label className="flex items-center gap-1">
                  <input type="checkbox" name="easyApplyOnly" /> Easy Apply only
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" name="fewApplicants" /> Few applicants
                </label>
              </div>
              <SubmitButton size="sm" pendingText="Saving…" className="sm:col-span-2 w-fit">
                Save search
              </SubmitButton>
            </form>

            {savedSearches.length > 0 ? (
              <ul className="space-y-2">
                {savedSearches.map((search) => (
                  <li
                    key={search.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {search.name}{" "}
                      <span className="text-xs text-muted">
                        {search.keywords || "any keywords"}
                        {search.location ? ` · ${search.location}` : ""}
                      </span>{" "}
                      {!search.active ? (
                        <Badge variant="default" className="text-muted">
                          auto-sync off
                        </Badge>
                      ) : null}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <form action={runSavedSearchAction}>
                        <input type="hidden" name="searchId" value={search.id} />
                        <SubmitButton size="sm" variant="outline" pendingText="Running…">
                          Run
                        </SubmitButton>
                      </form>
                      <form action={toggleSavedSearchAutoSync}>
                        <input type="hidden" name="searchId" value={search.id} />
                        <input type="hidden" name="active" value={search.active ? "false" : "true"} />
                        <SubmitButton size="sm" variant="ghost" pendingText="…">
                          {search.active ? "Disable auto-sync" : "Enable auto-sync"}
                        </SubmitButton>
                      </form>
                      <form action={deleteSavedSearch}>
                        <input type="hidden" name="searchId" value={search.id} />
                        <SubmitButton size="sm" variant="ghost" pendingText="Deleting…">
                          Delete
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">No saved searches yet — add one above.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Paste a job</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={pasteJob} className="space-y-2">
              <input name="title" placeholder="Title" required className={inputClass} />
              <input name="company" placeholder="Company" required className={inputClass} />
              <input name="url" placeholder="URL (optional)" className={inputClass} />
              <textarea
                name="rawText"
                placeholder="Paste job description"
                required
                rows={4}
                className={inputClass}
              />
              <SubmitButton size="sm" pendingText="Adding…">
                Add job
              </SubmitButton>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-muted">
              {prefs
                ? `Jobs matching preferences — ${filteredCount} total, showing ${filteredJobs.length} (page ${page} of ${totalPages})`
                : `Jobs — ${filteredCount} total, showing ${filteredJobs.length} (page ${page} of ${totalPages})`}
            </h2>
            {prefs ? (
              <form action={clearUnmatchedJobs}>
                <SubmitButton size="sm" variant="ghost" className="text-red-500" pendingText="Clearing…">
                  Clear all non-matching jobs
                </SubmitButton>
              </form>
            ) : null}
          </div>

          <form className="flex flex-wrap gap-2" action="/jobs">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search title, company, description…"
              className={`${inputClass} flex-1`}
            />
            <select name="source" defaultValue={sourceFilter ?? ""} className={`${inputClass} w-auto`}>
              <option value="">Any platform</option>
              {SOURCE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <SubmitButton size="sm" variant="outline" pendingText="Filtering…">
              Filter
            </SubmitButton>
            {q || sourceFilter ? (
              <Link href="/jobs" className="inline-flex items-center text-sm text-accent hover:underline">
                Clear filters
              </Link>
            ) : null}
          </form>

          {filteredJobs.length === 0 ? (
            <p className="text-sm text-muted">
              {prefs ? "No jobs match your search preferences yet." : "No jobs yet."}
            </p>
          ) : (
            <form action={discardSelectedJobs} className="space-y-2">
              <ul className="space-y-2">
                {filteredJobs.map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center gap-2 rounded-md border border-border p-3 text-sm transition-colors hover:border-accent/40"
                  >
                    <input type="checkbox" name="jobIds" value={job.id} className="shrink-0" />
                    <Link href={`/jobs/${job.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span className="min-w-0 truncate font-medium">
                        {job.title} <span className="font-normal text-muted">— {job.company}</span>
                      </span>
                      <Badge variant="outline" className="shrink-0">
                        {job.source}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
              <SubmitButton size="sm" variant="outline" className="text-red-500" pendingText="Discarding…">
                Discard selected
              </SubmitButton>
            </form>
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-2 text-sm">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="text-accent hover:underline">
                  ← Prev
                </Link>
              ) : (
                <span className="text-muted">← Prev</span>
              )}
              <span className="text-muted">
                {page} / {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={pageHref(page + 1)} className="text-accent hover:underline">
                  Next →
                </Link>
              ) : (
                <span className="text-muted">Next →</span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
