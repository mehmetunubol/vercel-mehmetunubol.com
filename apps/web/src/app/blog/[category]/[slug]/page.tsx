import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Shell } from "@repo/ui";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { BlogPostingStructuredData } from "@/components/blog-posting-structured-data";
import { PostActions } from "@/components/post-actions";
import { getAllPosts, getPost, getPostExcerpt } from "@/lib/blog";
import { siteUrl } from "@/lib/seo";

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ category: post.category, slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[category]/[slug]">): Promise<Metadata> {
  const { category, slug } = await params;
  const post = getPost(category, slug);

  if (!post) return { title: "Post not found" };

  const excerpt = getPostExcerpt(post);
  const url = `${siteUrl}/blog/${post.category}/${post.slug}`;

  return {
    title: post.title,
    description: excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: excerpt,
      url,
      publishedTime: post.publishedAt,
      section: post.categoryLabel,
    },
    twitter: {
      card: "summary",
      title: post.title,
      description: excerpt,
    },
  };
}

export default async function BlogPostPage({
  params,
}: PageProps<"/blog/[category]/[slug]">) {
  const { category, slug } = await params;
  const post = getPost(category, slug);

  if (!post) notFound();

  const excerpt = getPostExcerpt(post);

  return (
    <Shell header={<SiteHeader />} footer={<SiteFooter />}>
      <BlogPostingStructuredData post={post} excerpt={excerpt} />
      <article className="flex flex-col gap-8 pt-6 sm:pt-10">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-wide text-accent">
            {post.categoryLabel}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
          <p className="text-sm text-muted">
            {post.uploader} · {new Date(post.publishedAt).toLocaleDateString("en-US")} ·{" "}
            <a href={post.sourceUrl} target="_blank" rel="noreferrer" className="underline">
              source
            </a>
          </p>
        </div>

        <PostActions title={post.title} />

        <div
          className="prose dark:prose-invert max-w-none prose-headings:tracking-tight prose-a:text-accent"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        {post.mermaid ? <MermaidDiagram chart={post.mermaid} /> : null}
      </article>
    </Shell>
  );
}
