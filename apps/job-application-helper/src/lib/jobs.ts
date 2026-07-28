import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, syncStatus, type jobSourceEnum } from "@/lib/db/schema";

export interface NormalizedJob {
  source: (typeof jobSourceEnum.enumValues)[number];
  externalId: string;
  url: string;
  title: string;
  company: string;
  location?: string;
  rawDescription: string;
  postedAt?: Date;
}

const BATCH_SIZE = 200;

export async function upsertJobs(normalized: NormalizedJob[], trackedBoardId?: string) {
  if (normalized.length === 0) return { processed: 0 };

  for (let i = 0; i < normalized.length; i += BATCH_SIZE) {
    const batch = normalized.slice(i, i + BATCH_SIZE).map((job) => ({ ...job, trackedBoardId }));

    await db
      .insert(jobs)
      .values(batch)
      .onConflictDoUpdate({
        target: [jobs.source, jobs.externalId],
        set: {
          url: sql`excluded.url`,
          title: sql`excluded.title`,
          company: sql`excluded.company`,
          location: sql`excluded.location`,
          rawDescription: sql`excluded.raw_description`,
          postedAt: sql`excluded.posted_at`,
        },
      });
  }

  return { processed: normalized.length };
}

/** Records when an aggregator (or any non-tracked-board target) last synced. */
export async function recordSyncStatus(id: string) {
  await db
    .insert(syncStatus)
    .values({ id, lastSyncedAt: new Date() })
    .onConflictDoUpdate({ target: syncStatus.id, set: { lastSyncedAt: new Date() } });
}
