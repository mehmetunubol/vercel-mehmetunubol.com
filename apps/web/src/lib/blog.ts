import fs from "fs";
import path from "path";

export interface BlogPost {
  title: string;
  category: string;
  categoryLabel: string;
  slug: string;
  date: string;
  sourceUrl: string;
  uploader: string;
  html: string;
  mermaid?: string;
  publishedAt: string;
}

export interface Heading {
  id: string;
  text: string;
  level: number;
}

const BLOG_CONTENT_DIR = path.join(process.cwd(), "content", "blog");
const WORDS_PER_MINUTE = 200;

function readPostFile(filePath: string): BlogPost {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_CONTENT_DIR)) return [];

  const categories = fs
    .readdirSync(BLOG_CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  const posts: BlogPost[] = [];
  for (const category of categories) {
    const categoryDir = path.join(BLOG_CONTENT_DIR, category.name);
    const files = fs.readdirSync(categoryDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      posts.push(readPostFile(path.join(categoryDir, file)));
    }
  }

  return posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getPostsByCategory(category: string): BlogPost[] {
  return getAllPosts().filter((post) => post.category === category);
}

export function getPost(category: string, slug: string): BlogPost | undefined {
  const filePath = path.join(BLOG_CONTENT_DIR, category, `${slug}.json`);
  if (!fs.existsSync(filePath)) return undefined;
  return readPostFile(filePath);
}

export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  return getPostsByCategory(post.category)
    .filter((p) => p.slug !== post.slug)
    .slice(0, limit);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPostExcerpt(post: BlogPost, maxLength = 160): string {
  const text = stripHtml(post.html);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export function getReadingTime(post: BlogPost): number {
  const wordCount = stripHtml(post.html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Injects id attributes into h2-h4 tags (for TOC anchors) and returns the
 * extracted heading list alongside the transformed HTML.
 */
export function addHeadingIds(html: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  const usedIds = new Set<string>();

  const transformed = html.replace(
    /<(h[2-4])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (match, tag: string, attrs: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      if (!text) return match;

      let id = slugifyHeading(text) || "section";
      while (usedIds.has(id)) {
        id = `${id}-${usedIds.size}`;
      }
      usedIds.add(id);

      headings.push({ id, text, level: Number(tag[1]) });
      return `<${tag}${attrs} id="${id}">${inner}</${tag}>`;
    }
  );

  return { html: transformed, headings };
}

export function getCategories(): { category: string; label: string; count: number }[] {
  const posts = getAllPosts();
  const map = new Map<string, { label: string; count: number }>();
  for (const post of posts) {
    const existing = map.get(post.category);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(post.category, { label: post.categoryLabel, count: 1 });
    }
  }
  return Array.from(map.entries()).map(([category, { label, count }]) => ({
    category,
    label,
    count,
  }));
}
