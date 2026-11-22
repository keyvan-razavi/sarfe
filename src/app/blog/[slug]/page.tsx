import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale } from "@/lib/locale-server";
import { localizedPageMetadata, localizedSeoUrls } from "@/lib/seo";
import { getProductionSiteUrl } from "@/lib/site-config";
import { getBlogPostBySlug, getRelatedBlogPosts } from "@/modules/blog";
import { getProductBySlug } from "@/modules/catalog";
import { ArticleContent, ArticleDate, ArticleReadingTime, RelatedBlogPosts, RelatedProducts } from "@/modules/blog/article-content";
import { StorefrontFooter, StorefrontHeader } from "@/components/storefront/site-shell";
import "@/components/storefront/storefront.css";
import "@/modules/blog/blog.css";

const labels = { fa: { back: "همهٔ نوشته‌ها", read: "زمان مطالعه", tags: "برچسب‌ها" }, ckb: { back: "هەموو نووسراوەکان", read: "کاتی خوێندنەوە", tags: "تاگەکان" } } as const;

function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const { post } = await getBlogPostBySlug(slug);
  if (!post) return locale === "fa" ? { title: "نوشته پیدا نشد" } : { title: "نووسراوە نەدۆزرایەوە" };
  const content = post.translations[locale] ?? post.translations.fa;
  const title = content.seoTitle || content.title;
  const description = content.seoDescription || content.excerpt;
  const images = post.coverImage ? [{ url: post.coverImage, alt: post.coverAlt || content.title }] : undefined;
  return { title, description, ...localizedPageMetadata(`/blog/${encodeURIComponent(post.slug)}`, locale), openGraph: { type: "article", title, description, images, publishedTime: post.publishedAt ?? undefined, modifiedTime: post.updatedAt } };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const { post } = await getBlogPostBySlug(slug);
  if (!post) notFound();
  const content = post.translations[locale] ?? post.translations.fa;
  const productSlugs = [...new Set([...post.relatedProductSlugs, ...content.blocks.filter((block) => block.type === "product" && block.productSlug).map((block) => block.productSlug!)])];
  const [products, relatedPosts] = await Promise.all([
    Promise.all(productSlugs.map((productSlug) => getProductBySlug(productSlug))).then((results) => results.flatMap(({ product }) => product ? [product] : [])),
    getRelatedBlogPosts(post.relatedPostSlugs, locale),
  ]);
  const publishedDate = post.publishedAt ?? post.updatedAt;
  const siteUrl = getProductionSiteUrl(process.env.APP_URL);
  const url = siteUrl ? localizedSeoUrls(siteUrl, `/blog/${encodeURIComponent(post.slug)}`)[locale].canonical : undefined;
  const image = post.coverImage && siteUrl ? new URL(post.coverImage, siteUrl).toString() : undefined;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: content.title,
    description: content.excerpt,
    inLanguage: locale,
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    dateModified: post.updatedAt,
    ...(image ? { image: [image] } : {}),
    ...(url ? { url, mainEntityOfPage: { "@type": "WebPage", "@id": url } } : {}),
    publisher: { "@type": "Organization", name: "صرفه" },
  };
  const t = labels[locale];

  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }} /><div className="premium-home"><StorefrontHeader /><main className="blog-article-page">
    <Link className="blog-back-link" href="/blog">{t.back}</Link>
    <header className="blog-article-header">
      <h1>{content.title}</h1>
      <p className="blog-article-excerpt">{content.excerpt}</p>
      <div className="blog-article-meta"><ArticleDate date={publishedDate} locale={locale} /><span aria-hidden="true">·</span><span aria-label={t.read}><ArticleReadingTime blocks={content.blocks} locale={locale} /></span></div>
      {post.tags.length > 0 && <ul className="blog-tags" aria-label={t.tags}>{post.tags.map((tag) => <li key={tag}><Link href={`/blog?tag=${encodeURIComponent(tag)}`}>{tag}</Link></li>)}</ul>}
    </header>
    {post.coverImage && <figure className="blog-article-cover"><Image src={post.coverImage} alt={post.coverAlt || content.title} fill priority sizes="(max-width: 900px) 100vw, 1100px" unoptimized /></figure>}
    <ArticleContent blocks={content.blocks} locale={locale} products={products} />
    <RelatedBlogPosts posts={relatedPosts} locale={locale} />
    <RelatedProducts products={products} locale={locale} />
  </main><StorefrontFooter /></div></>;
}
