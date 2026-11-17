import { describe, expect, it } from "vitest";
import {
  CHECKLISTS,
  CHECKLIST_KEYS,
  DEFAULT_CREDIT_CARDS,
  isChecklistKey,
  EMPTY_DEFAULTS,
  EMPTY_STATE,
  computeItemsTotal,
  currentMonthKey,
  emptyMonthState,
  parseChecklistState,
  fieldDefault,
} from "@/lib/checklist";

describe("payment items", () => {
  it("has unique item indexes", () => {
    const indexes = CHECKLISTS.payments.items.map((i) => i.index);
    expect(new Set(indexes).size).toBe(indexes.length);
  });

  it("no longer includes Seferihisar dues", () => {
    expect(CHECKLISTS.payments.items.some((i) => i.index === 6)).toBe(false);
    expect(
      CHECKLISTS.payments.items.flatMap((i) => i.fields).some((f) => f.key.startsWith("seferihisar")),
    ).toBe(false);
  });

  it("seeds Vakıfbank as a default credit card", () => {
    expect(DEFAULT_CREDIT_CARDS.map((c) => c.id)).toEqual([
      "card-denizbank",
      "card-yapikredi",
      "card-enpara",
      "card-vakifbank",
    ]);
  });

  it("splits rent into home (keeps legacy kira keys) and office", () => {
    const home = CHECKLISTS.payments.items.find((i) => i.index === 4);
    const office = CHECKLISTS.payments.items.find((i) => i.index === 8);
    expect(home?.fields.map((f) => f.key)).toEqual(["kiraAmount", "kiraDueDate"]);
    expect(office?.fields.map((f) => f.key)).toEqual(["ofisKiraAmount", "ofisKiraDueDate"]);
  });
});

describe("report checklist", () => {
  it("is registered as a tab with its own Drive folder", () => {
    expect(CHECKLIST_KEYS).toContain("report");
    expect(isChecklistKey("report")).toBe(true);
    expect(CHECKLISTS.report.driveFolder).toBe("Report");
  });

  it("has a document item for every source plus the send step", () => {
    const items = CHECKLISTS.report.items;
    const indexes = items.map((i) => i.index);
    expect(new Set(indexes).size).toBe(indexes.length);
    expect(items).toHaveLength(9);
    expect(items.slice(0, 8).every((i) => i.hasFile)).toBe(true);
    expect(items.at(-1)?.fields.map((f) => f.key)).toEqual(["accountantEmail", "reportSentDate"]);
  });

  it("names every document in Turkish for the accountant email", () => {
    for (const item of CHECKLISTS.report.items.filter((i) => i.hasFile)) {
      expect(item.emailLabel, item.title).toBeTruthy();
      expect(item.fileLabel, item.title).toMatch(/fatura|hareket|dekont/i);
    }
  });

  it("contributes nothing to totals", () => {
    expect(
      computeItemsTotal(CHECKLISTS.report.items, emptyMonthState(), EMPTY_DEFAULTS, "2026-11"),
    ).toBe(0);
  });
});

describe("fieldDefault (built-in defaults)", () => {
  const payments = CHECKLISTS.payments.items;
  const field = (key: string) => payments.flatMap((i) => i.fields).find((f) => f.key === key)!;

  it("fills rent defaults from the rent-split month on", () => {
    expect(fieldDefault(field("kiraAmount"), "2026-11", EMPTY_DEFAULTS)).toBe(38000);
    expect(fieldDefault(field("ofisKiraAmount"), "2026-12", EMPTY_DEFAULTS)).toBe(12000);
    expect(fieldDefault(field("kiraDueDate"), "2026-11", EMPTY_DEFAULTS)).toBe("2026-11-15");
    expect(fieldDefault(field("ofisKiraDueDate"), "2026-11", EMPTY_DEFAULTS)).toBe("2026-11-25");
  });

  it("never applies built-ins to months before they were introduced", () => {
    expect(fieldDefault(field("kiraAmount"), "2026-10", EMPTY_DEFAULTS)).toBeUndefined();
    expect(fieldDefault(field("ofisKiraDueDate"), "2026-08", EMPTY_DEFAULTS)).toBeUndefined();
    expect(computeItemsTotal(payments, emptyMonthState(), EMPTY_DEFAULTS, "2026-08")).toBe(0);
  });

  it("counts both rents in the outgoing total for a blank month after the split", () => {
    expect(computeItemsTotal(payments, emptyMonthState(), EMPTY_DEFAULTS, "2026-11")).toBe(50000);
  });

  it("lets user-configured defaults win, including an explicit 0", () => {
    const defaults = { fields: { kiraAmount: "40000", ofisKiraAmount: "0" }, creditCards: {} };
    expect(fieldDefault(field("kiraAmount"), "2026-11", defaults)).toBe("40000");
    expect(fieldDefault(field("ofisKiraAmount"), "2026-11", defaults)).toBe("0");
  });

  it("falls back to the built-in when a configured default is cleared", () => {
    const defaults = { fields: { kiraAmount: "" }, creditCards: {} };
    expect(fieldDefault(field("kiraAmount"), "2026-11", defaults)).toBe(38000);
  });

  it("ignores defaults for per-month-only fields like the report sent date", () => {
    const sent = CHECKLISTS.report.items.flatMap((i) => i.fields).find((f) => f.key === "reportSentDate")!;
    expect(sent.noDefault).toBe(true);
    expect(fieldDefault(sent, "2026-11", { fields: { reportSentDate: "1" }, creditCards: {} })).toBeUndefined();
  });
});

describe("currentMonthKey", () => {
  it("formats as YYYY-MM", () => {
    expect(currentMonthKey(new Date(2026, 6, 15))).toBe("2026-07");
    expect(currentMonthKey(new Date(2026, 0, 1))).toBe("2026-01");
  });
});

describe("parseChecklistState", () => {
  it("parses a well-formed state", () => {
    const raw = {
      months: {
        "2026-07": {
          items: { "1": true },
          fields: { txid: "abc", conversionRate: 46.63 },
          files: [{ itemIndex: 2, driveFileId: "f1", name: "a.png", webViewLink: "https://x" }],
        },
      },
    };
    const parsed = parseChecklistState(raw);
    const month = parsed.months["2026-07"];
    expect(month?.items["1"]).toBe(true);
    expect(month?.fields.txid).toBe("abc");
  });

  it("falls back to an empty state for malformed input", () => {
    expect(parseChecklistState({ months: { "2026-07": { items: "not-an-object" } } })).toEqual(
      EMPTY_STATE,
    );
    expect(parseChecklistState(null)).toEqual(EMPTY_STATE);
  });
});
