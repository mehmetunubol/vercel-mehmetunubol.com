import { z } from "zod";
import type { ItemIconName } from "@/components/checklist-icons";

export type RepeatableKey = "customExpenses" | "creditCards";

export type ChecklistFieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "date";
  // Fallback used when the user hasn't configured a default for this key.
  // Only applies to months >= `since` (YYYY-MM), so introducing one never
  // rewrites past months' values or totals. Dates are a day of month.
  builtinDefault?: { value: string | number; since: string };
  // Values that must be entered per month (e.g. "date sent") — no default
  // can be configured, since a pre-filled value would be misleading.
  noDefault?: boolean;
};

export type ChecklistItemDef = {
  index: number;
  title: string;
  icon: ItemIconName;
  fields: ChecklistFieldDef[];
  hasFile: boolean;
  fileLabel?: string;
  repeatableKey?: RepeatableKey;
  addEntryLabel?: string;
};

export type ChecklistKey = "invoices" | "payments" | "report";

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
  { id: "card-vakifbank", label: "Vakıfbank" },
];

// First month the home/office rent split (and its built-in amounts) applies.
const RENT_SPLIT_MONTH = "2026-11";

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
  // Home rent keeps the original "kira*" keys and index 4 so months saved
  // before the home/office split stay attached to it. Office rent got a new,
  // unused index (8) rather than renumbering — `index` is a persisted id
  // (done flags, file attachments), not a display position.
  {
    index: 4,
    title: "Rent — home (ev kirası)",
    icon: "home",
    fields: [
      { key: "kiraAmount", label: "Amount", type: "number", builtinDefault: { value: 38000, since: RENT_SPLIT_MONTH } },
      { key: "kiraDueDate", label: "Due date", type: "date", builtinDefault: { value: 15, since: RENT_SPLIT_MONTH } },
    ],
    hasFile: true,
    fileLabel: "Receipt",
  },
  {
    index: 8,
    title: "Rent — office (ofis kirası)",
    icon: "office",
    fields: [
      { key: "ofisKiraAmount", label: "Amount", type: "number", builtinDefault: { value: 12000, since: RENT_SPLIT_MONTH } },
      { key: "ofisKiraDueDate", label: "Due date", type: "date", builtinDefault: { value: 25, since: RENT_SPLIT_MONTH } },
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
  // index 6 (Seferihisar dues) was removed — don't reuse it, old months'
  // state.json may still carry a done flag / files under that index.
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

// Monthly document pack for the accountant: collect every document for the
// month, then send it all together on the 1st of the following month.
const REPORT_ITEMS: ChecklistItemDef[] = [
  {
    index: 1,
    title: "Invoice — Bro",
    icon: "receipt",
    fields: [],
    hasFile: true,
    fileLabel: "Bro invoice",
  },
  {
    index: 2,
    title: "Invoice — Deparsoft",
    icon: "receipt",
    fields: [],
    hasFile: true,
    fileLabel: "Deparsoft invoice",
  },
  {
    index: 3,
    title: "Bank account transactions — Fiba (şahıs)",
    icon: "bank",
    fields: [],
    hasFile: true,
    fileLabel: "Fiba account statement",
  },
  {
    index: 4,
    title: "Office rent payment proof",
    icon: "office",
    fields: [],
    hasFile: true,
    fileLabel: "Office rent receipt (dekont)",
  },
  {
    index: 5,
    title: "Paid invoice — Electricity (elektrik)",
    icon: "bolt",
    fields: [],
    hasFile: true,
    fileLabel: "Electricity invoice",
  },
  {
    index: 6,
    title: "Paid invoice — Water (su)",
    icon: "droplet",
    fields: [],
    hasFile: true,
    fileLabel: "Water invoice",
  },
  {
    index: 7,
    title: "Paid invoice — Internet",
    icon: "wifi",
    fields: [],
    hasFile: true,
    fileLabel: "Internet invoice",
  },
  {
    index: 8,
    title: "Paid invoice — Mobile phone (cep telefonu)",
    icon: "phone",
    fields: [],
    hasFile: true,
    fileLabel: "Mobile phone invoice",
  },
  {
    index: 9,
    title: "Send all to accountant (1st of next month)",
    icon: "send",
    // accountantEmail is the "To" of the Gmail draft — set it once in the
    // Defaults panel and every month picks it up.
    fields: [
      { key: "accountantEmail", label: "Accountant email", type: "text" },
      { key: "reportSentDate", label: "Date sent", type: "date", noDefault: true },
    ],
    hasFile: false,
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
  report: {
    key: "report",
    title: "Report",
    driveFolder: "Report",
    items: REPORT_ITEMS,
  },
};

export const CHECKLIST_KEYS: ChecklistKey[] = ["invoices", "payments", "report"];

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
  // Keys set by the automated Gmail-attachment trigger, not typed by hand —
  // field keys as-is (e.g. "maliMusavirAmount"), repeatable entries as
  // "<repeatableKey>:<id>" (e.g. "creditCards:card-denizbank"). Cleared for a
  // key the moment the user edits it manually, so the badge never lies.
  autoFilled: z.array(z.string()).default([]),
});

export const checklistStateSchema = z.object({
  months: z.record(z.string(), monthStateSchema).default({}),
});

export type MonthState = z.infer<typeof monthStateSchema>;
export type ChecklistState = z.infer<typeof checklistStateSchema>;
export type CustomExpense = z.infer<typeof customExpenseSchema>;

export const EMPTY_STATE: ChecklistState = { months: {} };

export function emptyMonthState(): MonthState {
  return { items: {}, fields: {}, files: [], customExpenses: [], creditCards: [], autoFilled: [] };
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

// The single place a field's default is resolved, for the UI, totals,
// printed summary and email alike: the user's configured default wins;
// otherwise the field's built-in default, but only from the month it was
// introduced. A blank configured value counts as "not configured" — so
// clearing a field in the Defaults panel brings the built-in back, exactly
// as its placeholder says (enter 0 to really have no amount). Built-ins
// are never written to defaults.json, so changing one in code takes effect.
export function fieldDefault(
  field: ChecklistFieldDef,
  monthKey: string,
  defaults: ChecklistDefaults,
): string | number | undefined {
  if (field.noDefault) return undefined;
  const configured = Object.hasOwn(defaults.fields, field.key) ? defaults.fields[field.key] : undefined;
  if (configured !== undefined && configured !== "") return resolveFieldDefault(field.type, monthKey, configured);
  const builtin = field.builtinDefault;
  if (builtin && monthKey >= builtin.since) return resolveFieldDefault(field.type, monthKey, builtin.value);
  return undefined;
}

// Sums every numeric field/entry across a checklist's items for one month —
// used to total up "outgoing" payments, including default-filled blanks
// (fieldDefault) so the total matches what the UI shows.
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
      const raw = monthState.fields[field.key] ?? fieldDefault(field, monthKey, defaults);
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
