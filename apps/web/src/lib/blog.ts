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

const BLOG_CONTENT_DIR = path.join(process.cwd(), "content", "blog");

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

export function getPostExcerpt(post: BlogPost, maxLength = 160): string {
  const text = post.html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
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
