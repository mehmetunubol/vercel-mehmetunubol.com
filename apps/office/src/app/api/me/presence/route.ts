import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { badRequest, getCurrentUser, unauthorized } from "@/lib/session";
import { presenceSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const parsed = presenceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("presence must be 'in' or 'out'");
  const presenceUpdatedAt = new Date();
  await db
    .update(users)
    .set({ presence: parsed.data.presence, presenceUpdatedAt })
    .where(eq(users.id, me.id));
  return Response.json({ presence: parsed.data.presence, presenceUpdatedAt });
}
