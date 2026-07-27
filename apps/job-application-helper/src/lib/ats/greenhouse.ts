import type { NormalizedJob } from "@/lib/jobs";
import { htmlToPlainText } from "@/lib/html";

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  location?: { name?: string };
  content?: string;
}

export async function fetchGreenhouseJobs(boardToken: string, companyName: string): Promise<NormalizedJob[]> {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Greenhouse fetch failed for board "${boardToken}": ${res.status}`);
  }
  const data = (await res.json()) as { jobs: GreenhouseJob[] };

  return data.jobs.map((job) => ({
    source: "greenhouse",
    externalId: String(job.id),
    url: job.absolute_url,
    title: job.title,
    company: companyName,
    location: job.location?.name,
    rawDescription: htmlToPlainText(job.content ?? ""),
    postedAt: job.updated_at ? new Date(job.updated_at) : undefined,
  }));
}
