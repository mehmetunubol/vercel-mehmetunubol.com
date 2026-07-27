import { Badge, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { autoMatchNewJobsForUser } from "@/lib/auto-match";
import { fetchArbeitnowJobs, fetchRemoteOkJobs } from "@/lib/ats/aggregators";
import { fetchGreenhouseJobs } from "@/lib/ats/greenhouse";
import { fetchLeverJobs } from "@/lib/ats/lever";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { jobs, matches, profiles, searchPreferences, trackedBoards } from "@/lib/db/schema";
import { upsertJobs } from "@/lib/jobs";
import { jobMatchesPreferences } from "@/lib/preferences";
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

async function syncAggregator(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const source = formData.get("source");
  if (source !== "remoteok" && source !== "arbeitnow") return;

  const normalized = source === "remoteok" ? await fetchRemoteOkJobs() : await fetchArbeitnowJobs();
  await upsertJobs(normalized);
  await autoMatchNewJobsForUser(userId);
  revalidatePath("/jobs");
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

export default async function JobsPage() {
  const userId = await requireUserId();
  const boards = await db.select().from(trackedBoards).orderBy(desc(trackedBoards.createdAt));
  const jobList = await db.select().from(jobs).orderBy(desc(jobs.discoveredAt)).limit(50);

  const [prefs] = userId
    ? await db.select().from(searchPreferences).where(eq(searchPreferences.userId, userId)).limit(1)
    : [];
  const filteredJobs = prefs ? jobList.filter((job) => jobMatchesPreferences(job, prefs)) : jobList;

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
                        )}
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
            <CardContent>
              <div className="flex gap-2">
                <form action={syncAggregator}>
                  <input type="hidden" name="source" value="remoteok" />
                  <SubmitButton size="sm" variant="outline" pendingText="Syncing…">
                    Sync RemoteOK
                  </SubmitButton>
                </form>
                <form action={syncAggregator}>
                  <input type="hidden" name="source" value="arbeitnow" />
                  <SubmitButton size="sm" variant="outline" pendingText="Syncing…">
                    Sync Arbeitnow
                  </SubmitButton>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

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
          <h2 className="text-sm font-medium text-muted">
            Jobs — {filteredJobs.length}
            {prefs ? ` of ${jobList.length}, filtered by preferences` : ""}
          </h2>
          {filteredJobs.length === 0 ? (
            <p className="text-sm text-muted">
              {prefs ? "No jobs match your search preferences yet." : "No jobs yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredJobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm transition-colors hover:border-accent/40"
                  >
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
          )}
        </div>
      </div>
    </AppShell>
  );
}
