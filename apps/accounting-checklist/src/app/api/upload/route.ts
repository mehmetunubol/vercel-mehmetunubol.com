import { NextResponse, type NextRequest } from "next/server";
import { getDriveAccessToken } from "@/lib/auth";
import { getOrCreateRootFolder, getOrCreateMonthFolder, uploadFile } from "@/lib/drive";

export async function POST(req: NextRequest) {
  const accessToken = await getDriveAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  const month = formData.get("month");

  if (!(file instanceof File) || typeof month !== "string") {
    return NextResponse.json({ error: "missing file or month" }, { status: 400 });
  }

  const rootFolderId = await getOrCreateRootFolder(accessToken);
  const monthFolderId = await getOrCreateMonthFolder(accessToken, rootFolderId, month);

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
