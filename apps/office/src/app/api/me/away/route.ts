import { markAway } from "@/lib/online";
import { getCurrentUser, unauthorized } from "@/lib/session";

/** Sent (as a beacon) when the app is hidden or closed. */
export async function POST() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  await markAway(me.id);
  return new Response(null, { status: 204 });
}
