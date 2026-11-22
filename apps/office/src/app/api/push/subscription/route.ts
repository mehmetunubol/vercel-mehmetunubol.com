import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { pushPublicKey } from "@/lib/push";
import { badRequest, getCurrentUser, unauthorized } from "@/lib/session";

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(64) }),
});

/** The VAPID public key the browser needs to subscribe (null if push isn't set up). */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  return Response.json({ publicKey: pushPublicKey() });
}

/** Saves this device's subscription for the signed-in user. */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("invalid subscription");
  const { endpoint, keys } = parsed.data;
  await db
    .insert(pushSubscriptions)
    .values({ userId: me.id, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: me.id, p256dh: keys.p256dh, auth: keys.auth },
    });
  return Response.json({ ok: true });
}

/** Removes this device's subscription. */
export async function DELETE(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const parsed = z
    .object({ endpoint: z.string().max(1000) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("invalid endpoint");
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, parsed.data.endpoint),
        eq(pushSubscriptions.userId, me.id),
      ),
    );
  return Response.json({ ok: true });
}
