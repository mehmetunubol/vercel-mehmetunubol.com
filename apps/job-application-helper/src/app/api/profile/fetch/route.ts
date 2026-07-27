import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { profileDataSchema } from "@/lib/profile-schema";

export async function POST() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const webUrl = process.env.APPS_WEB_URL;
  const secret = process.env.PROFILE_API_SECRET;
  if (!webUrl || !secret) {
    return NextResponse.json({ error: "APPS_WEB_URL/PROFILE_API_SECRET not configured" }, { status: 500 });
  }

  const upstream = await fetch(`${webUrl}/api/profile`, {
    headers: { "x-profile-secret": secret },
    cache: "no-store",
  });
  if (!upstream.ok) {
    return NextResponse.json({ error: "failed to fetch profile from apps/web" }, { status: 502 });
  }

  const raw = await upstream.json();
  const data = profileDataSchema.parse(raw);

  const [profile] = await db
    .insert(profiles)
    .values({
      userId,
      source: "fetched_web",
      label: `Fetched from site ${new Date().toISOString().slice(0, 10)}`,
      data,
    })
    .returning();

  return NextResponse.json({ profileId: profile!.id, data });
}
