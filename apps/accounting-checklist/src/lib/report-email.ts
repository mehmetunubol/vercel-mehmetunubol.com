import type { ChecklistItemDef, MonthState } from "@/lib/checklist";

// Gmail rejects messages over 25 MB, and base64 inflates attachments by
// ~4/3 — so cap raw attachment bytes well below that. Anything that
// doesn't fit is listed in the body as a Drive link instead.
export const MAX_ATTACHMENT_BYTES = 17 * 1024 * 1024;

export type ReportFile = { itemIndex: number; driveFileId: string; name: string; webViewLink: string };

export type ReportEmailPlan = {
  subject: string;
  // Items that are supposed to carry a document but have none uploaded.
  missing: string[];
  files: ReportFile[];
};

// "2026-11" → "Kasım 2026" — the accountant reads Turkish.
export function turkishMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  const name = new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(new Date(year, month - 1, 1));
  return `${name.charAt(0).toLocaleUpperCase("tr-TR")}${name.slice(1)} ${year}`;
}

export function planReportEmail(
  items: ChecklistItemDef[],
  monthState: MonthState,
  monthKey: string,
): ReportEmailPlan {
  const docItems = items.filter((item) => item.hasFile);
  const files: ReportFile[] = [];
  const missing: string[] = [];

  for (const item of docItems) {
    const itemFiles = monthState.files.filter((f) => f.itemIndex === item.index);
    if (itemFiles.length === 0) missing.push(item.title);
    files.push(...itemFiles);
  }

  return {
    subject: `${turkishMonthLabel(monthKey)} muhasebe evrakları`,
    missing,
    files,
  };
}

export function buildReportBody(
  monthKey: string,
  attached: { itemTitle: string; name: string }[],
  linked: { itemTitle: string; name: string; webViewLink: string }[],
): string {
  const lines = [
    "Merhaba,",
    "",
    `${turkishMonthLabel(monthKey)} ayına ait evraklar ektedir:`,
    "",
    ...attached.map((a) => `- ${a.itemTitle}: ${a.name}`),
  ];

  if (linked.length > 0) {
    lines.push(
      "",
      "Boyut sınırı nedeniyle eklenemeyen evraklar (Google Drive bağlantısı):",
      "",
      ...linked.map((l) => `- ${l.itemTitle}: ${l.name} — ${l.webViewLink}`),
    );
  }

  lines.push("", "İyi çalışmalar.");
  return lines.join("\n");
}

const EMAIL_PATTERN = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

export function normalizeRecipient(value: string | number | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return EMAIL_PATTERN.test(trimmed) ? trimmed : undefined;
}
