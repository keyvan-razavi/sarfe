import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getLocale } from "@/lib/locale-server";
import { hasNonEmptySeoFilters, localizedPageMetadata } from "@/lib/seo";
import { getBlogPosts } from "@/modules/blog";
import { ArticleDate } from "@/modules/blog/article-content";
import { StorefrontFooter, StorefrontHeader } from "@/components/storefront/site-shell";
import { Button, Input, Select } from "@/components/ui";
import "@/components/storefront/storefront.css";
import "@/modules/blog/blog.css";

const text = {
  fa: { title: "خواندنی‌های صرفه", intro: "نوشته‌ها و راهنماهای منتشرشده دربارهٔ خواربار و نیازهای خانه.", search: "جست‌وجو در نوشته‌ها", searchButton: "جست‌وجو", tag: "برچسب", all: "همهٔ نوشته‌ها", empty: "نوشته‌ای برای این جست‌وجو پیدا نشد.", preview: "نمایش پیش‌نویس‌های وبلاگ در حالت پیش‌نمایش پایگاه داده در دسترس نیست.", previous: "قبلی", next: "بعدی", page: "صفحه" },
  ckb: { title: "خوێندنەوەکانی صرفه", intro: "نووسراوە و ڕێنماییە بڵاوکراوەکان دەربارەی خۆراک و پێداویستیی ماڵ.", search: "گەڕان لە نووسراوەکان", searchButton: "گەڕان", tag: "تاگ", all: "هەموو نووسراوەکان", empty: "هیچ نووسراوەیەک بۆ ئەم گەڕانە نەدۆزرایەوە.", preview: "لە دۆخی پێشبینین، نووسراوەکانی بلاگ لە بنکەدراوەوە بەردەست نین.", previous: "پێشوو", next: "دواتر", page: "لاپەڕە" },
} as const;

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const [locale, params] = await Promise.all([getLocale(), searchParams]);
  const filterRobots = hasNonEmptySeoFilters(params, ["q", "tag", "page"]) ? { robots: { index: false, follow: true } } : {};
  return locale === "fa"
    ? { title: "خواندنی‌ها", description: "راهنماها و نوشته‌های منتشرشدهٔ صرفه دربارهٔ خواربار و خانه.", ...localizedPageMetadata("/blog", locale), ...filterRobots }
    : { title: "خوێندنەوەکان", description: "ڕێنمایی و نووسراوە بڵاوکراوەکانی صرفه دەربارەی خۆراک و ماڵ.", ...localizedPageMetadata("/blog", locale), ...filterRobots };
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string; page?: string }> }) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const tag = typeof params.tag === "string" ? params.tag.trim().slice(0, 40) : "";
  const requestedPage = Number.parseInt(typeof params.page === "string" ? params.page : "1", 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100_000 ? requestedPage : 1;
  const result = await getBlogPosts({ locale, ...(query ? { search: query } : {}), ...(tag ? { tag } : {}), page });
  const t = text[locale];
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  const pageUrl = (number: number) => `/blog?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(tag ? { tag } : {}), page: String(number) }).toString()}`;

  return <div className="premium-home"><StorefrontHeader /><main className="blog-page">
    <header className="blog-index-intro"><h1>{t.title}</h1><p>{t.intro}</p></header>
    <form className="blog-filters" action="/blog" method="get">
      <label><span className="sr-only">{t.search}</span><Input name="q" type="search" maxLength={120} defaultValue={query} placeholder={t.search} /></label>
      <label><span className="sr-only">{t.tag}</span><Select name="tag" defaultValue={tag}><option value="">{t.all}</option>{result.tags.map((item) => <option key={item} value={item}>{item}</option>)}</Select></label>
      <Button type="submit">{t.searchButton}</Button>
    </form>
    {result.posts.length ? <div className="blog-list">
      {result.posts.map((post) => {
        const content = post.translations[locale] ?? post.translations.fa;
        return <article key={post.id} className={`blog-listing${post.coverImage ? "" : " blog-listing--text"}`}>
          {post.coverImage && <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="blog-listing-cover" aria-label={content.title}><Image src={post.coverImage} alt={post.coverAlt || content.title} fill sizes="(max-width: 760px) 100vw, 42vw" unoptimized /></Link>}
          <div className="blog-listing-copy"><p className="blog-listing-date"><ArticleDate date={post.publishedAt ?? post.updatedAt} locale={locale} /></p><h2><Link href={`/blog/${encodeURIComponent(post.slug)}`}>{content.title}</Link></h2><p>{content.excerpt}</p><ul className="blog-tags" aria-label={t.tag}>{post.tags.map((item) => <li key={item}><Link href={`/blog?tag=${encodeURIComponent(item)}`}>{item}</Link></li>)}</ul><Link className="blog-read-link" href={`/blog/${encodeURIComponent(post.slug)}`}>{locale === "fa" ? "ادامهٔ نوشته" : "بەردەوامبوون لە خوێندنەوە"}</Link></div>
        </article>;
      })}
    </div> : <p className="blog-empty">{result.mode === "preview" ? t.preview : t.empty}</p>}
    {pageCount > 1 && <nav className="blog-pagination" aria-label={t.page}>
      {page > 1 && <Link href={pageUrl(page - 1)}>{t.previous}</Link>}
      <span>{t.page} {new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "ckb-IQ").format(result.page)} / {new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "ckb-IQ").format(pageCount)}</span>
      {page < pageCount && <Link href={pageUrl(page + 1)}>{t.next}</Link>}
    </nav>}
  </main><StorefrontFooter /></div>;
}
