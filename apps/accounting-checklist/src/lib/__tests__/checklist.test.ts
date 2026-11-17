import { describe, expect, it } from "vitest";
import {
  CHECKLISTS,
  EMPTY_DEFAULTS,
  EMPTY_STATE,
  computeItemsTotal,
  currentMonthKey,
  emptyMonthState,
  parseChecklistState,
  resolveFieldDefault,
  withBuiltinDefaults,
} from "@/lib/checklist";

describe("payment items", () => {
  it("has unique item indexes", () => {
    const indexes = CHECKLISTS.payments.items.map((i) => i.index);
    expect(new Set(indexes).size).toBe(indexes.length);
  });

  it("splits rent into home (keeps legacy kira keys) and office", () => {
    const home = CHECKLISTS.payments.items.find((i) => i.index === 4);
    const office = CHECKLISTS.payments.items.find((i) => i.index === 8);
    expect(home?.fields.map((f) => f.key)).toEqual(["kiraAmount", "kiraDueDate"]);
    expect(office?.fields.map((f) => f.key)).toEqual(["ofisKiraAmount", "ofisKiraDueDate"]);
  });
});

describe("withBuiltinDefaults", () => {
  it("fills rent defaults when nothing is configured", () => {
    const d = withBuiltinDefaults("payments", EMPTY_DEFAULTS);
    expect(d.fields.kiraAmount).toBe(38000);
    expect(d.fields.ofisKiraAmount).toBe(12000);
    expect(resolveFieldDefault("date", "2026-11", d.fields.kiraDueDate)).toBe("2026-11-15");
    expect(resolveFieldDefault("date", "2026-11", d.fields.ofisKiraDueDate)).toBe("2026-11-25");
  });

  it("lets user-configured defaults win over built-ins", () => {
    const d = withBuiltinDefaults("payments", {
      fields: { kiraAmount: "40000" },
      creditCards: {},
    });
    expect(d.fields.kiraAmount).toBe("40000");
    expect(d.fields.ofisKiraAmount).toBe(12000);
  });

  it("counts both rents in the outgoing total for a blank month", () => {
    const d = withBuiltinDefaults("payments", EMPTY_DEFAULTS);
    expect(computeItemsTotal(CHECKLISTS.payments.items, emptyMonthState(), d, "2026-11")).toBe(50000);
  });

  it("adds nothing for invoices", () => {
    expect(withBuiltinDefaults("invoices", EMPTY_DEFAULTS)).toEqual(EMPTY_DEFAULTS);
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
