import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { autoMatchNewJobsForUser } from "@/lib/auto-match";
import { fetchArbeitnowJobs, fetchRemoteOkJobs } from "@/lib/ats/aggregators";
import { fetchGreenhouseJobs } from "@/lib/ats/greenhouse";
import { fetchLeverJobs } from "@/lib/ats/lever";
import { db } from "@/lib/db";
import {
  aggregatorSettings,
  linkedinSavedSearches,
  searchPreferences,
  syncStatus,
  trackedBoards,
} from "@/lib/db/schema";
import { recordSyncStatus, upsertJobs } from "@/lib/jobs";
import { runSavedSearch } from "@/lib/linkedin";

async function isAggregatorAutoSyncEnabled(id: string): Promise<boolean> {
  const [setting] = await db.select().from(aggregatorSettings).where(eq(aggregatorSettings.id, id)).limit(1);
  return setting?.autoSyncEnabled ?? true; // no row yet = default on
}

// Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET` — see
// vercel.json. Excluded from the auth proxy matcher (see src/proxy.ts).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: Record<string, number> = {};

  const boards = await db
    .select()
    .from(trackedBoards)
    .where(and(eq(trackedBoards.active, true), eq(trackedBoards.autoSyncEnabled, true)));
  for (const board of boards) {
    const normalized =
      board.source === "greenhouse"
        ? await fetchGreenhouseJobs(board.boardToken, board.companyName)
        : await fetchLeverJobs(board.boardToken, board.companyName);

    const { processed } = await upsertJobs(normalized, board.id);
    results[`board:${board.companyName}`] = processed;
    await db.update(trackedBoards).set({ lastFetchedAt: new Date() }).where(eq(trackedBoards.id, board.id));
  }

  if (await isAggregatorAutoSyncEnabled("remoteok")) {
    const remoteOk = await upsertJobs(await fetchRemoteOkJobs());
    results.remoteok = remoteOk.processed;
    await recordSyncStatus("aggregator:remoteok");
  }

  if (await isAggregatorAutoSyncEnabled("arbeitnow")) {
    const [arbeitnowStatus] = await db
      .select()
      .from(syncStatus)
      .where(eq(syncStatus.id, "aggregator:arbeitnow"))
      .limit(1);
    const arbeitnow = await upsertJobs(await fetchArbeitnowJobs(arbeitnowStatus?.lastSyncedAt.getTime()));
    results.arbeitnow = arbeitnow.processed;
    await recordSyncStatus("aggregator:arbeitnow");
  }

  const savedSearches = await db
    .select()
    .from(linkedinSavedSearches)
    .where(eq(linkedinSavedSearches.active, true));
  for (const savedSearch of savedSearches) {
    try {
      const normalized = await runSavedSearch(savedSearch);
      const { processed } = await upsertJobs(normalized);
      results[`linkedin:${savedSearch.name}`] = processed;
    } catch (error) {
      results[`linkedin:${savedSearch.name}`] = -1;
      console.error(`LinkedIn saved search "${savedSearch.name}" failed:`, error);
    }
    await db
      .update(linkedinSavedSearches)
      .set({ lastRunAt: new Date() })
      .where(eq(linkedinSavedSearches.id, savedSearch.id));
  }

  const usersWithPrefs = await db.select({ userId: searchPreferences.userId }).from(searchPreferences);
  const autoMatchResults: Record<string, unknown> = {};
  for (const { userId } of usersWithPrefs) {
    autoMatchResults[userId] = await autoMatchNewJobsForUser(userId);
  }

  return NextResponse.json({ ok: true, results, autoMatchResults });
}
