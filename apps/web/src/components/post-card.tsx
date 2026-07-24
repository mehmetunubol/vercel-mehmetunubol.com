import type { BlogPost } from "@/lib/blog";
import { getPostExcerpt, getReadingTime } from "@/lib/blog";
import { getCategoryColor } from "@/lib/category-colors";
import { PostCardMotion } from "@/components/post-card-motion";

export function PostCard({
  post,
  showCategory = false,
}: {
  post: BlogPost;
  showCategory?: boolean;
}) {
  const color = getCategoryColor(post.category);
  const meta = `${post.uploader} · ${new Date(post.publishedAt).toLocaleDateString("en-US")} · ${getReadingTime(post)} min read`;

  return (
    <PostCardMotion
      href={`/blog/${post.category}/${post.slug}`}
      categoryLabel={post.categoryLabel}
      categoryBadgeClass={color.badge}
      showCategory={showCategory}
      title={post.title}
      excerpt={getPostExcerpt(post, 120)}
      meta={meta}
    />
  );
}
