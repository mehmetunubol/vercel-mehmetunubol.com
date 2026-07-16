import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Shell } from "@repo/ui";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCategories, getPostsByCategory } from "@/lib/blog";

export const metadata = {
  title: "Blog",
};

export default function BlogIndexPage() {
  const categories = getCategories();

  return (
    <Shell header={<SiteHeader />} footer={<SiteFooter />}>
      <div className="flex flex-col gap-14 pt-6 sm:pt-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog</h1>
          <p className="text-muted">Notes and write-ups, organized by topic.</p>
        </div>

        {categories.length === 0 ? (
          <p className="text-muted">No posts yet.</p>
        ) : (
          categories.map(({ category, label }) => (
            <section key={category} className="flex flex-col gap-4">
              <Link
                href={`/blog/${category}`}
                className="w-fit text-xl font-semibold tracking-tight hover:text-accent"
              >
                {label}
              </Link>
              <div className="grid gap-4 sm:grid-cols-2">
                {getPostsByCategory(category).map((post) => (
                  <Link key={post.slug} href={`/blog/${post.category}/${post.slug}`}>
                    <Card className="h-full transition-colors hover:border-accent">
                      <CardHeader>
                        <CardTitle className="text-base">{post.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted">
                          {post.uploader} ·{" "}
                          {new Date(post.publishedAt).toLocaleDateString("en-US")}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </Shell>
  );
}
