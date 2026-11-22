import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBrands, getCatalog } from "@/modules/catalog";
import { getLocale } from "@/lib/locale-server";
import { hasNonEmptySeoFilters, localizedPageMetadata } from "@/lib/seo";
import { CatalogPage } from "@/components/storefront/catalog-page";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const [{ slug }, locale, search] = await Promise.all([params, getLocale(), searchParams]);
  const filterRobots = hasNonEmptySeoFilters(search, ["q", "brand"]) ? { robots: { index: false, follow: true } } : {};
  const catalog = await getCatalog({ category: slug });
  const category = catalog.categories.find((item) => item.slug === slug);
  if (!category) return locale === "fa" ? { title: "دسته‌بندی پیدا نشد" } : { title: "پۆل نەدۆزرایەوە" };
  const name = category.translations?.[locale]?.name ?? category.name;
  return locale === "fa" ? { title: `${name} | صرفه`, description: `بررسی کالاهای دستهٔ ${name} در فروشگاه صرفه.`, ...localizedPageMetadata(`/categories/${encodeURIComponent(category.slug)}`, locale), ...filterRobots } : { title: `${name} | صرفه`, description: `بینینی کاڵاکانی پۆلی ${name} لە فرۆشگای صرفه.`, ...localizedPageMetadata(`/categories/${encodeURIComponent(category.slug)}`, locale), ...filterRobots };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; brand?: string }> }) {
  const [{ slug }, search, locale] = await Promise.all([params, searchParams, getLocale()]);
  const query = search.q?.trim() ?? "";
  const brandSlug = search.brand?.trim() ?? "";
  const [catalog, brandResult] = await Promise.all([
    getCatalog({ category: slug, ...(query ? { query } : {}), ...(brandSlug ? { brand: brandSlug } : {}) }),
    getBrands(),
  ]);
  const category = catalog.categories.find((item) => item.slug === slug);
  if (!category) notFound();
  const brand = brandResult.brands.find((item) => item.slug === brandSlug) ?? null;
  return <CatalogPage locale={locale} products={catalog.products} categories={catalog.categories} brands={brandResult.brands} mode={catalog.mode} category={category} query={query} brand={brand} />;
}
