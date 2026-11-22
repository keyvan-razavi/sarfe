import Image from "next/image";
import Link from "next/link";
import type { CategorySummary, ProductSummary } from "@/modules/catalog";
import { localizeCategory, storefrontText } from "./messages";
import type { Locale } from "@/lib/i18n";
import { StorefrontFooter, StorefrontHeader } from "./site-shell";

type LandingContent = {
  heroTitle: string; heroBody: string; ctaLabel: string; heroImage: string; heroImageAlt: string;
  healthTitle: string; healthBody: string; cultureTitle: string; cultureBody: string;
  aboutTitle: string; aboutBody: string; aboutImage: string; aboutImageAlt: string;
};
type Props = { locale: Locale; categories: CategorySummary[]; products: ProductSummary[]; mode: "database" | "preview"; content: LandingContent };

const copy = {
  fa: {
    healthLink: "خواندن مطالب سلامت", cultureLink: "خواندن دربارهٔ خوراک", storeTitle: "فروشگاه صرفه",
    storeBody: "برای مواد غذایی و نیازهای روزمرهٔ خانه، از کاتالوگ شروع کنید.", browseCategories: "دیدن دسته‌ها",
    featured: "از کاتالوگ", products: "کالاهای منتخب", seeAll: "دیدن همهٔ کالاها", noProducts: "کالای منتخب برای نمایش وجود ندارد.",
    noCategories: "دسته‌ای برای نمایش وجود ندارد.", approach: "دربارهٔ صرفه", productImage: "تصویر کالا",
  },
  ckb: {
    healthLink: "خوێندنەوەی بابەتی تەندروستی", cultureLink: "خوێندنەوەی دەربارەی خواردن", storeTitle: "فرۆشگای صرفه",
    storeBody: "بۆ کڕینی خۆراک و پێداویستییە ڕۆژانەکانی ماڵ، لە کاتالۆگ دەست پێ بکە.", browseCategories: "بینینی پۆلەکان",
    featured: "لە کاتالۆگ", products: "کاڵاکانی هەڵبژێردراو", seeAll: "بینینی هەموو کاڵاکان", noProducts: "هیچ کاڵایەکی هەڵبژێردراو نییە.",
    noCategories: "هیچ پۆلێک بۆ پیشاندان نییە.", approach: "دەربارەی صرفه", productImage: "وێنەی کاڵا",
  },
} as const;

function productImage(product: ProductSummary) {
  return product.images.find(Boolean) ?? product.image;
}

export function LandingPage({ locale, categories, products, mode, content }: Props) {
  const t = copy[locale];
  const global = storefrontText(locale);
  const shownCategories = categories.slice(0, 6);
  const featuredProducts = products.filter((item) => item.featured).slice(0, 4);
  return <main className="premium-home">
    <StorefrontHeader />
    {mode === "preview" && <p className="site-preview-note">{global.preview} · {global.sample}</p>}

    <section className="split-stage" aria-label={content.heroTitle}>
      <div className="split-stage-media">
        <div className="split-stage-media-frame">
          <Image src={content.heroImage} alt={content.heroImageAlt} fill sizes="(max-width: 700px) 100vw, 50vw" preload />
        </div>
      </div>
      <div className="split-stage-story">
        <section className="stage-intro" aria-labelledby="landing-title">
          <h1 id="landing-title">{content.heroTitle}</h1>
          <p>{content.heroBody}</p>
          <Link className="landing-action" href="/blog">{content.ctaLabel}<span aria-hidden="true">↗</span></Link>
        </section>
        <section className="stage-article" aria-labelledby="health-title">
          <h2 id="health-title">{content.healthTitle}</h2>
          <p>{content.healthBody}</p>
          <Link href="/blog">{t.healthLink}<span aria-hidden="true">↗</span></Link>
        </section>
        <section className="stage-article" aria-labelledby="culture-title">
          <h2 id="culture-title">{content.cultureTitle}</h2>
          <p>{content.cultureBody}</p>
          <Link href="/blog">{t.cultureLink}<span aria-hidden="true">↗</span></Link>
        </section>
      </div>
    </section>

    <section className="landing-about" aria-labelledby="landing-about-title">
      <div className="landing-about-photo"><Image src={content.aboutImage} alt={content.aboutImageAlt} fill sizes="(max-width: 700px) 100vw, 42vw" /></div>
      <div className="landing-about-copy">
        <h2 id="landing-about-title">{content.aboutTitle}</h2>
        <p>{content.aboutBody}</p>
        <Link href="/about">{t.approach}<span aria-hidden="true">↗</span></Link>
      </div>
    </section>

    <section className="landing-store" aria-labelledby="landing-store-title">
      <div className="store-intro">
        <h2 id="landing-store-title">{t.storeTitle}</h2>
        <p>{t.storeBody}</p>
        <Link className="landing-action" href="/categories">{t.browseCategories}<span aria-hidden="true">↗</span></Link>
      </div>
      <nav className="store-category-list" aria-label={t.browseCategories}>
        {shownCategories.length ? shownCategories.map((category) => <Link key={category.id} href={`/categories/${category.slug}`}>
          {localizeCategory(category.slug, category.name, locale, mode === "preview", category.translations)}<span aria-hidden="true">↗</span>
        </Link>) : <p>{t.noCategories}</p>}
      </nav>
    </section>

    <section className="landing-products" aria-labelledby="landing-products-title">
      <div className="landing-section-head"><div><p>{t.featured}</p><h2 id="landing-products-title">{t.products}</h2></div><Link href="/products">{t.seeAll}<span aria-hidden="true">↗</span></Link></div>
      {featuredProducts.length ? <div className="landing-product-list">{featuredProducts.map((product) => {
        const image = productImage(product);
        return <Link key={product.id} href={`/products/${product.slug}`} className="landing-product">
          {image ? <span className="landing-product-image"><Image src={image} alt={product.translations?.[locale]?.name ?? product.name} fill sizes="(max-width: 700px) 46vw, 22vw" /></span> : null}
          {!image ? <span className="landing-product-no-image">{t.productImage}</span> : null}
          <span className="landing-product-name">{product.translations?.[locale]?.name ?? product.name}</span>
          <span className="landing-product-category">{localizeCategory(product.category.slug, product.category.name, locale, mode === "preview", product.category.translations)}</span>
        </Link>;
      })}</div> : <p className="landing-empty">{t.noProducts}</p>}
    </section>
    <StorefrontFooter />
  </main>;
}
