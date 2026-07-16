import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Shell } from "@repo/ui";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCategories, getPostsByCategory } from "@/lib/blog";

export async function generateStaticParams() {
  return getCategories().map(({ category }) => ({ category }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[category]">) {
  const { category } = await params;
  const match = getCategories().find((c) => c.category === category);
  return { title: match ? match.label : "Category not found" };
}

export default async function BlogCategoryPage({ params }: PageProps<"/blog/[category]">) {
  const { category } = await params;
  const posts = getPostsByCategory(category);

  const [firstPost] = posts;
  if (!firstPost) notFound();

  const label = firstPost.categoryLabel;

  return (
    <Shell header={<SiteHeader />} footer={<SiteFooter />}>
      <div className="flex flex-col gap-8 pt-6 sm:pt-10">
        <div className="flex flex-col gap-2">
          <Link href="/blog" className="w-fit text-xs text-muted hover:text-foreground">
            ← All posts
          </Link>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{label}</h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.category}/${post.slug}`}>
              <Card className="h-full transition-colors hover:border-accent">
                <CardHeader>
                  <CardTitle className="text-base">{post.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted">
                    {post.uploader} · {new Date(post.publishedAt).toLocaleDateString("en-US")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Shell>
  );
}
