import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { badRequest, getCurrentUser, unauthorized } from "@/lib/session";
import { encryptedPrivateKeySchema, publicKeySchema } from "@/lib/validation";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  return Response.json({
    userId: me.id,
    publicKey: me.publicKey,
    encryptedPrivateKey: me.encryptedPrivateKey,
  });
}

/** First-time key setup only. Existing keys are replaced via password change / admin reset. */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const parsed = z
    .object({ publicKey: publicKeySchema, encryptedPrivateKey: encryptedPrivateKeySchema })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("invalid key bundle");

  const updated = await db
    .update(users)
    .set(parsed.data)
    .where(and(eq(users.id, me.id), isNull(users.publicKey)))
    .returning({ id: users.id });
  if (updated.length === 0) return Response.json({ error: "keys already exist" }, { status: 409 });
  return Response.json({ ok: true });
}
