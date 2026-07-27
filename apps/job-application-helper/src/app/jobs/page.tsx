import { Button } from "@repo/ui";
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
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Jobs</h1>
        <Link href="/preferences" className="text-sm text-accent underline">
          Search preferences →
        </Link>
      </div>

      {recommended.length > 0 && (
        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="text-sm font-medium">Recommended for you</h2>
          <ul className="space-y-2">
            {recommended.map(({ job, score }) => (
              <li key={job.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                <Link href={`/jobs/${job.id}`} className="hover:underline">
                  {job.title} <span className="text-muted">— {job.company}</span>
                </Link>
                <span className="text-xs font-medium">{score}/100</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">Track a Greenhouse or Lever board</h2>
        <form action={addBoard} className="flex flex-wrap gap-2">
          <select name="source" className="rounded-md border border-border bg-transparent px-2 py-1 text-sm">
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
          </select>
          <input
            name="boardToken"
            placeholder="board token / site slug"
            required
            className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
          />
          <input
            name="companyName"
            placeholder="Company name"
            required
            className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
          />
          <Button type="submit" size="sm">
            Track
          </Button>
        </form>

        {boards.length > 0 && (
          <ul className="space-y-2">
            {boards.map((board) => (
              <li key={board.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                <span>
                  {board.companyName} ({board.source}: {board.boardToken})
                </span>
                <form action={syncBoard}>
                  <input type="hidden" name="boardId" value={board.id} />
                  <Button type="submit" size="sm" variant="outline">
                    Sync
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">Aggregators</h2>
        <div className="flex gap-2">
          <form action={syncAggregator}>
            <input type="hidden" name="source" value="remoteok" />
            <Button type="submit" size="sm" variant="outline">
              Sync RemoteOK
            </Button>
          </form>
          <form action={syncAggregator}>
            <input type="hidden" name="source" value="arbeitnow" />
            <Button type="submit" size="sm" variant="outline">
              Sync Arbeitnow
            </Button>
          </form>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">Paste a job</h2>
        <form action={pasteJob} className="space-y-2">
          <input
            name="title"
            placeholder="Title"
            required
            className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm"
          />
          <input
            name="company"
            placeholder="Company"
            required
            className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm"
          />
          <input
            name="url"
            placeholder="URL (optional)"
            className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm"
          />
          <textarea
            name="rawText"
            placeholder="Paste job description"
            required
            rows={4}
            className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm"
          />
          <Button type="submit" size="sm">
            Add job
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">
          Jobs ({filteredJobs.length}
          {prefs ? ` of ${jobList.length}, filtered by preferences` : ""})
        </h2>
        {filteredJobs.length === 0 ? (
          <p className="text-sm text-muted">
            {prefs ? "No jobs match your search preferences yet." : "No jobs yet."}
          </p>
        ) : (
          <ul className="space-y-2">
            {filteredJobs.map((job) => (
              <li key={job.id} className="rounded-md border border-border p-3 text-sm">
                <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">
                  {job.title}
                </Link>{" "}
                <span className="text-muted">
                  — {job.company} ({job.source})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
