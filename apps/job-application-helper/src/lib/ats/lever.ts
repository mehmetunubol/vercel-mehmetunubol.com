import type { NormalizedJob } from "@/lib/jobs";
import { htmlToPlainText } from "@/lib/html";

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt: number;
  categories?: { location?: string };
  descriptionPlain?: string;
  description?: string;
}

export async function fetchLeverJobs(site: string, companyName: string): Promise<NormalizedJob[]> {
  const res = await fetch(`https://api.lever.co/v0/postings/${site}?mode=json`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Lever fetch failed for site "${site}": ${res.status}`);
  }
  const postings = (await res.json()) as LeverPosting[];

  return postings.map((posting) => ({
    source: "lever",
    externalId: posting.id,
    url: posting.hostedUrl,
    title: posting.text,
    company: companyName,
    location: posting.categories?.location,
    rawDescription: posting.descriptionPlain
      ? posting.descriptionPlain
      : htmlToPlainText(posting.description ?? ""),
    postedAt: posting.createdAt ? new Date(posting.createdAt) : undefined,
  }));
}
