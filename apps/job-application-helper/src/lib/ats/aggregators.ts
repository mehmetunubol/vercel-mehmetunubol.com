import type { NormalizedJob } from "@/lib/jobs";
import { decodeHtmlEntities, htmlToPlainText } from "@/lib/html";

interface RemoteOkJob {
  id?: string;
  url?: string;
  company?: string;
  position?: string;
  description?: string;
  date?: string;
  location?: string;
}

export async function fetchRemoteOkJobs(): Promise<NormalizedJob[]> {
  const res = await fetch("https://remoteok.com/api", {
    cache: "no-store",
    headers: { "User-Agent": "job-application-helper (personal use)" },
  });
  if (!res.ok) {
    throw new Error(`RemoteOK fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as RemoteOkJob[];

  // First element is a legal-notice object, not a job — skip it.
  return data
    .filter((job) => job.id && job.position && job.url)
    .map((job) => ({
      source: "remoteok" as const,
      externalId: job.id!,
      url: job.url!,
      title: decodeHtmlEntities(job.position!),
      company: decodeHtmlEntities(job.company ?? "Unknown"),
      location: job.location,
      rawDescription: htmlToPlainText(job.description ?? ""),
      postedAt: job.date ? new Date(job.date) : undefined,
    }));
}

interface ArbeitnowJob {
  slug: string;
  url: string;
  title: string;
  company_name: string;
  description?: string;
  location?: string;
  created_at: number;
}

// Arbeitnow paginates (~175 jobs/page) with a `links.next` URL — fetching
// only page 1 silently missed everything after it. Page through until
// there's no next link, capped so one sync run can't run away or hammer
// their API (they ask not to abuse it); the daily cron plus upsert means
// anything not caught this run gets picked up on a later one anyway.
const ARBEITNOW_MAX_PAGES = 10;

// Arbeitnow orders results by created_at descending (their own docs), so once
// a page's oldest job is older than `sinceMs`, every later page is too — stop
// there instead of re-fetching everything on every sync. Pass the aggregator's
// last successful sync time; omit for a full crawl (e.g. first-ever sync).
export async function fetchArbeitnowJobs(sinceMs?: number): Promise<NormalizedJob[]> {
  const allJobs: ArbeitnowJob[] = [];
  let url: string | null = "https://www.arbeitnow.com/api/job-board-api";

  for (let page = 0; url && page < ARBEITNOW_MAX_PAGES; page++) {
    const res: Response = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Arbeitnow fetch failed: ${res.status}`);
    }
    const data = (await res.json()) as { data: ArbeitnowJob[]; links?: { next?: string | null } };
    allJobs.push(...data.data);

    const oldestInPage = data.data.at(-1);
    if (sinceMs && oldestInPage && oldestInPage.created_at * 1000 <= sinceMs) break;
    url = data.links?.next ?? null;
  }

  const newJobs = sinceMs ? allJobs.filter((job) => job.created_at * 1000 > sinceMs) : allJobs;

  return newJobs.map((job) => ({
    source: "arbeitnow",
    externalId: job.slug,
    url: job.url,
    title: decodeHtmlEntities(job.title),
    company: decodeHtmlEntities(job.company_name),
    location: job.location,
    rawDescription: htmlToPlainText(job.description ?? ""),
    postedAt: job.created_at ? new Date(job.created_at * 1000) : undefined,
  }));
}
