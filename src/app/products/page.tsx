import type { Metadata } from "next";
import { getBrands, getCatalog } from "@/modules/catalog";
import { getLocale } from "@/lib/locale-server";
import { hasNonEmptySeoFilters, localizedPageMetadata } from "@/lib/seo";
import { CatalogPage } from "@/components/storefront/catalog-page";

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const [locale, params] = await Promise.all([getLocale(), searchParams]);
  const filterRobots = hasNonEmptySeoFilters(params, ["q", "category", "brand"]) ? { robots: { index: false, follow: true } } : {};
  return locale === "fa"
    ? { title: "همهٔ کالاها | صرفه", description: "جست‌وجو و بررسی کالاهای خوراکی و نیازهای خانه در کاتالوگ صرفه.", ...localizedPageMetadata("/products", locale), ...filterRobots }
    : { title: "هەموو کاڵاکان | صرفه", description: "گەڕان و بینینی کاڵای خۆراکی و پێداویستیی ماڵ لە کاتالۆگی صرفه.", ...localizedPageMetadata("/products", locale), ...filterRobots };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; brand?: string }> }) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  const query = params.q?.trim() ?? "";
  const categorySlug = params.category?.trim() ?? "";
  const brandSlug = params.brand?.trim() ?? "";
  const [catalog, brandResult] = await Promise.all([
    getCatalog({ ...(query ? { query } : {}), ...(categorySlug ? { category: categorySlug } : {}), ...(brandSlug ? { brand: brandSlug } : {}) }),
    getBrands(),
  ]);
  const category = catalog.categories.find((item) => item.slug === categorySlug) ?? null;
  const brand = brandResult.brands.find((item) => item.slug === brandSlug) ?? null;
  return <CatalogPage locale={locale} products={catalog.products} categories={catalog.categories} brands={brandResult.brands} mode={catalog.mode} query={query} category={category} brand={brand} />;
}
