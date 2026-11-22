import type { MetadataRoute } from "next";
import { getIndexableSiteUrl } from "@/lib/site-config";
import { getCatalog, getCategories } from "@/modules/catalog";
import { getBlogSitemapPosts } from "@/modules/blog";

export const dynamic = "force-dynamic";

function localizedEntries(path: string, siteUrl: URL, lastModified?: string): MetadataRoute.Sitemap {
  const localizedUrl = (locale: "fa" | "ckb") => {
    const url = new URL(path, siteUrl);
    url.searchParams.set("lang", locale);
    return url.toString();
  };
  const languages = { fa: localizedUrl("fa"), ckb: localizedUrl("ckb"), "x-default": localizedUrl("fa") };
  return (["fa", "ckb"] as const).map((locale) => ({
    url: languages[locale],
    alternates: { languages },
    ...(lastModified ? { lastModified } : {}),
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getIndexableSiteUrl({
    appUrl: process.env.APP_URL,
    indexable: process.env.STORE_INDEXABLE,
    nodeEnv: process.env.NODE_ENV,
  });
  if (!siteUrl) return [];

  const [catalog, categories, blogPosts] = await Promise.all([
    getCatalog(),
    getCategories(),
    getBlogSitemapPosts(),
  ]);
  // Never advertise the sample preview as production content.
  if (catalog.mode !== "database" || categories.mode !== "database") return [];

  return [
    ...["/", "/about", "/products", "/categories", "/blog"].flatMap((path) =>
      localizedEntries(path, siteUrl),
    ),
    ...categories.categories.flatMap((category) =>
      localizedEntries(`/categories/${encodeURIComponent(category.slug)}`, siteUrl),
    ),
    ...catalog.products.flatMap((product) =>
      localizedEntries(`/products/${encodeURIComponent(product.slug)}`, siteUrl),
    ),
    ...blogPosts.flatMap((post) =>
      localizedEntries(`/blog/${encodeURIComponent(post.slug)}`, siteUrl, post.updatedAt),
    ),
  ];
}
