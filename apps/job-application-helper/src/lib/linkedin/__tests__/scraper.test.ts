import { afterEach, describe, expect, it, vi } from "vitest";
import { assertNotBlocked } from "../scraper";
import { BlockedError } from "../errors";
import type { ParsedJobCard } from "../parse";

const SAMPLE_CARD: ParsedJobCard = {
  jobId: "1",
  title: "T",
  company: "C",
  url: "https://www.linkedin.com/jobs/view/t-1",
};

describe("assertNotBlocked", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws BlockedError for a short body with zero cards (soft block, not real emptiness)", () => {
    expect(() => assertNotBlocked("<html>challenge</html>", "https://x", [])).toThrow(BlockedError);
  });

  it("does not throw when cards were parsed, regardless of body length", () => {
    expect(() => assertNotBlocked("<html>short</html>", "https://x", [SAMPLE_CARD])).not.toThrow();
  });

  it("does not throw for an empty body with zero cards below the threshold — still flagged as blocked, not silently passed", () => {
    // Below-threshold body + zero cards is exactly the blocked case; this
    // documents that the function has no other escape hatch.
    expect(() => assertNotBlocked("", "https://x", [])).toThrow(BlockedError);
  });
});

describe("pageSearch — network-level 429 and blocked handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws RateLimitError immediately on HTTP 429, no retry loop", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    const { pageSearch } = await import("../scraper");
    const { RateLimitError } = await import("../errors");

    await expect(async () => {
      for await (const _page of pageSearch({ keywords: "typescript" })) {
        // draining the generator until it throws
      }
    }).rejects.toThrow(RateLimitError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws BlockedError on a short zero-card 200 response instead of yielding an empty page silently", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("<html></html>", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { pageSearch } = await import("../scraper");
    const { BlockedError: Blocked } = await import("../errors");

    await expect(async () => {
      for await (const _page of pageSearch({ keywords: "typescript" })) {
        // drained until throw
      }
    }).rejects.toThrow(Blocked);
  });
});

// jobIdFromUrl() (parse.ts) only extracts numeric ids from the URL, so the
// href must end in digits — the human-readable jobId param becomes the
// title/company text instead, kept distinct enough to assert on.
function cardHtml(jobId: string, isoDate: string, numericId: number): string {
  return `<li>
    <div class="base-card job-search-card">
      <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/job-${numericId}"></a>
      <h3 class="base-search-card__title">Job ${jobId}</h3>
      <h4 class="base-search-card__subtitle">Company ${jobId}</h4>
      <time datetime="${isoDate}">${isoDate}</time>
    </div>
  </li>`;
}

describe("pageSearch — incremental sinceMs cutoff (mirrors Arbeitnow's sinceMs)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("drops cards at/older than sinceMs and stops paging once a page's oldest card is at/older than it", async () => {
    const page1 = `<ul>${cardHtml("new1", "2026-07-27", 1)}${cardHtml("new2", "2026-07-26", 2)}${cardHtml(
      "old1",
      "2026-07-20",
      3,
    )}</ul>`;
    const fetchMock = vi.fn().mockResolvedValue(new Response(page1, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { pageSearch } = await import("../scraper");
    const sinceMs = new Date("2026-07-25T00:00:00Z").getTime();

    const yielded: string[] = [];
    for await (const page of pageSearch({ keywords: "typescript", sort: "newest" }, sinceMs)) {
      yielded.push(...page.map((card) => card.title));
    }

    expect(yielded).toEqual(["Job new1", "Job new2"]);
    // Page's oldest card (old1) was at/older than the cutoff, so paging stops
    // after this one page instead of requesting page 2.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ignores the cutoff entirely under relevance sort, since posting date isn't monotonic across pages", async () => {
    const page1 = `<ul>${Array.from({ length: 25 }, (_, i) => cardHtml(`r${i}`, "2020-01-01", i + 1)).join("")}</ul>`;
    const page2 = `<ul>${cardHtml("rLast", "2026-07-27", 26)}</ul>`;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(page1, { status: 200 }))
      .mockResolvedValueOnce(new Response(page2, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    // Skip the real 2-5s inter-page delay — irrelevant to this test.
    vi.stubGlobal("setTimeout", (fn: () => void) => {
      fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    const { pageSearch } = await import("../scraper");
    const sinceMs = new Date("2026-07-25T00:00:00Z").getTime();

    const yielded: string[] = [];
    for await (const page of pageSearch({ keywords: "typescript", sort: "relevance" }, sinceMs)) {
      yielded.push(...page.map((card) => card.jobId));
    }

    // All 26 cards yielded (none dropped, both pages fetched) — the very old
    // dates on page 1 don't stop paging under relevance sort.
    expect(yielded).toHaveLength(26);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
