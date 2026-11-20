import { deleteExpiredMessages } from "@/lib/cleanup";

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  await deleteExpiredMessages(true);
  return Response.json({ ok: true });
}
