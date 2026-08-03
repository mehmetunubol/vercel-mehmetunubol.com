import { NextResponse, type NextRequest } from "next/server";
import { getDriveAccessToken } from "@/lib/auth";
import { getOrCreateChecklistFolder, getOrCreateMonthFolder, uploadFile } from "@/lib/drive";
import { isChecklistKey } from "@/lib/checklist";

export async function POST(req: NextRequest) {
  const accessToken = await getDriveAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  const month = formData.get("month");
  const checklist = formData.get("checklist");

  if (!(file instanceof File) || typeof month !== "string" || !isChecklistKey(checklist)) {
    return NextResponse.json({ error: "missing file, month, or checklist" }, { status: 400 });
  }

  const folderId = await getOrCreateChecklistFolder(accessToken, checklist);
  const monthFolderId = await getOrCreateMonthFolder(accessToken, folderId, month);

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadFile(
    accessToken,
    monthFolderId,
    file.name,
    file.type || "application/octet-stream",
    buffer,
  );

  return NextResponse.json(uploaded);
}
