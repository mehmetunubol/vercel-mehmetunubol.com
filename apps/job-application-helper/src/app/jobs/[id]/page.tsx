import { Badge, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { generateCoverLetter } from "@/lib/cover-letter";
import { db } from "@/lib/db";
import { applications, jobs, matches, profiles } from "@/lib/db/schema";
import { isGeminiQuotaExhaustedForToday } from "@/lib/gemini";
import { matchJobToProfile } from "@/lib/matching";
import { profileDataSchema } from "@/lib/profile-schema";
import { AppShell } from "@/components/app-shell";
import { ActionForm, type ActionResult } from "@/components/action-form";

function geminiFailureMessage(): string {
  return isGeminiQuotaExhaustedForToday()
    ? "Gemini's free-tier daily quota (20 requests) is used up — try again after it resets."
    : "Gemini didn't return a result (transient error) — try again in a bit.";
}

async function runMatch(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  "use server";
  const userId = await requireUserId();
  if (!userId) return { ok: false, message: "Not signed in." };

  const jobId = formData.get("jobId");
  const profileId = formData.get("profileId");
  if (typeof jobId !== "string" || typeof profileId !== "string") {
    return { ok: false, message: "Missing job or profile." };
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!job || !profile) return { ok: false, message: "Job or profile no longer exists." };

  const profileData = profileDataSchema.parse(profile.data);
  const result = await matchJobToProfile(job.title, job.company, job.rawDescription, profileData, job.location);
  if (!result) return { ok: false, message: geminiFailureMessage() };

  await db.insert(matches).values({ jobId, profileId, score: result.score, rationale: result.rationale });
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

async function draftCoverLetter(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  "use server";
  const userId = await requireUserId();
  if (!userId) return { ok: false, message: "Not signed in." };

  const jobId = formData.get("jobId");
  const profileId = formData.get("profileId");
  if (typeof jobId !== "string" || typeof profileId !== "string") {
    return { ok: false, message: "Missing job or profile." };
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!job || !profile) return { ok: false, message: "Job or profile no longer exists." };

  const profileData = profileDataSchema.parse(profile.data);
  const coverLetter = await generateCoverLetter(job.title, job.company, job.rawDescription, profileData);
  if (!coverLetter) return { ok: false, message: geminiFailureMessage() };

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
  return { ok: true };
}

async function trackApplication(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  "use server";
  const userId = await requireUserId();
  if (!userId) return { ok: false, message: "Not signed in." };

  const jobId = formData.get("jobId");
  const profileId = formData.get("profileId");
  if (typeof jobId !== "string" || typeof profileId !== "string") {
    return { ok: false, message: "Missing job or profile." };
  }

  const [existing] = await db.select().from(applications).where(eq(applications.jobId, jobId)).limit(1);
  if (existing) return { ok: true };

  const [latestMatch] = await db
    .select()
    .from(matches)
    .where(and(eq(matches.jobId, jobId), eq(matches.profileId, profileId)))
    .orderBy(desc(matches.createdAt))
    .limit(1);

  await db.insert(applications).values({
    userId,
    jobId,
    profileId,
    matchId: latestMatch?.id,
    status: latestMatch ? "matched" : "discovered",
  });
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/applications");
  return { ok: true };
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
    <AppShell>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
            <Badge variant="outline">{job.source}</Badge>
          </div>
          <p className="text-sm text-muted">
            {job.company}
            {job.location ? ` — ${job.location}` : ""}
          </p>
          {job.url ? (
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm text-accent hover:underline"
            >
              View original posting →
            </a>
          ) : null}
        </div>

        {latestProfile ? (
          <div className="flex flex-wrap items-start gap-2">
            <ActionForm
              action={runMatch}
              hiddenFields={{ jobId: job.id, profileId: latestProfile.id }}
              submitLabel={latestMatch ? "Re-run match" : "Match against profile"}
              pendingText="Scoring…"
              size="sm"
            />
            <ActionForm
              action={draftCoverLetter}
              hiddenFields={{ jobId: job.id, profileId: latestProfile.id }}
              submitLabel="Draft cover letter"
              pendingText="Drafting…"
              size="sm"
              variant="outline"
            />
            {!application ? (
              <ActionForm
                action={trackApplication}
                hiddenFields={{ jobId: job.id, profileId: latestProfile.id }}
                submitLabel="Track in applications"
                pendingText="Adding…"
                size="sm"
                variant="outline"
              />
            ) : (
              <Badge variant="accent" className="self-center">
                Tracked — {application.status}
              </Badge>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">No profile yet — visit Profile to fetch or upload one first.</p>
        )}

        {latestMatch ? (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Match score</CardTitle>
              <Badge variant={latestMatch.score >= 70 ? "accent" : "default"} className="tabular-nums">
                {latestMatch.score}/100
              </Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted">
              {(latestMatch.rationale as { summary?: string }).summary}
            </CardContent>
          </Card>
        ) : null}

        {application?.coverLetter ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cover letter draft</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm">{application.coverLetter}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="whitespace-pre-wrap p-6 text-sm text-muted">{job.rawDescription}</CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
