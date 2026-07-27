import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { jobs, profiles } from "@/lib/db/schema";
import { profileDataSchema } from "@/lib/profile-schema";
import { generateCoverLetter } from "@/lib/cover-letter";

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
  const coverLetter = await generateCoverLetter(job.title, job.company, job.rawDescription, profileData);
  if (!coverLetter) {
    return NextResponse.json({ error: "failed to generate cover letter" }, { status: 502 });
  }

  return NextResponse.json({ coverLetter });
}
