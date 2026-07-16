import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import type { BlogPost } from "@/lib/blog";
import { getPostExcerpt, getReadingTime } from "@/lib/blog";
import { getCategoryColor } from "@/lib/category-colors";

export function PostCard({
  post,
  showCategory = false,
}: {
  post: BlogPost;
  showCategory?: boolean;
}) {
  const color = getCategoryColor(post.category);

  return (
    <Link href={`/blog/${post.category}/${post.slug}`}>
      <Card className="flex h-full flex-col transition-colors hover:border-accent">
        <CardHeader className="flex flex-col gap-2">
          {showCategory ? (
            <span
              className={`w-fit rounded-full px-2.5 py-0.5 text-[0.65rem] font-medium ${color.badge}`}
            >
              {post.categoryLabel}
            </span>
          ) : null}
          <CardTitle className="text-base">{post.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <p className="text-sm text-muted">{getPostExcerpt(post, 120)}</p>
          <p className="mt-auto text-xs text-muted">
            {post.uploader} · {new Date(post.publishedAt).toLocaleDateString("en-US")} ·{" "}
            {getReadingTime(post)} min read
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
