import { deleteExpiredMessages } from "@/lib/cleanup";
import { deleteOldEvents } from "@/lib/events";

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  await Promise.all([deleteExpiredMessages(true), deleteOldEvents(true)]);
  return Response.json({ ok: true });
}
