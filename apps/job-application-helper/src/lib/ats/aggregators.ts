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

export async function fetchArbeitnowJobs(): Promise<NormalizedJob[]> {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Arbeitnow fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as { data: ArbeitnowJob[] };

  return data.data.map((job) => ({
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
