import { NextResponse, type NextRequest } from "next/server";
import { getDriveAccessToken } from "@/lib/auth";
import { downloadFile, getOrCreateChecklistFolder, readDefaults, readState } from "@/lib/drive";
import { CHECKLISTS, emptyMonthState, withBuiltinDefaults } from "@/lib/checklist";
import { buildMimeMessage, createGmailDraft, GmailScopeError, type MailAttachment } from "@/lib/gmail";
import {
  MAX_ATTACHMENT_BYTES,
  buildReportBody,
  normalizeRecipient,
  planReportEmail,
} from "@/lib/report-email";

// Creates (never sends) a Gmail draft for the month's Report checklist,
// with every uploaded document attached.
export async function POST(req: NextRequest) {
  const accessToken = await getDriveAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { month } = (await req.json()) as { month?: unknown };
  if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "missing month" }, { status: 400 });
  }

  const def = CHECKLISTS.report;
  const folderId = await getOrCreateChecklistFolder(accessToken, "report");
  const [state, storedDefaults] = await Promise.all([
    readState(accessToken, folderId),
    readDefaults(accessToken, folderId),
  ]);
  const defaults = withBuiltinDefaults("report", storedDefaults);
  const monthState = state.months[month] ?? emptyMonthState();

  const plan = planReportEmail(def.items, monthState, month);
  if (plan.files.length === 0) {
    return NextResponse.json({ error: "no_files" }, { status: 400 });
  }

  const titleOf = (itemIndex: number) =>
    def.items.find((i) => i.index === itemIndex)?.title ?? "Evrak";

  const attachments: MailAttachment[] = [];
  const attached: { itemTitle: string; name: string }[] = [];
  const linked: { itemTitle: string; name: string; webViewLink: string }[] = [];
  let totalBytes = 0;

  // Sequential on purpose: keeps peak memory to one file at a time on top
  // of what's already been accepted, and stops downloading once full.
  for (const file of plan.files) {
    const itemTitle = titleOf(file.itemIndex);
    try {
      const downloaded = await downloadFile(accessToken, file.driveFileId);
      if (totalBytes + downloaded.size > MAX_ATTACHMENT_BYTES) {
        linked.push({ itemTitle, name: file.name, webViewLink: file.webViewLink });
        continue;
      }
      totalBytes += downloaded.size;
      attachments.push({ filename: file.name, mimeType: downloaded.mimeType, data: downloaded.data });
      attached.push({ itemTitle, name: file.name });
    } catch {
      // File deleted or unreadable — still give the accountant a link.
      linked.push({ itemTitle, name: file.name, webViewLink: file.webViewLink });
    }
  }

  const to = normalizeRecipient(monthState.fields.accountantEmail ?? defaults.fields.accountantEmail);
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
      missing: plan.missing,
      to: to ?? null,
    });
  } catch (error) {
    if (error instanceof GmailScopeError) {
      return NextResponse.json({ error: "gmail_scope" }, { status: 403 });
    }
    throw error;
  }
}
