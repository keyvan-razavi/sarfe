import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getCatalog } from "@/modules/catalog";
import { getLocale } from "@/lib/locale-server";
import { localizedPageMetadata } from "@/lib/seo";
import { localizeCategory, storefrontText } from "@/components/storefront/messages";
import { StorefrontFooter, StorefrontHeader } from "@/components/storefront/site-shell";
import "@/components/storefront/catalog-page.css";

const categoryImages: Record<string, string> = {
  grocery: "/images/grocery/hero.webp",
  staples: "/images/grocery/rice.webp",
  oils: "/images/grocery/oil.webp",
  pantry: "/images/grocery/paste.webp",
  detergents: "/images/grocery/detergent.webp",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "fa" ? { title: "دسته‌بندی‌ها | صرفه", ...localizedPageMetadata("/categories", locale) } : { title: "پۆلەکان | صرفه", ...localizedPageMetadata("/categories", locale) };
}

export default async function CategoriesPage() {
  const [catalog, locale] = await Promise.all([getCatalog(), getLocale()]);
  const t = storefrontText(locale);
  return <div className="catalog-layout" dir="rtl">
    <StorefrontHeader />
    <main className="catalog-page category-directory">
      <nav className="catalog-breadcrumb" aria-label={locale === "fa" ? "مسیر صفحه" : "ڕێڕەوی پەڕە"}><Link href="/">{locale === "fa" ? "خانه" : "ماڵەوە"}</Link><span aria-hidden="true">/</span><span aria-current="page">{locale === "fa" ? "دسته‌بندی‌ها" : "پۆلەکان"}</span></nav>
      {catalog.mode === "preview" && <p className="catalog-preview">{t.sampleFooter}</p>}
      <header className="catalog-page__heading"><div><h1>{locale === "fa" ? "دسته‌بندی‌های صرفه" : "پۆلەکانی صرفه"}</h1><p>{locale === "fa" ? "از میان کالاهای خوراکی و نیازهای روزمرهٔ خانه انتخاب کنید." : "لە نێوان کاڵای خۆراکی و پێداویستییە ڕۆژانەکانی ماڵدا هەڵبژێرە."}</p></div><span className="catalog-page__count">{catalog.categories.length} {locale === "fa" ? "دسته" : "پۆل"}</span></header>
      <section className="category-directory-grid" aria-label={t.collection}>
        {catalog.categories.map((category, index) => <Link className="category-directory-card" href={`/categories/${category.slug}`} key={category.id}>
          <span className="category-directory-photo">{categoryImages[category.slug] ? <Image unoptimized src={categoryImages[category.slug]} alt="" fill loading={index === 0 ? "eager" : "lazy"} sizes="(max-width: 640px) 88vw, (max-width: 1000px) 45vw, 30vw" /> : <span aria-hidden="true">{category.name.slice(0, 1)}</span>}</span>
          <span className="category-directory-label"><span><strong>{localizeCategory(category.slug, category.name, locale, catalog.mode === "preview", category.translations)}</strong><small>{catalog.products.filter((product) => product.category.slug === category.slug).length} {locale === "fa" ? "کالا" : "کاڵا"}</small></span><span aria-hidden="true">↗</span></span>
        </Link>)}
      </section>
      <p className="catalog-image-credit">{locale === "fa" ? "تصاویر کالاها را از پنل مدیریت جایگزین کنید." : "وێنەی کاڵاکان لە داشبۆردی بەڕێوەبەری بگۆڕە."}</p>
    </main>
    <StorefrontFooter />
  </div>;
}
