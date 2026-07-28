import { and, desc, eq, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, matches, profiles, searchPreferences } from "@/lib/db/schema";
import { preferenceWhereClause } from "@/lib/preferences";
import { matchJobToProfile } from "@/lib/matching";
import { profileDataSchema } from "@/lib/profile-schema";

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

  // Filter in SQL (preferences + not-already-matched) before LIMIT, so a
  // matching job further back in discovery order isn't skipped just because
  // a smaller unfiltered page was taken first.
  const conditions = [preferenceWhereClause(prefs), matchedJobIds.length > 0 ? notInArray(jobs.id, matchedJobIds) : undefined].filter(
    (condition): condition is NonNullable<typeof condition> => condition !== undefined,
  );

  const candidates = await db
    .select()
    .from(jobs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(jobs.discoveredAt))
    .limit(MAX_AUTO_MATCHES_PER_RUN);

  let matched = 0;
  for (let i = 0; i < candidates.length; i++) {
    const job = candidates[i]!;
    const result = await matchJobToProfile(job.title, job.company, job.rawDescription, profileData);
    if (result) {
      await db.insert(matches).values({
        jobId: job.id,
        profileId: profile.id,
        score: result.score,
        rationale: result.rationale,
      });
      matched += 1;
    }

    // Firing all 8 calls back-to-back reliably blew through Gemini
    // free-tier's requests-per-minute quota (429s from the very first
    // sync). Space them out instead of racing them.
    if (i < candidates.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return { matched, candidatesConsidered: candidates.length };
}
