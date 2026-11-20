import { compare, hash } from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { badRequest, getCurrentUser, unauthorized } from "@/lib/session";
import { encryptedPrivateKeySchema } from "@/lib/validation";

// The browser re-encrypts the private key under the new password and sends
// it along, so changing a password keeps message history readable.
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const parsed = z
    .object({
      currentPassword: z.string().min(1).max(200),
      newPassword: z.string().min(MIN_PASSWORD_LENGTH).max(200),
      encryptedPrivateKey: encryptedPrivateKeySchema.nullable(),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return badRequest(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);

  if (!(await compare(parsed.data.currentPassword, me.passwordHash))) {
    return badRequest("Current password is incorrect.");
  }
  if (me.encryptedPrivateKey && !parsed.data.encryptedPrivateKey)
    return badRequest("missing key bundle");

  await db
    .update(users)
    .set({
      passwordHash: await hash(parsed.data.newPassword, 12),
      encryptedPrivateKey: parsed.data.encryptedPrivateKey ?? me.encryptedPrivateKey,
      // Signs out every other device; the client signs this one back in.
      tokenVersion: sql`${users.tokenVersion} + 1`,
    })
    .where(eq(users.id, me.id));
  return Response.json({ ok: true });
}
