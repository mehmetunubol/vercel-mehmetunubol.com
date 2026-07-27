import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { autoMatchNewJobsForUser } from "@/lib/auto-match";
import { fetchArbeitnowJobs, fetchRemoteOkJobs } from "@/lib/ats/aggregators";
import { fetchGreenhouseJobs } from "@/lib/ats/greenhouse";
import { fetchLeverJobs } from "@/lib/ats/lever";
import { db } from "@/lib/db";
import { searchPreferences, trackedBoards } from "@/lib/db/schema";
import { upsertJobs } from "@/lib/jobs";

// Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET` — see
// vercel.json. Excluded from the auth proxy matcher (see src/proxy.ts).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: Record<string, number> = {};

  const boards = await db.select().from(trackedBoards).where(eq(trackedBoards.active, true));
  for (const board of boards) {
    const normalized =
      board.source === "greenhouse"
        ? await fetchGreenhouseJobs(board.boardToken, board.companyName)
        : await fetchLeverJobs(board.boardToken, board.companyName);

    const { processed } = await upsertJobs(normalized, board.id);
    results[`board:${board.companyName}`] = processed;
    await db.update(trackedBoards).set({ lastFetchedAt: new Date() }).where(eq(trackedBoards.id, board.id));
  }

  const remoteOk = await upsertJobs(await fetchRemoteOkJobs());
  results.remoteok = remoteOk.processed;

  const arbeitnow = await upsertJobs(await fetchArbeitnowJobs());
  results.arbeitnow = arbeitnow.processed;

  const usersWithPrefs = await db.select({ userId: searchPreferences.userId }).from(searchPreferences);
  const autoMatchResults: Record<string, unknown> = {};
  for (const { userId } of usersWithPrefs) {
    autoMatchResults[userId] = await autoMatchNewJobsForUser(userId);
  }

  return NextResponse.json({ ok: true, results, autoMatchResults });
}
