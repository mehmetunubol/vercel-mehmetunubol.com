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
