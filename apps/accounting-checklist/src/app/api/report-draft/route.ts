import { NextResponse, type NextRequest } from "next/server";
import { getDriveAccessToken } from "@/lib/auth";
import { downloadFile, getOrCreateChecklistFolder, readDefaults, readState } from "@/lib/drive";
import { CHECKLISTS, emptyMonthState, fieldDefault } from "@/lib/checklist";
import { buildMimeMessage, createGmailDraft, GmailDraftError, type MailAttachment } from "@/lib/gmail";
import {
  MAX_ATTACHMENT_BYTES,
  buildReportBody,
  normalizeRecipient,
  planReportEmail,
} from "@/lib/report-email";

// Several sequential Drive downloads plus a ~23 MB Gmail upload — give it
// an explicit budget rather than relying on the platform default.
export const maxDuration = 60;

// Creates (never sends) a Gmail draft for the month's Report checklist,
// with every uploaded document attached.
export async function POST(req: NextRequest) {
  const accessToken = await getDriveAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { month } = ((await req.json().catch(() => ({}))) ?? {}) as { month?: unknown };
  if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "missing month" }, { status: 400 });
  }

  const def = CHECKLISTS.report;
  const folderId = await getOrCreateChecklistFolder(accessToken, "report");
  const [state, defaults] = await Promise.all([
    readState(accessToken, folderId),
    readDefaults(accessToken, folderId),
  ]);
  const monthState = state.months[month] ?? emptyMonthState();

  const plan = planReportEmail(def.items, monthState, month);
  if (plan.files.length === 0) {
    return NextResponse.json({ error: "no_files" }, { status: 400 });
  }

  const titleOf = (itemIndex: number) => {
    const item = def.items.find((i) => i.index === itemIndex);
    return item?.emailLabel ?? item?.title ?? "Evrak";
  };

  const attachments: MailAttachment[] = [];
  const attached: { itemTitle: string; name: string }[] = [];
  const linked: { itemTitle: string; name: string; webViewLink: string }[] = [];
  // Couldn't be read at all (deleted, permission, network) — left out of
  // the email and reported back, never passed off as a working link.
  const failed: string[] = [];
  let totalBytes = 0;

  // Sequential on purpose: each file is checked against the budget that's
  // left, so peak memory stays at one file on top of what's been accepted,
  // and a file that won't fit is linked without being downloaded.
  for (const file of plan.files) {
    const itemTitle = titleOf(file.itemIndex);
    try {
      const downloaded = await downloadFile(accessToken, file.driveFileId, MAX_ATTACHMENT_BYTES - totalBytes);
      if (downloaded.kind === "too_large") {
        linked.push({ itemTitle, name: file.name, webViewLink: file.webViewLink });
        continue;
      }
      totalBytes += downloaded.size;
      attachments.push({ filename: file.name, mimeType: downloaded.mimeType, data: downloaded.data });
      attached.push({ itemTitle, name: file.name });
    } catch {
      failed.push(file.name);
    }
  }

  if (attached.length === 0 && linked.length === 0) {
    return NextResponse.json({ error: "download_failed", failed }, { status: 502 });
  }

  // Same resolution as the on-screen field: this month's value, else the
  // configured default.
  const emailField = def.items.flatMap((i) => i.fields).find((f) => f.key === "accountantEmail");
  const to = normalizeRecipient(
    monthState.fields.accountantEmail ?? (emailField ? fieldDefault(emailField, month, defaults) : undefined),
  );
  const mime = buildMimeMessage({
    to,
    subject: plan.subject,
    body: buildReportBody(month, attached, linked),
    attachments,
  });

  try {
    const { draftId, messageId } = await createGmailDraft(accessToken, mime);
    return NextResponse.json({
      draftId,
      gmailUrl: `https://mail.google.com/mail/u/0/#drafts?compose=${messageId}`,
      attachedCount: attached.length,
      linkedCount: linked.length,
      failed,
      to: to ?? null,
    });
  } catch (error) {
    if (error instanceof GmailDraftError) {
      const status = error.failure === "rate_limit" ? 429 : error.failure === "auth" ? 401 : 403;
      return NextResponse.json({ error: `gmail_${error.failure}` }, { status });
    }
    throw error;
  }
}
