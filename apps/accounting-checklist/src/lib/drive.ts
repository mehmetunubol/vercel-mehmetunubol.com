import { google, type drive_v3 } from "googleapis";
import { Readable } from "node:stream";
import {
  CHECKLISTS,
  EMPTY_DEFAULTS,
  EMPTY_STATE,
  parseChecklistDefaults,
  parseChecklistState,
  type ChecklistDefaults,
  type ChecklistKey,
  type ChecklistState,
} from "@/lib/checklist";

const PARENT_FOLDER_NAME = "Accounting Checklist";
const STATE_FILE_NAME = "state.json";
const DEFAULTS_FILE_NAME = "defaults.json";
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

// Drive allows multiple files with the same name in one folder, so a race
// between overlapping requests (e.g. rapid edits before debouncing) can
// each independently see "no file yet" and create their own. This is a
// self-healing safety net: if duplicates are ever found, keep the most
// recently modified one and delete the rest, rather than letting them pile
// up. Only used for our own generated JSON/doc files, never for folders
// (which may hold irreplaceable user-uploaded receipts).
async function findFile(
  drive: drive_v3.Drive,
  name: string,
  parentId: string,
): Promise<string | null> {
  const existing = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and trashed=false`,
    fields: "files(id, name, modifiedTime)",
    orderBy: "modifiedTime desc",
    spaces: "drive",
  });

  const files = existing.data.files ?? [];
  const [keep, ...duplicates] = files;
  if (!keep?.id) return null;

  if (duplicates.length > 0) {
    await Promise.all(
      duplicates.map((f) => (f.id ? drive.files.delete({ fileId: f.id }) : Promise.resolve())),
    );
  }

  return keep.id;
}

// Resolves to the nested "Accounting Checklist/<checklist folder>" folder —
// this becomes the effective "root" for that checklist's state.json and
// month subfolders, keeping each checklist's data physically separate.
export async function getOrCreateChecklistFolder(
  accessToken: string,
  checklistKey: ChecklistKey,
): Promise<string> {
  const drive = driveClient(accessToken);
  const parentId = await findOrCreateFolder(drive, PARENT_FOLDER_NAME);
  return findOrCreateFolder(drive, CHECKLISTS[checklistKey].driveFolder, parentId);
}

export async function getOrCreateMonthFolder(
  accessToken: string,
  rootFolderId: string,
  monthKey: string,
): Promise<string> {
  return findOrCreateFolder(driveClient(accessToken), monthKey, rootFolderId);
}

async function readJsonFile<T>(
  drive: drive_v3.Drive,
  fileName: string,
  folderId: string,
  parse: (raw: unknown) => T,
  fallback: T,
): Promise<T> {
  const fileId = await findFile(drive, fileName, folderId);
  if (!fileId) return fallback;

  const response = await drive.files.get({ fileId, alt: "media" }, { responseType: "json" });
  return parse(response.data);
}

async function writeJsonFile(
  drive: drive_v3.Drive,
  fileName: string,
  folderId: string,
  data: unknown,
): Promise<void> {
  const fileId = await findFile(drive, fileName, folderId);
  const body = Readable.from([JSON.stringify(data, null, 2)]);
  const media = { mimeType: "application/json", body };

  if (fileId) {
    await drive.files.update({ fileId, media });
    return;
  }

  await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media,
    fields: "id",
  });
}

export async function readState(accessToken: string, rootFolderId: string): Promise<ChecklistState> {
  return readJsonFile(driveClient(accessToken), STATE_FILE_NAME, rootFolderId, parseChecklistState, EMPTY_STATE);
}

export async function writeState(
  accessToken: string,
  rootFolderId: string,
  state: ChecklistState,
): Promise<void> {
  return writeJsonFile(driveClient(accessToken), STATE_FILE_NAME, rootFolderId, state);
}

export async function readDefaults(
  accessToken: string,
  rootFolderId: string,
): Promise<ChecklistDefaults> {
  return readJsonFile(
    driveClient(accessToken),
    DEFAULTS_FILE_NAME,
    rootFolderId,
    parseChecklistDefaults,
    EMPTY_DEFAULTS,
  );
}

export async function writeDefaults(
  accessToken: string,
  rootFolderId: string,
  defaults: ChecklistDefaults,
): Promise<void> {
  return writeJsonFile(driveClient(accessToken), DEFAULTS_FILE_NAME, rootFolderId, defaults);
}

const SUMMARY_FILE_NAME = "Summary";
const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";

// Re-created (not updated in place) each time — Drive's HTML-to-Doc import
// conversion is simplest and most reliable on create, and a printable
// summary has no history worth preserving between regenerations.
export async function upsertSummaryDoc(
  accessToken: string,
  monthFolderId: string,
  html: string,
): Promise<{ id: string; webViewLink: string }> {
  const drive = driveClient(accessToken);
  const existingId = await findFile(drive, SUMMARY_FILE_NAME, monthFolderId);
  if (existingId) {
    await drive.files.delete({ fileId: existingId });
  }

  const created = await drive.files.create({
    requestBody: { name: SUMMARY_FILE_NAME, mimeType: GOOGLE_DOC_MIME, parents: [monthFolderId] },
    media: { mimeType: "text/html", body: Readable.from([html]) },
    fields: "id, webViewLink",
  });

  if (!created.data.id || !created.data.webViewLink) {
    throw new Error("Failed to create summary doc");
  }

  return { id: created.data.id, webViewLink: created.data.webViewLink };
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
