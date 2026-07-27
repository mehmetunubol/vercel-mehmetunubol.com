import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { jobs, matches, profiles } from "@/lib/db/schema";
import { profileDataSchema } from "@/lib/profile-schema";
import { matchJobToProfile } from "@/lib/matching";

const bodySchema = z.object({ profileId: z.string() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await context.params;
  const { profileId } = bodySchema.parse(await request.json());

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!job || !profile) {
    return NextResponse.json({ error: "job or profile not found" }, { status: 404 });
  }

  const profileData = profileDataSchema.parse(profile.data);
  const result = await matchJobToProfile(job.title, job.company, job.rawDescription, profileData);
  if (!result) {
    return NextResponse.json({ error: "failed to match" }, { status: 502 });
  }

  const [match] = await db
    .insert(matches)
    .values({ jobId, profileId, score: result.score, rationale: result.rationale })
    .returning();

  return NextResponse.json({ matchId: match!.id, score: result.score, rationale: result.rationale });
}
