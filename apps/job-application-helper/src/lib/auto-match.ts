import { desc, eq, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, matches, profiles, searchPreferences } from "@/lib/db/schema";
import { jobMatchesPreferences } from "@/lib/preferences";
import { matchJobToProfile } from "@/lib/matching";
import { profileDataSchema } from "@/lib/profile-schema";

const CANDIDATE_POOL_SIZE = 50;
const MAX_AUTO_MATCHES_PER_RUN = 8;

export async function autoMatchNewJobsForUser(userId: string) {
  const [prefs] = await db
    .select()
    .from(searchPreferences)
    .where(eq(searchPreferences.userId, userId))
    .limit(1);
  if (!prefs) return { matched: 0, skipped: "no search preferences configured" };

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .orderBy(desc(profiles.createdAt))
    .limit(1);
  if (!profile) return { matched: 0, skipped: "no profile" };

  const profileData = profileDataSchema.parse(profile.data);

  const alreadyMatched = await db
    .select({ jobId: matches.jobId })
    .from(matches)
    .where(eq(matches.profileId, profile.id));
  const matchedJobIds = alreadyMatched.map((row) => row.jobId);

  const recentJobs = await db
    .select()
    .from(jobs)
    .where(matchedJobIds.length > 0 ? notInArray(jobs.id, matchedJobIds) : undefined)
    .orderBy(desc(jobs.discoveredAt))
    .limit(CANDIDATE_POOL_SIZE);

  const candidates = recentJobs
    .filter((job) => jobMatchesPreferences(job, prefs))
    .slice(0, MAX_AUTO_MATCHES_PER_RUN);

  let matched = 0;
  for (const job of candidates) {
    const result = await matchJobToProfile(job.title, job.company, job.rawDescription, profileData);
    if (!result) continue;
    await db.insert(matches).values({
      jobId: job.id,
      profileId: profile.id,
      score: result.score,
      rationale: result.rationale,
    });
    matched += 1;
  }

  return { matched, candidatesConsidered: candidates.length };
}
