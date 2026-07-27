import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchArbeitnowJobs, fetchRemoteOkJobs } from "@/lib/ats/aggregators";
import { requireUserId } from "@/lib/auth";
import { upsertJobs } from "@/lib/jobs";

const bodySchema = z.object({ source: z.enum(["remoteok", "arbeitnow"]) });

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { source } = bodySchema.parse(await request.json());
  const normalized = source === "remoteok" ? await fetchRemoteOkJobs() : await fetchArbeitnowJobs();
  const result = await upsertJobs(normalized);

  return NextResponse.json(result);
}
