import { BlockedError, RateLimitError } from "./errors";
import { serializeFilters, type LinkedInSearchFilters } from "./filters";
import { parseJobDetail, parseSearchResults, type ParsedJobCard } from "./parse";

const SEARCH_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";
const DETAIL_URL = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting";

const PAGE_SIZE = 25;
// LinkedIn's guest search stops returning new results well before this —
// larger result sets need query slicing (narrower postedWithin windows,
// multiple geoIds run as separate saved searches), not deeper paging.
const START_CAP = 1000;

const USER_AGENT = "job-application-helper (personal use)";

function randomDelayMs(): number {
  return 2000 + Math.random() * 3000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchGuestPage(url: string): Promise<string> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": USER_AGENT },
  });
  if (res.status === 429) throw new RateLimitError(url);
  if (!res.ok) throw new Error(`LinkedIn fetch failed: ${res.status} ${url}`);
  return res.text();
}

/**
 * An empty parsed card list on a 200 response means either "no results" or
 * "soft-blocked" — a short body is the tell for the latter; a longer body
 * with genuinely zero matches (or a "no results" empty-state page) is
 * treated as a real empty page. Without this distinction a scheduled run
 * silently reports zero new jobs for days instead of ever failing loudly.
 */
const BLOCKED_BODY_LENGTH_THRESHOLD = 200;

export function assertNotBlocked(html: string, url: string, cards: ParsedJobCard[]): void {
  if (cards.length > 0) return;
  if (html.trim().length < BLOCKED_BODY_LENGTH_THRESHOLD) {
    throw new BlockedError(url, `body length ${html.trim().length}`);
  }
}

/**
 * Pages through LinkedIn's guest job search until exhausted, rate-limited,
 * blocked, or the `start` cap is hit. Sequential requests only, with a
 * randomized 2-5s delay between pages.
 */
export async function* pageSearch(filters: LinkedInSearchFilters): AsyncGenerator<ParsedJobCard[]> {
  for (let start = 0; start < START_CAP; start += PAGE_SIZE) {
    const params = serializeFilters(filters, start);
    const url = `${SEARCH_URL}?${params.toString()}`;
    const html = await fetchGuestPage(url);
    const cards = parseSearchResults(html);
    assertNotBlocked(html, url, cards);

    if (cards.length === 0) return;
    yield cards;
    if (cards.length < PAGE_SIZE) return;

    await sleep(randomDelayMs());
  }
}

export async function fetchJobDescription(jobId: string): Promise<string> {
  const url = `${DETAIL_URL}/${jobId}`;
  const html = await fetchGuestPage(url);
  return parseJobDetail(html);
}
