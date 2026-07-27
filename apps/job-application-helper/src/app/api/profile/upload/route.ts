import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { parseCvPdf } from "@/lib/cv-parser";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "only PDF uploads are supported" }, { status: 400 });
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const data = await parseCvPdf(base64);
  if (!data) {
    return NextResponse.json({ error: "failed to parse CV" }, { status: 502 });
  }

  const [profile] = await db
    .insert(profiles)
    .values({
      userId,
      source: "uploaded_cv",
      label: file.name,
      rawFileName: file.name,
      data,
    })
    .returning();

  return NextResponse.json({ profileId: profile!.id, data });
}
