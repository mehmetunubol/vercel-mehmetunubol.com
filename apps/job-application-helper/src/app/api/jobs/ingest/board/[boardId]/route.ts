import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { fetchGreenhouseJobs } from "@/lib/ats/greenhouse";
import { fetchLeverJobs } from "@/lib/ats/lever";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { trackedBoards } from "@/lib/db/schema";
import { upsertJobs } from "@/lib/jobs";

export async function POST(_request: Request, context: { params: Promise<{ boardId: string }> }) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { boardId } = await context.params;
  const [board] = await db.select().from(trackedBoards).where(eq(trackedBoards.id, boardId)).limit(1);
  if (!board) {
    return NextResponse.json({ error: "board not found" }, { status: 404 });
  }

  const normalized =
    board.source === "greenhouse"
      ? await fetchGreenhouseJobs(board.boardToken, board.companyName)
      : await fetchLeverJobs(board.boardToken, board.companyName);

  const result = await upsertJobs(normalized, board.id);
  await db.update(trackedBoards).set({ lastFetchedAt: new Date() }).where(eq(trackedBoards.id, board.id));

  return NextResponse.json(result);
}
