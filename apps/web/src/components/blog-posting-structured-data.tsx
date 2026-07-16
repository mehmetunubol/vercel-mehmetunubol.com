import { siteUrl } from "@/lib/seo";
import type { BlogPost } from "@/lib/blog";

export function BlogPostingStructuredData({
  post,
  excerpt,
}: {
  post: BlogPost;
  excerpt: string;
}) {
  const url = `${siteUrl}/blog/${post.category}/${post.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#post`,
    headline: post.title,
    description: excerpt,
    url,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    inLanguage: "en",
    isPartOf: { "@id": `${siteUrl}/#website` },
    author: { "@id": `${siteUrl}/#person` },
    publisher: { "@id": `${siteUrl}/#person` },
    articleSection: post.categoryLabel,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
