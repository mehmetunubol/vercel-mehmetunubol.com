import { z } from "zod";
import type { ItemIconName } from "@/components/checklist-icons";

export type RepeatableKey = "customExpenses" | "creditCards";

export type ChecklistItemDef = {
  index: number;
  title: string;
  icon: ItemIconName;
  fields: { key: string; label: string; type: "text" | "number" | "date" }[];
  hasFile: boolean;
  fileLabel?: string;
  repeatableKey?: RepeatableKey;
  addEntryLabel?: string;
};

export type ChecklistKey = "invoices" | "payments";

export type ChecklistDef = {
  key: ChecklistKey;
  title: string;
  // Drive folder name, nested under the shared "Accounting Checklist" parent.
  driveFolder: string;
  items: ChecklistItemDef[];
};

const INVOICE_ITEMS: ChecklistItemDef[] = [
  {
    index: 1,
    title: "Binance TR declaration (beyan)",
    icon: "flag",
    fields: [],
    hasFile: false,
  },
  {
    index: 2,
    title: "Deposit screenshot",
    icon: "camera",
    fields: [
      { key: "txid", label: "txid", type: "text" },
      { key: "txDate", label: "Date", type: "date" },
    ],
    hasFile: true,
    fileLabel: "Deposit screenshot",
  },
  {
    index: 3,
    title: "Conversion USDT → TRY",
    icon: "refresh",
    fields: [
      { key: "conversionRate", label: "Rate (kur)", type: "number" },
      { key: "commission", label: "Commission", type: "number" },
      { key: "tryAmount", label: "Final TRY amount", type: "number" },
    ],
    hasFile: true,
    fileLabel: "Conversion screenshot",
  },
  {
    index: 4,
    title: "SMM (Serbest Meslek Makbuzu)",
    icon: "receipt",
    fields: [
      { key: "euro", label: "EURO", type: "number" },
      { key: "alisKur", label: "Purchase rate (alış kur)", type: "number" },
      { key: "alisKurDate", label: "Purchase rate date (alış kur tarihi)", type: "date" },
      { key: "tlKarsiligi", label: "TL equivalent (TL karşılığı)", type: "number" },
      { key: "smmNo", label: "SMM receipt no (SMM makbuz no)", type: "text" },
    ],
    hasFile: true,
    fileLabel: "SMM receipt (SMM makbuz)",
  },
  {
    index: 5,
    title: "Send to bank",
    icon: "bank",
    fields: [
      { key: "bankAmount", label: "Amount sent", type: "number" },
      { key: "bankSentDate", label: "Date sent", type: "date" },
    ],
    hasFile: true,
    fileLabel: "Bank receipt (dekont)",
  },
];

// Default credit cards seeded into the grouped "Credit cards" item each
// month — stable ids so edits upsert into the same entry instead of
// duplicating. Users can still add further cards beyond these three.
export const DEFAULT_CREDIT_CARDS: { id: string; label: string }[] = [
  { id: "card-denizbank", label: "Denizbank" },
  { id: "card-yapikredi", label: "Yapı Kredi" },
  { id: "card-enpara", label: "Enpara" },
];

// Temporary/placeholder steps — to be refined later.
const PAYMENT_ITEMS: ChecklistItemDef[] = [
  {
    index: 1,
    title: "Credit cards (kredi kartları)",
    icon: "card",
    fields: [],
    hasFile: false,
    repeatableKey: "creditCards",
    addEntryLabel: "Add card",
  },
  {
    index: 2,
    title: "Bağkur",
    icon: "shield",
    fields: [
      { key: "bagkurAmount", label: "Amount", type: "number" },
      { key: "bagkurDueDate", label: "Due date", type: "date" },
    ],
    hasFile: true,
    fileLabel: "Receipt",
  },
  {
    index: 3,
    title: "Financial advisor (mali müşavir)",
    icon: "briefcase",
    fields: [
      { key: "maliMusavirAmount", label: "Amount", type: "number" },
      { key: "maliMusavirDueDate", label: "Due date", type: "date" },
    ],
    hasFile: true,
    fileLabel: "Receipt",
  },
  {
    index: 4,
    title: "Rent (kira)",
    icon: "home",
    fields: [
      { key: "kiraAmount", label: "Amount", type: "number" },
      { key: "kiraDueDate", label: "Due date", type: "date" },
    ],
    hasFile: true,
    fileLabel: "Receipt",
  },
  {
    index: 5,
    title: "Money sent to wife",
    icon: "heart",
    fields: [
      { key: "wifeAmount", label: "Amount", type: "number" },
      { key: "wifeTransferDate", label: "Transfer date", type: "date" },
    ],
    hasFile: true,
    fileLabel: "Receipt",
  },
  {
    index: 6,
    title: "Seferihisar dues (aidat)",
    icon: "building",
    fields: [
      { key: "seferihisarAidatAmount", label: "Amount", type: "number" },
      { key: "seferihisarAidatDueDate", label: "Due date", type: "date" },
    ],
    hasFile: true,
    fileLabel: "Receipt",
  },
  {
    index: 7,
    title: "Custom expenses",
    icon: "plus-circle",
    fields: [],
    hasFile: false,
    repeatableKey: "customExpenses",
    addEntryLabel: "Add expense",
  },
];

