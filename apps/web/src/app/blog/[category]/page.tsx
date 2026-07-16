import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@repo/ui";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PostCard } from "@/components/post-card";
import { getCategories, getPostsByCategory } from "@/lib/blog";
import { getCategoryColor } from "@/lib/category-colors";

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
  const color = getCategoryColor(category);

  return (
    <Shell header={<SiteHeader />} footer={<SiteFooter />}>
      <div className="flex flex-col gap-8 pt-6 sm:pt-10">
        <div className="flex flex-col gap-2">
          <Link href="/blog" className="w-fit text-xs text-muted hover:text-foreground">
            ← All posts
          </Link>
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${color.dot}`} />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{label}</h1>
          </div>
          <p className="text-sm text-muted">
            {posts.length} post{posts.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </Shell>
  );
}
