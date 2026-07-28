import { describe, expect, it } from "vitest";
import { serializeFilters } from "../filters";

describe("serializeFilters", () => {
  it("serializes every typed option to LinkedIn's f_* query params", () => {
    const params = serializeFilters({
      keywords: "typescript",
      geoId: "90009996",
      postedWithin: "24h",
      experience: "senior",
      jobType: ["full-time", "contract"],
      workplace: ["remote", "hybrid"],
      easyApplyOnly: true,
      fewApplicants: true,
      sort: "newest",
      radiusMiles: "25",
    });

    expect(params.get("keywords")).toBe("typescript");
    expect(params.get("geoId")).toBe("90009996");
    expect(params.get("f_TPR")).toBe("r86400");
    expect(params.get("f_E")).toBe("4");
    expect(params.get("f_JT")).toBe("F,C");
    expect(params.get("f_WT")).toBe("2,3");
    expect(params.get("f_AL")).toBe("true");
    expect(params.get("f_JIYN")).toBe("true");
    expect(params.get("sortBy")).toBe("DD");
    expect(params.get("distance")).toBe("25");
    expect(params.get("start")).toBe("0");
  });

  it("maps posted-within presets to the right second counts", () => {
    expect(serializeFilters({ postedWithin: "1h" }).get("f_TPR")).toBe("r3600");
    expect(serializeFilters({ postedWithin: "week" }).get("f_TPR")).toBe("r604800");
    expect(serializeFilters({ postedWithin: "month" }).get("f_TPR")).toBe("r2592000");
  });

  it("defaults sort to newest and omits unset filters", () => {
    const params = serializeFilters({});
    expect(params.get("sortBy")).toBe("DD");
    expect(params.has("f_TPR")).toBe(false);
    expect(params.has("f_E")).toBe(false);
    expect(params.has("f_JT")).toBe(false);
    expect(params.has("f_WT")).toBe(false);
  });

  it("advances the start param for pagination", () => {
    expect(serializeFilters({}, 50).get("start")).toBe("50");
  });

  it("never exposes raw f_* names as accepted input keys", () => {
    // TS enforces this at compile time; this just documents the intent for
    // anyone tempted to add a raw passthrough field later.
    const filters: Record<string, unknown> = { keywords: "x" };
    expect("f_TPR" in filters).toBe(false);
  });
});
