// LinkedIn's guest job-search HTML is unversioned and changes without
// notice — every selector used to parse it lives here so a breakage is a
// one-file fix. Re-check these against a live response if parsing starts
// throwing BlockedError / zero-fields-parsed.
export const SELECTORS = {
  card: "li",
  cardEntity: ".base-card, .job-search-card",
  title: ".base-search-card__title, .job-search-card__title, h3",
  company: ".base-search-card__subtitle, .job-search-card__subtitle, h4",
  location: ".job-search-card__location",
  link: "a.base-card__full-link, a.job-search-card__link, a[href]",
  postedAt: "time[datetime]",
  detailDescription: ".show-more-less-html__markup, .description__text",
} as const;
