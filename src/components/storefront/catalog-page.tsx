import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import type { BrandSummary, CategorySummary, ProductSummary } from "@/modules/catalog";
import type { Locale } from "@/lib/i18n";
import { formatStoreMoney } from "@/lib/store-money";
import { localizeCategory, localizeProduct, storefrontText } from "./messages";
import { Button, Input } from "@/components/ui";
import { StorefrontFooter, StorefrontHeader } from "./site-shell";
import "./catalog-page.css";

type Props = {
  locale: Locale;
  products: ProductSummary[];
  categories: CategorySummary[];
  brands: BrandSummary[];
  mode: "database" | "preview";
  query?: string;
  category?: CategorySummary | null;
  brand?: BrandSummary | null;
};

const temporaryImages: Record<string, string> = {
  "berenj-basmati": "/images/grocery/rice.webp",
  "roghan-aftabgardan": "/images/grocery/oil.webp",
  "rob-goje": "/images/grocery/paste.webp",
  "adas-khoraki": "/images/grocery/staples.webp",
  "shooyande-lebas": "/images/grocery/detergent.webp",
};

function temporaryImage(product: ProductSummary, mode: Props["mode"]) {
  if (mode === "preview") return temporaryImages[product.slug] ?? product.image;
  return product.image ?? temporaryImages[product.slug];
}

export function CatalogProductGrid({ products, locale, mode }: Pick<Props, "products" | "locale" | "mode">) {
  const intlLocale = locale === "fa" ? "fa-IR" : "ckb-IQ";
  return <div className="catalog-specimens">
    {products.map((raw, index) => {
      const product = localizeProduct(raw, locale, mode === "preview");
      const image = temporaryImage(raw, mode);
      const variant = product.variants.find((item) => item.stock > 0) ?? product.variants[0];
      const palette = ["rice", "leaf", "mist", "gold"][index % 4];
      return <article className={`catalog-specimen catalog-specimen--${palette}`} key={product.id}>
        <Link className="catalog-specimen__photo" href={`/products/${product.slug}`} aria-label={`${product.name} — ${locale === "fa" ? "جزئیات کالا" : "وردەکاریی کاڵا"}`}>
          {image ? <Image src={image} alt={product.name} fill unoptimized sizes="(max-width: 640px) 48vw, (max-width: 1000px) 31vw, 23vw" /> : <span aria-hidden="true">{product.name.slice(0, 1)}</span>}
        </Link>
        <div className="catalog-specimen__caption">
          <div><Link href={`/products/${product.slug}`} className="catalog-specimen__name">{product.name}</Link><p>{localizeCategory(product.category.slug, product.category.name, locale, mode === "preview", product.category.translations)}</p>{product.brand ? <Link className="catalog-specimen__brand" href={`/products?brand=${encodeURIComponent(product.brand.slug)}`}>{product.brand.translations?.[locale]?.name ?? product.brand.name}</Link> : null}</div>
          <span className="catalog-specimen__price">{formatStoreMoney(variant?.priceMinor ?? product.priceMinor, variant?.currency ?? product.currency, intlLocale)}</span>
        </div>
        <Link className="catalog-specimen__open" href={`/products/${product.slug}`}>
          {locale === "fa" ? "مشاهدهٔ کالا" : "بینینی کاڵا"}
          <ArrowRight className="directional-icon" size={16} aria-hidden="true" />
        </Link>
      </article>;
    })}
  </div>;
}

export function CatalogPage({ locale, products, categories, brands, mode, query = "", category = null, brand = null }: Props) {
  const t = storefrontText(locale);
  const title = category
    ? localizeCategory(category.slug, category.name, locale, mode === "preview", category.translations)
    : locale === "fa" ? "کالاهای روزمرهٔ خانه" : "کاڵای ڕۆژانەی ماڵ";
  const copy = category?.translations?.[locale]?.description ?? category?.description ?? (locale === "fa"
    ? "کالاهای ضروری خانه را با مشخصات و بسته‌بندی روشن بررسی کنید."
    : "کاڵا پێویستەکانی ماڵ بە زانیاری و پاکێجی ڕوون ببینە.");
  const brandName = brand?.translations?.[locale]?.name ?? brand?.name ?? "";
  const filterBase = category ? `/categories/${category.slug}` : "/products";
  const brandHref = (slug?: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (slug) params.set("brand", slug);
    const suffix = params.toString();
    return `${filterBase}${suffix ? `?${suffix}` : ""}`;
  };
  return <div className="catalog-layout" dir="rtl">
    <StorefrontHeader />
    <main className="catalog-page">
    <div className="catalog-page__intro">
      <nav className="catalog-breadcrumb" aria-label={locale === "fa" ? "مسیر صفحه" : "ڕێڕەوی پەڕە"}>
        <Link href="/">{locale === "fa" ? "خانه" : "ماڵەوە"}</Link><span aria-hidden="true">/</span>
        <Link href="/products">{t.collection}</Link>{category && <><span aria-hidden="true">/</span><span aria-current="page">{title}</span></>}
      </nav>
      {mode === "preview" && <p className="catalog-preview">{t.sampleFooter}</p>}
      <div className="catalog-page__heading"><div><h1>{title}</h1><p>{copy}</p></div><span className="catalog-page__count">{products.length} {locale === "fa" ? "کالا" : "کاڵا"}</span></div>
      <form className="catalog-search" action="/products" method="get">
        <label htmlFor="catalog-query"><Search size={18} aria-hidden="true" /><span className="sr-only">{t.search}</span>
          <Input id="catalog-query" type="search" name="q" placeholder={t.search} defaultValue={query} />
        </label>
        {category && <input type="hidden" name="category" value={category.slug} />}
        {brand && <input type="hidden" name="brand" value={brand.slug} />}
        <Button type="submit" variant="primary">{t.searchButton}</Button>
      </form>
    </div>
    <nav className="catalog-categories" aria-label={t.collection}>
      <Link className={!category ? "is-selected" : ""} href={`/products${query || brand ? `?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(brand ? { brand: brand.slug } : {}) }).toString()}` : ""}`}>{t.all}</Link>
      {categories.map((item) => { const params = new URLSearchParams({ ...(query ? { q: query } : {}), ...(brand ? { brand: brand.slug } : {}) }); const suffix = params.toString(); return <Link className={category?.slug === item.slug ? "is-selected" : ""} key={item.id} href={`/categories/${item.slug}${suffix ? `?${suffix}` : ""}`} aria-current={category?.slug === item.slug ? "page" : undefined}>{localizeCategory(item.slug, item.name, locale, mode === "preview", item.translations)}</Link>; })}
    </nav>
    {brands.length ? <nav className="catalog-brands" aria-label={t.brands}>
      <span className="catalog-brands__label">{t.brands}</span>
      <Link className={!brand ? "is-selected" : ""} href={brandHref()} aria-current={!brand ? "page" : undefined}>{t.allBrands}</Link>
      {brands.map((item) => <Link className={brand?.slug === item.slug ? "is-selected" : ""} href={brandHref(item.slug)} key={item.id} aria-current={brand?.slug === item.slug ? "page" : undefined}>{item.translations?.[locale]?.name ?? item.name}</Link>)}
    </nav> : null}
    {brand ? <p className="catalog-active-brand">{t.brands}: <strong>{brandName}</strong></p> : null}
    {products.length ? <CatalogProductGrid products={products} locale={locale} mode={mode} /> : <section className="catalog-empty"><h2>{t.nothing}</h2><p>{t.tryAgain}</p><Link href="/products">{t.seeAll}</Link></section>}
    </main>
    <StorefrontFooter />
  </div>;
}
