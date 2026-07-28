import { and, ilike, not, or, type SQL } from "drizzle-orm";
import { jobs } from "@/lib/db/schema";

export interface SearchPreferenceFilter {
  keywords: string[];
  excludeKeywords: string[];
  locations: string[];
  remoteOnly: boolean;
}

// Escape SQL LIKE/ILIKE wildcards so a keyword containing "%" or "_" is
// matched literally instead of as a pattern.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function textMatches(needle: string): SQL {
  const pattern = `%${escapeLike(needle)}%`;
  return or(ilike(jobs.title, pattern), ilike(jobs.rawDescription, pattern))!;
}

/**
 * Builds a SQL WHERE clause from search preferences, so filtering happens in
 * the query (before any LIMIT) instead of in JS after truncating to a page of
 * recent rows — otherwise a matching job outside that page is silently missed.
 * Returns undefined when there's nothing to filter on (matches everything).
 */
export function preferenceWhereClause(prefs: SearchPreferenceFilter): SQL | undefined {
  const clauses: SQL[] = [];

  if (prefs.keywords.length > 0) {
    clauses.push(or(...prefs.keywords.map(textMatches))!);
  }

  for (const keyword of prefs.excludeKeywords) {
    clauses.push(not(textMatches(keyword)));
  }

  const locationNeedles = prefs.remoteOnly ? [...prefs.locations, "remote"] : prefs.locations;
  if (locationNeedles.length > 0) {
    clauses.push(or(...locationNeedles.map((location) => ilike(jobs.location, `%${escapeLike(location)}%`)))!);
  }

  if (clauses.length === 0) return undefined;
  return and(...clauses);
}
