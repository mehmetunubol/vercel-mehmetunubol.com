import { google, type drive_v3 } from "googleapis";
import { Readable } from "node:stream";
import { EMPTY_STATE, parseChecklistState, type ChecklistState } from "@/lib/checklist";

const ROOT_FOLDER_NAME = "Accounting Checklist";
const STATE_FILE_NAME = "state.json";
const FOLDER_MIME = "application/vnd.google-apps.folder";

function driveClient(accessToken: string): drive_v3.Drive {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth });
}

async function findOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string,
): Promise<string> {
  const parentClause = parentId ? ` and '${parentId}' in parents` : "";
  const query = `name='${name}' and mimeType='${FOLDER_MIME}' and trashed=false${parentClause}`;

  const existing = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });

  const found = existing.data.files?.[0];
  if (found?.id) return found.id;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME,
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id",
  });

  if (!created.data.id) throw new Error(`Failed to create Drive folder "${name}"`);
  return created.data.id;
}

async function findFile(
  drive: drive_v3.Drive,
  name: string,
  parentId: string,
): Promise<string | null> {
  const existing = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  return existing.data.files?.[0]?.id ?? null;
}

export async function getOrCreateRootFolder(accessToken: string): Promise<string> {
  return findOrCreateFolder(driveClient(accessToken), ROOT_FOLDER_NAME);
}

export async function getOrCreateMonthFolder(
  accessToken: string,
  rootFolderId: string,
  monthKey: string,
): Promise<string> {
  return findOrCreateFolder(driveClient(accessToken), monthKey, rootFolderId);
}

export async function readState(accessToken: string, rootFolderId: string): Promise<ChecklistState> {
  const drive = driveClient(accessToken);
  const fileId = await findFile(drive, STATE_FILE_NAME, rootFolderId);
  if (!fileId) return EMPTY_STATE;

  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "json" },
  );
  return parseChecklistState(response.data);
}

export async function writeState(
  accessToken: string,
  rootFolderId: string,
  state: ChecklistState,
): Promise<void> {
  const drive = driveClient(accessToken);
  const fileId = await findFile(drive, STATE_FILE_NAME, rootFolderId);
  const body = Readable.from([JSON.stringify(state, null, 2)]);
  const media = { mimeType: "application/json", body };

  if (fileId) {
    await drive.files.update({ fileId, media });
    return;
  }

  await drive.files.create({
    requestBody: { name: STATE_FILE_NAME, parents: [rootFolderId] },
    media,
    fields: "id",
  });
}

export async function uploadFile(
  accessToken: string,
  monthFolderId: string,
  filename: string,
  mimeType: string,
  buffer: Buffer,
): Promise<{ id: string; webViewLink: string }> {
  const drive = driveClient(accessToken);
  const created = await drive.files.create({
    requestBody: { name: filename, parents: [monthFolderId] },
    media: { mimeType, body: Readable.from([buffer]) },
    fields: "id, webViewLink",
  });

  if (!created.data.id || !created.data.webViewLink) {
    throw new Error(`Failed to upload "${filename}" to Drive`);
  }

  return { id: created.data.id, webViewLink: created.data.webViewLink };
}
