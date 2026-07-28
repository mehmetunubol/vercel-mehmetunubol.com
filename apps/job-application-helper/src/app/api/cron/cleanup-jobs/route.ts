import { and, eq, lt, notExists } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applications, jobs, matches } from "@/lib/db/schema";

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

// Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET` — see
// vercel.json. Excluded from the auth proxy matcher (see src/proxy.ts).
//
// Deletes jobs older than a week that never got scored (no match row) and
// were never carried into an application (no application row) — i.e. jobs
// nobody acted on. Anything matched or applied-to is kept regardless of age.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_MS);

  const deleted = await db
    .delete(jobs)
    .where(
      and(
        lt(jobs.discoveredAt, cutoff),
        notExists(db.select().from(matches).where(eq(matches.jobId, jobs.id))),
        notExists(db.select().from(applications).where(eq(applications.jobId, jobs.id))),
      ),
    )
    .returning({ id: jobs.id });

  return NextResponse.json({ ok: true, deleted: deleted.length });
}
