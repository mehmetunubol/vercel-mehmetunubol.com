import type { ChecklistDef, ChecklistDefaults, CustomExpense, MonthState } from "@/lib/checklist";
import { DEFAULT_CREDIT_CARDS, resolveDateDefault, resolveFieldDefault } from "@/lib/checklist";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderEntries(entries: CustomExpense[]): string {
  if (entries.length === 0) return "";
  const rows = entries
    .map(
      (e) =>
        `<tr><td>☐</td><td>${escapeHtml(e.label || "(unnamed)")}</td><td>${escapeHtml(String(e.amount ?? ""))}</td><td>${escapeHtml(e.dueDate ?? "")}</td></tr>`,
    )
    .join("");
  return `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:8px 0 16px;">
    <tr><th align="left">Done</th><th align="left">Name</th><th align="left">Amount</th><th align="left">Due date</th></tr>
    ${rows}
  </table>`;
}

function formatAmount(value: string | number | undefined): string {
  if (value === undefined || value === "") return "—";
  const num = Number(value);
  return Number.isNaN(num) ? String(value) : num.toFixed(2);
}

export type SummaryTotals = {
  incomingEuro: string | number | undefined;
  incomingTry: string | number | undefined;
  incomingRate: string | number | undefined;
  outgoingTotal: number;
  netAmount: number;
};

function renderTotalsSection(totals: SummaryTotals): string {
  return `<h2>Monthly totals</h2>
  <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;">
    <tr><th align="left">Incoming (SMM invoice, reference)</th><td>€${formatAmount(totals.incomingEuro)} — ₺${formatAmount(totals.incomingTry)} @ ${formatAmount(totals.incomingRate)}</td></tr>
    <tr><th align="left">Outgoing (payments total)</th><td>₺${formatAmount(totals.outgoingTotal)}</td></tr>
    <tr><th align="left">Net</th><td>₺${formatAmount(totals.netAmount)}</td></tr>
  </table>`;
}

export function buildSummaryHtml(
  def: ChecklistDef,
  monthState: MonthState,
  monthLabel: string,
  defaults: ChecklistDefaults,
  totals?: SummaryTotals,
): string {
  const rows = def.items
    .map((item) => {
      const done = monthState.items[item.index] ?? false;
      const checkbox = done ? "☑" : "☐";
      const fieldLines = item.fields
        .map((f) => {
          const value =
            monthState.fields[f.key] ??
            resolveFieldDefault(f.type, monthLabel, defaults.fields[f.key]) ??
            "";
          return `<div>${escapeHtml(f.label)}: ${escapeHtml(String(value))}</div>`;
        })
        .join("");
      const files = monthState.files
        .filter((f) => f.itemIndex === item.index)
        .map(
          (f) =>
            `<div>📎 <a href="${escapeHtml(f.webViewLink)}">${escapeHtml(f.name)}</a></div>`,
        )
        .join("");

      let repeatableHtml = "";
      if (item.repeatableKey === "customExpenses") {
        repeatableHtml = renderEntries(monthState.customExpenses);
      } else if (item.repeatableKey === "creditCards") {
        const real = monthState.creditCards;
        const virtual = DEFAULT_CREDIT_CARDS.filter((d) => !real.some((e) => e.id === d.id)).map(
          (d): CustomExpense => {
            const cardDefault = defaults.creditCards[d.id];
            return {
              id: d.id,
              label: d.label,
              amount: cardDefault?.amount ?? "",
              dueDate: resolveDateDefault(monthLabel, cardDefault?.dueDate) ?? "",
              done: false,
            };
          },
        );
        repeatableHtml = renderEntries([...real, ...virtual]);
      }

      return `<tr>
        <td style="font-size:18px;">${checkbox}</td>
        <td>
          <div style="font-weight:bold;">${escapeHtml(item.title)}</div>
          ${fieldLines}
          ${repeatableHtml}
          ${files}
        </td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
  <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family:Arial,sans-serif;">
      <h1>${escapeHtml(def.title)} — ${escapeHtml(monthLabel)}</h1>
      <table cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse;">
        ${rows}
      </table>
      ${totals ? renderTotalsSection(totals) : ""}
    </body>
  </html>`;
}
