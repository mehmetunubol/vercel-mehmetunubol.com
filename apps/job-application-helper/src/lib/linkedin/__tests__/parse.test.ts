import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseJobDetail, parseSearchResults } from "../parse";

const fixture = readFileSync(path.join(__dirname, "fixtures/search-page.html"), "utf-8");

describe("parseSearchResults", () => {
  it("parses job cards from a saved search-results fixture", () => {
    const cards = parseSearchResults(fixture);
    expect(cards).toHaveLength(2);

    expect(cards[0]).toMatchObject({
      jobId: "3900001111",
      title: "Senior TypeScript Engineer",
      company: "Acme Corp",
      location: "Istanbul, Türkiye",
    });
    expect(cards[0]?.url).not.toContain("refId");
    expect(cards[0]?.postedAt).toBeInstanceOf(Date);

    expect(cards[1]).toMatchObject({
      jobId: "3900002222",
      title: "Backend TypeScript Developer",
      company: "Globex Inc",
    });
  });

  it("throws for a longer 0-card body too — by design, any substantial 0-card response is suspect rather than silently accepted (see BlockedError in scraper.ts for the short-body counterpart)", () => {
    const noResultsPage = `<ul><li class="no-results">${"No matching jobs found. ".repeat(20)}</li></ul>`;
    expect(() => parseSearchResults(noResultsPage)).toThrow(/zero parsed fields/);
  });

  it("throws when a non-empty response yields zero parsed fields (selector break / soft block)", () => {
    const brokenMarkup = `<div>${"x".repeat(300)}</div>`;
    expect(() => parseSearchResults(brokenMarkup)).toThrow(/zero parsed fields/);
  });

  it("does not throw on a short empty body (that's the blocked heuristic's job, not the parser's)", () => {
    expect(parseSearchResults("")).toEqual([]);
  });
});

describe("parseJobDetail", () => {
  it("extracts and plain-texts the job description", () => {
    const html = `<div class="description__text"><p>Build things.</p><br>With &amp; without frameworks.</div>`;
    expect(parseJobDetail(html)).toContain("Build things.");
    expect(parseJobDetail(html)).toContain("With & without frameworks.");
  });

  it("returns empty string for a short body instead of throwing", () => {
    expect(parseJobDetail("")).toBe("");
  });
});
