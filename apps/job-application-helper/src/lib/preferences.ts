import type { jobs } from "@/lib/db/schema";

export interface SearchPreferenceFilter {
  keywords: string[];
  excludeKeywords: string[];
  locations: string[];
  remoteOnly: boolean;
}

type Job = typeof jobs.$inferSelect;

function includesAny(haystack: string, needles: string[]) {
  const lower = haystack.toLowerCase();
  return needles.some((needle) => needle.trim() && lower.includes(needle.toLowerCase()));
}

export function jobMatchesPreferences(job: Job, prefs: SearchPreferenceFilter): boolean {
  const searchText = `${job.title} ${job.rawDescription}`;

  if (prefs.keywords.length > 0 && !includesAny(searchText, prefs.keywords)) {
    return false;
  }

  if (prefs.excludeKeywords.length > 0 && includesAny(searchText, prefs.excludeKeywords)) {
    return false;
  }

  const locationNeedles = prefs.remoteOnly ? [...prefs.locations, "remote"] : prefs.locations;
  if (locationNeedles.length > 0) {
    if (!job.location || !includesAny(job.location, locationNeedles)) {
      return false;
    }
  }

  return true;
}
