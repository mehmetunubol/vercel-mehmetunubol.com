import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { upsertJobs } from "@/lib/jobs";

const bodySchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  rawText: z.string().min(1),
  url: z.string().url().optional(),
  location: z.string().optional(),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = bodySchema.parse(await request.json());
  const result = await upsertJobs([
    {
      source: "manual",
      externalId: randomUUID(),
      url: body.url ?? "",
      title: body.title,
      company: body.company,
      location: body.location,
      rawDescription: body.rawText,
    },
  ]);

  return NextResponse.json(result);
}
