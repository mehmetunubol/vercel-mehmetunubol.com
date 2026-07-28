import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";

/** Normalizes company + title + location into a stable dedupe key. */
export function normalizedJobKey(company: string, title: string, location?: string): string {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
  return [normalize(company), normalize(title), normalize(location ?? "")].join("::");
}

/**
 * Maps every existing job's normalized (company + title + location) key to
 * its id, so a LinkedIn find can be checked against jobs added through any
 * other source (manual paste, a tracked board, an aggregator) even though
 * they don't share a LinkedIn job id.
 */
export async function buildDuplicateKeyIndex(): Promise<Map<string, string>> {
  const rows = await db.select({ id: jobs.id, company: jobs.company, title: jobs.title, location: jobs.location }).from(jobs);
  const index = new Map<string, string>();
  for (const row of rows) {
    index.set(normalizedJobKey(row.company, row.title, row.location ?? undefined), row.id);
  }
  return index;
}