export const CHECKLISTS: Record<ChecklistKey, ChecklistDef> = {
  invoices: {
    key: "invoices",
    title: "Invoices",
    driveFolder: "Invoices",
    items: INVOICE_ITEMS,
  },
  payments: {
    key: "payments",
    title: "Payments",
    driveFolder: "Payments",
    items: PAYMENT_ITEMS,
  },
};

export const CHECKLIST_KEYS: ChecklistKey[] = ["invoices", "payments"];

export function isChecklistKey(value: unknown): value is ChecklistKey {
  return typeof value === "string" && (CHECKLIST_KEYS as string[]).includes(value);
}

// Backward-compatible export — invoices was the only checklist before.
export const CHECKLIST_ITEMS = INVOICE_ITEMS;

const customExpenseSchema = z.object({
  id: z.string(),
  label: z.string(),
  amount: z.union([z.string(), z.number()]).optional(),
  dueDate: z.string().optional(),
  done: z.boolean().default(false),
});

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
  customExpenses: z.array(customExpenseSchema).default([]),
  creditCards: z.array(customExpenseSchema).default([]),
  summary: z.object({ fileId: z.string(), webViewLink: z.string() }).optional(),
});

export const checklistStateSchema = z.object({
  months: z.record(z.string(), monthStateSchema).default({}),
});

export type MonthState = z.infer<typeof monthStateSchema>;
export type ChecklistState = z.infer<typeof checklistStateSchema>;
export type CustomExpense = z.infer<typeof customExpenseSchema>;

export const EMPTY_STATE: ChecklistState = { months: {} };

export function emptyMonthState(): MonthState {
  return { items: {}, fields: {}, files: [], customExpenses: [], creditCards: [] };
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

// Configured per-checklist default values, applied to blank fields in any
// month that doesn't have its own value yet — for recurring amounts/due
// dates (rent, bağkur, card due dates, ...) that rarely change month to
// month. Editing a field for a specific month always overrides the default.
const checklistDefaultsSchema = z.object({
  fields: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  creditCards: z
    .record(
      z.string(),
      z.object({
        amount: z.union([z.string(), z.number()]).optional(),
        dueDate: z.string().optional(),
      }),
    )
    .default({}),
});

export type ChecklistDefaults = z.infer<typeof checklistDefaultsSchema>;

export const EMPTY_DEFAULTS: ChecklistDefaults = { fields: {}, creditCards: {} };

export function parseChecklistDefaults(raw: unknown): ChecklistDefaults {
  const result = checklistDefaultsSchema.safeParse(raw);
  return result.success ? result.data : EMPTY_DEFAULTS;
}

// Date-type defaults store only the day of month (e.g. "15") — the month
// and year always come from whichever month is currently being viewed, so
// the same configured due date applies going forward without baking in a
// specific month/year.
export function resolveDateDefault(
  monthKey: string,
  raw: string | number | undefined,
): string | undefined {
  if (raw === undefined || raw === "") return undefined;
  return `${monthKey}-${String(raw).padStart(2, "0")}`;
}

export function resolveFieldDefault(
  type: "text" | "number" | "date",
  monthKey: string,
  raw: string | number | undefined,
): string | number | undefined {
  if (type === "date") return resolveDateDefault(monthKey, raw);
  return raw === "" ? undefined : raw;
}

export const checklistDefaultsInputSchema = checklistDefaultsSchema;

// Sums every numeric field/entry across a checklist's items for one month —
// used to total up "outgoing" payments, including default-filled blanks
// (defaults + resolveFieldDefault) so the total matches what the UI shows.
export function computeItemsTotal(
  items: ChecklistItemDef[],
  monthState: MonthState,
  defaults: ChecklistDefaults,
  monthKey: string,
): number {
  let total = 0;

  for (const item of items) {
    for (const field of item.fields) {
      if (field.type !== "number") continue;
      const raw = monthState.fields[field.key] ?? resolveFieldDefault(field.type, monthKey, defaults.fields[field.key]);
      const num = Number(raw);
      if (raw !== undefined && raw !== "" && !Number.isNaN(num)) total += num;
    }

    if (item.repeatableKey === "customExpenses") {
      for (const entry of monthState.customExpenses) {
        const num = Number(entry.amount);
        if (entry.amount !== undefined && entry.amount !== "" && !Number.isNaN(num)) total += num;
      }
    } else if (item.repeatableKey === "creditCards") {
      const real = monthState.creditCards;
      for (const entry of real) {
        const num = Number(entry.amount);
        if (entry.amount !== undefined && entry.amount !== "" && !Number.isNaN(num)) total += num;
      }
      for (const card of DEFAULT_CREDIT_CARDS) {
        if (real.some((e) => e.id === card.id)) continue;
        const amountDefault = defaults.creditCards[card.id]?.amount;
        const num = Number(amountDefault);
        if (amountDefault !== undefined && amountDefault !== "" && !Number.isNaN(num)) total += num;
      }
    }
  }

  return total;
}
