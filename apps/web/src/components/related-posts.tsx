import { PostCard } from "@/components/post-card";
import type { BlogPost } from "@/lib/blog";

export function RelatedPosts({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8">
      <h2 className="text-lg font-semibold tracking-tight">More in this category</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </section>
  );
}
