import { NextResponse, type NextRequest } from "next/server";
import { getDriveAccessToken } from "@/lib/auth";
import { getOrCreateChecklistFolder, readDefaults, writeDefaults } from "@/lib/drive";
import { checklistDefaultsInputSchema, isChecklistKey } from "@/lib/checklist";

export async function GET(req: NextRequest) {
  const accessToken = await getDriveAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const checklist = req.nextUrl.searchParams.get("checklist");
  if (!isChecklistKey(checklist)) {
    return NextResponse.json({ error: "invalid checklist" }, { status: 400 });
  }

  const folderId = await getOrCreateChecklistFolder(accessToken, checklist);
  const defaults = await readDefaults(accessToken, folderId);
  return NextResponse.json(defaults);
}

export async function PATCH(req: NextRequest) {
  const accessToken = await getDriveAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const checklist = req.nextUrl.searchParams.get("checklist");
  if (!isChecklistKey(checklist)) {
    return NextResponse.json({ error: "invalid checklist" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = checklistDefaultsInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid defaults" }, { status: 400 });
  }

  const folderId = await getOrCreateChecklistFolder(accessToken, checklist);
  await writeDefaults(accessToken, folderId, parsed.data);
  return NextResponse.json({ ok: true });
}
