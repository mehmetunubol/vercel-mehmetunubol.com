import { site } from "@/lib/site";
import { siteUrl } from "@/lib/seo";

/**
 * JSON-LD structured data (schema.org) describing the person and the site.
 * Helps search engines build a rich, accurate knowledge panel for the name.
 */
export function StructuredData() {
  const graph = [
    {
      "@type": "Person",
      "@id": `${siteUrl}/#person`,
      name: site.name,
      url: siteUrl,
      email: `mailto:${site.email}`,
      jobTitle: site.title,
      description: site.summary,
      address: {
        "@type": "PostalAddress",
        addressLocality: site.locality,
        addressCountry: site.country,
      },
      knowsAbout: site.skillGroups.flatMap((group) => group.items),
      alumniOf: {
        "@type": "CollegeOrUniversity",
        name: "Izmir Institute of Technology",
      },
      sameAs: site.socials
        .filter((social) => social.href.startsWith("http"))
        .map((social) => social.href),
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: `${site.name} — ${site.title}`,
      description: site.summary,
      inLanguage: "en",
      publisher: { "@id": `${siteUrl}/#person` },
    },
  ];

  const jsonLd = { "@context": "https://schema.org", "@graph": graph };

  return (
    <script
      type="application/ld+json"
      // Structured data must be inlined as raw JSON for crawlers to read it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
