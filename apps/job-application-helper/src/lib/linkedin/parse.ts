import * as cheerio from "cheerio";
import { decodeHtmlEntities, htmlToPlainText } from "@/lib/html";
import { SELECTORS } from "./selectors";

export interface ParsedJobCard {
  jobId: string;
  title: string;
  company: string;
  location?: string;
  url: string;
  postedAt?: Date;
}

function jobIdFromUrl(url: string): string | undefined {
  // e.g. https://www.linkedin.com/jobs/view/1234567890/?...
  const match = url.match(/-(\d+)(?:\?|$)|\/view\/(\d+)/);
  return match?.[1] ?? match?.[2];
}

/**
 * Parses a guest search-results HTML fragment into job cards. Throws when
 * the body is non-empty but nothing usable was extracted — that signals a
 * selector break or a soft-block page, not genuinely zero results (see
 * scraper.ts's blocked-vs-empty heuristic, which uses this as one input).
 */
export function parseSearchResults(html: string): ParsedJobCard[] {
  const $ = cheerio.load(html);
  const cards: ParsedJobCard[] = [];

  $(SELECTORS.card).each((_, element) => {
    const $card = $(element);
    const entity = $card.is(SELECTORS.cardEntity) ? $card : $card.find(SELECTORS.cardEntity).first();
    if (entity.length === 0) return;

    const href = entity.find(SELECTORS.link).first().attr("href")?.split("?")[0];
    const title = decodeHtmlEntities(entity.find(SELECTORS.title).first().text().trim());
    const company = decodeHtmlEntities(entity.find(SELECTORS.company).first().text().trim());
    if (!href || !title || !company) return;

    const jobId = jobIdFromUrl(href);
    if (!jobId) return;

    const location = entity.find(SELECTORS.location).first().text().trim() || undefined;
    const postedAttr = entity.find(SELECTORS.postedAt).first().attr("datetime");

    cards.push({
      jobId,
      title,
      company,
      location,
      url: href,
      postedAt: postedAttr ? new Date(postedAttr) : undefined,
    });
  });

  if (html.trim().length > 200 && cards.length === 0) {
    throw new Error("parseSearchResults: non-empty response yielded zero parsed fields");
  }

  return cards;
}

/** Parses the `jobPosting/{id}` detail response into a plain-text description. */
export function parseJobDetail(html: string): string {
  const $ = cheerio.load(html);
  const description = $(SELECTORS.detailDescription).first().html();
  if (!description) {
    if (html.trim().length > 200) {
      throw new Error("parseJobDetail: non-empty response yielded zero parsed fields");
    }
    return "";
  }
  return htmlToPlainText(description);
}
