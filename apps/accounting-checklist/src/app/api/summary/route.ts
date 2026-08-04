import { NextResponse, type NextRequest } from "next/server";
import { getDriveAccessToken } from "@/lib/auth";
import {
  getOrCreateChecklistFolder,
  getOrCreateMonthFolder,
  readDefaults,
  readState,
  upsertSummaryDoc,
} from "@/lib/drive";
import { CHECKLISTS, computeItemsTotal, emptyMonthState, isChecklistKey } from "@/lib/checklist";
import { buildSummaryHtml, type SummaryTotals } from "@/lib/summary";

export async function POST(req: NextRequest) {
  const accessToken = await getDriveAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { month, checklist } = body as { month?: string; checklist?: string };

  if (typeof month !== "string" || !isChecklistKey(checklist)) {
    return NextResponse.json({ error: "missing month or checklist" }, { status: 400 });
  }

  const folderId = await getOrCreateChecklistFolder(accessToken, checklist);
  const monthFolderId = await getOrCreateMonthFolder(accessToken, folderId, month);
  const [state, defaults] = await Promise.all([
    readState(accessToken, folderId),
    readDefaults(accessToken, folderId),
  ]);
  const monthState = state.months[month] ?? emptyMonthState();

  let totals: SummaryTotals | undefined;
  if (checklist === "payments") {
    const invoicesFolderId = await getOrCreateChecklistFolder(accessToken, "invoices");
    const invoicesState = await readState(accessToken, invoicesFolderId);
    const invoicesMonthState = invoicesState.months[month];
    const outgoingTotal = computeItemsTotal(CHECKLISTS.payments.items, monthState, defaults, month);
    const incomingTry = invoicesMonthState?.fields.bankAmount;
    totals = {
      incomingEuro: invoicesMonthState?.fields.euro,
      incomingTry,
      incomingRate: invoicesMonthState?.fields.alisKur,
      outgoingTotal,
      netAmount: (Number(incomingTry) || 0) - outgoingTotal,
    };
  }

  const html = buildSummaryHtml(CHECKLISTS[checklist], monthState, month, defaults, totals);
  const doc = await upsertSummaryDoc(accessToken, monthFolderId, html);

  return NextResponse.json(doc);
}
