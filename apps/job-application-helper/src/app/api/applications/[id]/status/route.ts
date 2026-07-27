import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicationStatusEnum, applications } from "@/lib/db/schema";

const bodySchema = z.object({ status: z.enum(applicationStatusEnum.enumValues) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = bodySchema.parse(await request.json());

  const [updated] = await db
    .update(applications)
    .set({ status, updatedAt: new Date() })
    .where(eq(applications.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
