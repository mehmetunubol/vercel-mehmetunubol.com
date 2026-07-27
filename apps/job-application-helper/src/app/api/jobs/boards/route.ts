import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { trackedBoards } from "@/lib/db/schema";

const bodySchema = z.object({
  source: z.enum(["greenhouse", "lever"]),
  boardToken: z.string().min(1),
  companyName: z.string().min(1),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = bodySchema.parse(await request.json());
  const [board] = await db.insert(trackedBoards).values(body).returning();

  return NextResponse.json({ board });
}
