import { site } from "./site";

/**
 * Canonical site origin. Set NEXT_PUBLIC_SITE_URL in the deployment environment
 * (e.g. Vercel) to override the production default. Trailing slash is stripped.
 */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mehmetunubol.com").replace(
  /\/+$/,
  "",
);

/** Optional Google Search Console verification token (env-driven). */
export const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION;

export const keywords = [
  site.name,
  "Mehmet Unubol",
  site.title,
  "Back-end Developer",
  "Software Engineer",
  "Node.js Developer",
  "TypeScript",
  "Microservices",
  "Full-Stack Developer",
  "İzmir",
  "Turkey",
  "Türkiye",
];
