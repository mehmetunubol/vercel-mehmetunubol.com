export type PostedWithin = "1h" | "24h" | "week" | "month";
export type ExperienceLevel = "intern" | "entry" | "associate" | "senior" | "director" | "executive";
export type JobType = "full-time" | "part-time" | "contract" | "temporary" | "volunteer" | "internship" | "other";
export type Workplace = "onsite" | "remote" | "hybrid";
export type SortOrder = "newest" | "relevance";

export interface LinkedInSearchFilters {
  keywords?: string;
  /** Resolved via geo.ts typeahead lookup — never a free-text location here. */
  geoId?: string;
  postedWithin?: PostedWithin;
  experience?: ExperienceLevel;
  jobType?: JobType[];
  workplace?: Workplace[];
  easyApplyOnly?: boolean;
  fewApplicants?: boolean;
  sort?: SortOrder;
  radiusMiles?: string;
}

const POSTED_WITHIN_SECONDS: Record<PostedWithin, number> = {
  "1h": 3600,
  "24h": 86400,
  week: 604800,
  month: 2592000,
};

const EXPERIENCE_CODES: Record<ExperienceLevel, string> = {
  intern: "1",
  entry: "2",
  associate: "3",
  senior: "4",
  director: "5",
  executive: "6",
};

const JOB_TYPE_CODES: Record<JobType, string> = {
  "full-time": "F",
  "part-time": "P",
  contract: "C",
  temporary: "T",
  volunteer: "V",
  internship: "I",
  other: "O",
};

const WORKPLACE_CODES: Record<Workplace, string> = {
  onsite: "1",
  remote: "2",
  hybrid: "3",
};

const SORT_CODES: Record<SortOrder, string> = {
  newest: "DD",
  relevance: "R",
};

/**
 * Serializes typed filter options into LinkedIn's `f_*` guest-search query
 * params. Callers never construct `f_*` params directly — this is the only
 * place that knows those codes.
 */
export function serializeFilters(filters: LinkedInSearchFilters, start = 0): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.keywords) params.set("keywords", filters.keywords);
  if (filters.geoId) params.set("geoId", filters.geoId);
  if (filters.postedWithin) params.set("f_TPR", `r${POSTED_WITHIN_SECONDS[filters.postedWithin]}`);
  if (filters.experience) params.set("f_E", EXPERIENCE_CODES[filters.experience]);
  if (filters.jobType?.length) params.set("f_JT", filters.jobType.map((type) => JOB_TYPE_CODES[type]).join(","));
  if (filters.workplace?.length) {
    params.set("f_WT", filters.workplace.map((workplace) => WORKPLACE_CODES[workplace]).join(","));
  }
  if (filters.easyApplyOnly) params.set("f_AL", "true");
  if (filters.fewApplicants) params.set("f_JIYN", "true");
  params.set("sortBy", SORT_CODES[filters.sort ?? "newest"]);
  if (filters.radiusMiles) params.set("distance", filters.radiusMiles);
  params.set("start", String(start));

  return params;
}
