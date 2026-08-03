import { NextResponse, type NextRequest } from "next/server";
import { getDriveAccessToken } from "@/lib/auth";
import { getOrCreateRootFolder, readState, writeState } from "@/lib/drive";
import { checklistStateSchema } from "@/lib/checklist";

export async function GET(req: NextRequest) {
  const accessToken = await getDriveAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rootFolderId = await getOrCreateRootFolder(accessToken);
  const state = await readState(accessToken, rootFolderId);
  return NextResponse.json(state);
}

export async function PATCH(req: NextRequest) {
  const accessToken = await getDriveAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = checklistStateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid state" }, { status: 400 });
  }

  const rootFolderId = await getOrCreateRootFolder(accessToken);
  await writeState(accessToken, rootFolderId, parsed.data);
  return NextResponse.json({ ok: true });
}
