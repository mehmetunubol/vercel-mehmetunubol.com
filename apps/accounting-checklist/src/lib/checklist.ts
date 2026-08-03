import { z } from "zod";

export type ChecklistItemDef = {
  index: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  fields: { key: string; label: string; type: "text" | "number" | "date" }[];
  hasFile: boolean;
  fileLabel?: string;
};

export const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  { index: 1, title: "Binance TR beyan", fields: [], hasFile: false },
  {
    index: 2,
    title: "Deposit screenshot",
    fields: [],
    hasFile: true,
    fileLabel: "Deposit screenshot",
  },
  {
    index: 3,
    title: "Store txid and date",
    fields: [
      { key: "txid", label: "txid", type: "text" },
      { key: "txDate", label: "Date", type: "date" },
    ],
    hasFile: false,
  },
  {
    index: 4,
    title: "Conversion USDT → TRY",
    fields: [
      { key: "conversionRate", label: "Rate (kur)", type: "number" },
      { key: "commission", label: "Commission", type: "number" },
      { key: "tryAmount", label: "Final TRY amount", type: "number" },
    ],
    hasFile: false,
  },
  {
    index: 5,
    title: "SMM",
    fields: [
      { key: "alisKur", label: "Alış kur", type: "number" },
      { key: "alisKurDate", label: "Alış kur date", type: "date" },
      { key: "tlKarsiligi", label: "TL karşılığı", type: "number" },
      { key: "smmNo", label: "SMM makbuz no", type: "text" },
    ],
    hasFile: true,
    fileLabel: "SMM makbuz",
  },
  {
    index: 6,
    title: "Send to bank",
    fields: [],
    hasFile: true,
    fileLabel: "Dekont",
  },
];

const monthStateSchema = z.object({
  items: z.record(z.string(), z.boolean()).default({}),
  fields: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  files: z
    .array(
      z.object({
        itemIndex: z.number(),
        driveFileId: z.string(),
        name: z.string(),
        webViewLink: z.string(),
      }),
    )
    .default([]),
});

export const checklistStateSchema = z.object({
  months: z.record(z.string(), monthStateSchema).default({}),
});

export type MonthState = z.infer<typeof monthStateSchema>;
export type ChecklistState = z.infer<typeof checklistStateSchema>;

export const EMPTY_STATE: ChecklistState = { months: {} };

export function emptyMonthState(): MonthState {
  return { items: {}, fields: {}, files: [] };
}

export function currentMonthKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function parseChecklistState(raw: unknown): ChecklistState {
  const result = checklistStateSchema.safeParse(raw);
  return result.success ? result.data : EMPTY_STATE;
}
