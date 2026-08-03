import { describe, expect, it } from "vitest";
import { currentMonthKey, parseChecklistState, EMPTY_STATE } from "@/lib/checklist";

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
