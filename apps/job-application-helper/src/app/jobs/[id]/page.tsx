import { Button } from "@repo/ui";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { generateCoverLetter } from "@/lib/cover-letter";
import { db } from "@/lib/db";
import { applications, jobs, matches, profiles } from "@/lib/db/schema";
import { matchJobToProfile } from "@/lib/matching";
import { profileDataSchema } from "@/lib/profile-schema";

async function runMatch(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const jobId = formData.get("jobId");
  const profileId = formData.get("profileId");
  if (typeof jobId !== "string" || typeof profileId !== "string") return;

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!job || !profile) return;

  const profileData = profileDataSchema.parse(profile.data);
  const result = await matchJobToProfile(job.title, job.company, job.rawDescription, profileData);
  if (!result) return;

  await db.insert(matches).values({ jobId, profileId, score: result.score, rationale: result.rationale });
  revalidatePath(`/jobs/${jobId}`);
}

async function draftCoverLetter(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const jobId = formData.get("jobId");
  const profileId = formData.get("profileId");
  if (typeof jobId !== "string" || typeof profileId !== "string") return;

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!job || !profile) return;

  const profileData = profileDataSchema.parse(profile.data);
  const coverLetter = await generateCoverLetter(job.title, job.company, job.rawDescription, profileData);
  if (!coverLetter) return;

  const [existing] = await db
    .select()
    .from(applications)
    .where(eq(applications.jobId, jobId))
    .limit(1);

  if (existing) {
    await db.update(applications).set({ coverLetter, updatedAt: new Date() }).where(eq(applications.id, existing.id));
  } else {
    await db.insert(applications).values({ userId, jobId, profileId, coverLetter, status: "drafted" });
  }
  revalidatePath(`/jobs/${jobId}`);
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) notFound();

  const userId = await requireUserId();
  const userProfiles = userId
    ? await db.select().from(profiles).where(eq(profiles.userId, userId)).orderBy(desc(profiles.createdAt))
    : [];
  const latestProfile = userProfiles[0];

  const [latestMatch] = await db
    .select()
    .from(matches)
    .where(eq(matches.jobId, id))
    .orderBy(desc(matches.createdAt))
    .limit(1);

  const [application] = await db.select().from(applications).where(eq(applications.jobId, id)).limit(1);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <div>
        <h1 className="text-lg font-semibold">{job.title}</h1>
        <p className="text-sm text-muted">
          {job.company} {job.location ? `— ${job.location}` : ""} · {job.source}
        </p>
        {job.url ? (
          <a href={job.url} target="_blank" rel="noreferrer" className="text-sm text-accent underline">
            View posting
          </a>
        ) : null}
      </div>

      {latestProfile ? (
        <div className="flex gap-2">
          <form action={runMatch}>
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="profileId" value={latestProfile.id} />
            <Button type="submit" size="sm">
              Match against profile
            </Button>
          </form>
          <form action={draftCoverLetter}>
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="profileId" value={latestProfile.id} />
            <Button type="submit" size="sm" variant="outline">
              Draft cover letter
            </Button>
          </form>
        </div>
      ) : (
        <p className="text-sm text-muted">No profile yet — visit /profile to fetch or upload one first.</p>
      )}

      {latestMatch ? (
        <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
          <p className="font-medium">Match score: {latestMatch.score}/100</p>
          <p>{(latestMatch.rationale as { summary?: string }).summary}</p>
        </div>
      ) : null}

      {application?.coverLetter ? (
        <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
          <p className="font-medium">Cover letter draft</p>
          <p className="whitespace-pre-wrap">{application.coverLetter}</p>
        </div>
      ) : null}

      <div className="prose prose-sm max-w-none rounded-lg border border-border p-4 text-sm whitespace-pre-wrap">
        {job.rawDescription}
      </div>
    </main>
  );
}
