import Link from "next/link";
import { Shell } from "@repo/ui";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PostCard } from "@/components/post-card";
import { getAllPosts, getCategories, getPostExcerpt, getReadingTime } from "@/lib/blog";
import { getCategoryColor } from "@/lib/category-colors";

export const metadata = {
  title: "Blog",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const categories = getCategories();
  const [featured, ...rest] = posts;
  const featuredColor = featured ? getCategoryColor(featured.category) : null;

  return (
    <Shell header={<SiteHeader />} footer={<SiteFooter />}>
      <div className="flex flex-col gap-14 pt-6 sm:pt-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog</h1>
          <p className="text-muted">Notes and write-ups, organized by topic.</p>
        </div>

        {posts.length === 0 ? (
          <p className="text-muted">No posts yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/blog"
                className="rounded-full border border-accent bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
              >
                All ({posts.length})
              </Link>
              {categories.map(({ category, label, count }) => {
                const color = getCategoryColor(category);
                return (
                  <Link
                    key={category}
                    href={`/blog/${category}`}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80 ${color.badge}`}
                  >
                    {label} ({count})
                  </Link>
                );
              })}
            </div>

            {featured ? (
              <Link href={`/blog/${featured.category}/${featured.slug}`} className="group">
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-6 shadow-card transition-colors group-hover:border-accent sm:p-8">
                  <div className="flex items-center gap-2">
                    {featuredColor ? (
                      <span
                        className={`w-fit rounded-full px-2.5 py-0.5 text-[0.65rem] font-medium ${featuredColor.badge}`}
                      >
                        {featured.categoryLabel}
                      </span>
                    ) : null}
                    <span className="text-xs font-medium text-muted">Latest</span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {featured.title}
                  </h2>
                  <p className="max-w-2xl text-sm text-muted sm:text-base">
                    {getPostExcerpt(featured, 220)}
                  </p>
                  <p className="text-xs text-muted">
                    {featured.uploader} ·{" "}
                    {new Date(featured.publishedAt).toLocaleDateString("en-US")} ·{" "}
                    {getReadingTime(featured)} min read
                  </p>
                </div>
              </Link>
            ) : null}

            {rest.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <PostCard key={`${post.category}-${post.slug}`} post={post} showCategory />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </Shell>
  );
}
