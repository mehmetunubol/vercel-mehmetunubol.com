import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { linkedinSavedSearches } from "@/lib/db/schema";
import type { NormalizedJob } from "@/lib/jobs";
import { buildDuplicateKeyIndex, normalizedJobKey } from "./dedupe";
import type { LinkedInSearchFilters } from "./filters";
import { resolveGeoId } from "./geo";
import { fetchJobDescription, pageSearch } from "./scraper";

export { RateLimitError, BlockedError } from "./errors";
export type { LinkedInSearchFilters } from "./filters";

type SavedSearch = typeof linkedinSavedSearches.$inferSelect;

async function resolveFilters(savedSearch: SavedSearch): Promise<LinkedInSearchFilters> {
  let geoId = savedSearch.geoId ?? undefined;
  if (savedSearch.location && !geoId) {
    geoId = await resolveGeoId(savedSearch.location);
    if (geoId) {
      await db.update(linkedinSavedSearches).set({ geoId }).where(eq(linkedinSavedSearches.id, savedSearch.id));
    }
  }

  return {
    keywords: savedSearch.keywords || undefined,
    geoId,
    postedWithin: (savedSearch.postedWithin ?? undefined) as LinkedInSearchFilters["postedWithin"],
    experience: (savedSearch.experience ?? undefined) as LinkedInSearchFilters["experience"],
    jobType: savedSearch.jobType.length ? (savedSearch.jobType as LinkedInSearchFilters["jobType"]) : undefined,
    workplace: savedSearch.workplace.length ? (savedSearch.workplace as LinkedInSearchFilters["workplace"]) : undefined,
    easyApplyOnly: savedSearch.easyApplyOnly,
    fewApplicants: savedSearch.fewApplicants,
    sort: savedSearch.sort === "R" ? "relevance" : "newest",
    radiusMiles: savedSearch.radiusMiles ?? undefined,
  };
}

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 3000));
}

/**
 * Runs a saved LinkedIn search end to end: resolves/caches the geoId, pages
 * the guest search API — passing the saved search's own `lastRunAt` as the
 * incremental-fetch cutoff (same pattern as Arbeitnow's `sinceMs`, only
 * applied under "newest" sort) — drops anything already tracked under
 * another source (by normalized company+title+location — LinkedIn ids never
 * collide with other sources' external ids so that check alone isn't
 * enough), fetches a description per new listing, and returns NormalizedJob
 * rows ready for `upsertJobs()`. Propagates RateLimitError/BlockedError
 * instead of swallowing them — a scheduled run must fail loudly, not report
 * zero new jobs forever.
 */
export async function runSavedSearch(savedSearch: SavedSearch): Promise<NormalizedJob[]> {
  const filters = await resolveFilters(savedSearch);
  const duplicateIndex = await buildDuplicateKeyIndex();
  const sinceMs = savedSearch.lastRunAt?.getTime();

  const results: NormalizedJob[] = [];
  for await (const page of pageSearch(filters, sinceMs)) {
    for (const card of page) {
      const key = normalizedJobKey(card.company, card.title, card.location);
      if (duplicateIndex.has(key)) continue;

      const description = await fetchJobDescription(card.jobId);
      await delay();

      results.push({
        source: "linkedin",
        externalId: card.jobId,
        url: card.url,
        title: card.title,
        company: card.company,
        location: card.location,
        rawDescription: description,
        postedAt: card.postedAt,
      });
      duplicateIndex.set(key, card.jobId);
    }
  }
  return results;
}
