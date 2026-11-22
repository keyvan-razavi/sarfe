import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { formatDate, formatPrice } from "@/lib/format";
import { localizeProduct } from "@/components/storefront/messages";
import type { ProductSummary } from "@/modules/catalog";
import type { BlogBlock, BlogPost } from "@/modules/blog/types";
import { InlineText } from "@/modules/blog/inline";

const copy = {
  fa: { read: "دقیقه زمان مطالعه", related: "کالای مرتبط", product: "دیدن کالا", image: "تصویر مقاله", relatedPosts: "مطالب مرتبط", relatedProducts: "کالاهای مرتبط", readPost: "خواندن مطلب" },
  ckb: { read: "خولەک بۆ خوێندنەوە", related: "کاڵای پەیوەندیدار", product: "بینینی کاڵا", image: "وێنەی بابەت", relatedPosts: "بابەتە پەیوەندیدارەکان", relatedProducts: "کاڵا پەیوەندیدارەکان", readPost: "خوێندنەوەی بابەت" },
} as const;

export function ArticleContent({ blocks, locale, products = [] }: { blocks: BlogBlock[]; locale: Locale; products?: ProductSummary[] }) {
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  return <div className="blog-article-body">
    {blocks.map((block) => {
      if (block.type === "paragraph") return <p key={block.id}><InlineText text={block.text} /></p>;
      if (block.type === "heading") return block.level === 3
        ? <h3 key={block.id}><InlineText text={block.text} /></h3>
        : <h2 key={block.id}><InlineText text={block.text} /></h2>;
      if (block.type === "quote") return <blockquote key={block.id}><InlineText text={block.text} /></blockquote>;
      if (block.type === "bulletList" || block.type === "orderedList") {
        const List = block.type === "bulletList" ? "ul" : "ol";
        const items = block.text.split("\n").map((item) => item.trim()).filter(Boolean);
        return <List key={block.id}>{items.map((item, index) => <li key={`${block.id}-${index}`}><InlineText text={item.replace(/^(?:[-*•]|\d+[.)])\s+/, "")} /></li>)}</List>;
      }
      if (block.type === "image" && block.url?.startsWith("/")) return <figure key={block.id} className="blog-article-image"><span className="blog-article-image-media"><Image src={block.url} alt={block.alt || copy[locale].image} fill sizes="(max-width: 760px) 100vw, 760px" unoptimized /></span>{block.caption && <figcaption><InlineText text={block.caption} /></figcaption>}</figure>;
      if (block.type === "product" && block.productSlug) {
        const product = bySlug.get(block.productSlug);
        if (!product) return null;
        const localized = localizeProduct(product, locale, false);
        return <aside key={block.id} className="blog-related-product" aria-label={copy[locale].related}>
          {localized.image && <Link href={`/products/${encodeURIComponent(localized.slug)}`} className="blog-related-image" tabIndex={-1} aria-hidden="true"><Image src={localized.image} alt="" fill sizes="120px" unoptimized /></Link>}
          <div><p>{copy[locale].related}</p><h3>{localized.name}</h3><span>{formatPrice(localized.priceMinor, localized.currency, locale === "fa" ? "fa-IR" : "ckb-IQ")}</span></div>
          <Link className="blog-related-link" href={`/products/${encodeURIComponent(localized.slug)}`}>{copy[locale].product}</Link>
        </aside>;
      }
      return null;
    })}
  </div>;
}

export function RelatedBlogPosts({ posts, locale }: { posts: BlogPost[]; locale: Locale }) {
  if (!posts.length) return null;
  return <section className="blog-related-posts" aria-labelledby="blog-related-posts-title">
    <h2 id="blog-related-posts-title">{copy[locale].relatedPosts}</h2>
    <div className="blog-related-post-list">{posts.map((post) => {
      const content = post.translations[locale] ?? post.translations.fa;
      return <article className="blog-related-post" key={post.slug}>
        <h3><Link href={`/blog/${encodeURIComponent(post.slug)}`}>{content.title}</Link></h3>
        <p>{content.excerpt}</p>
        <Link className="blog-read-link" href={`/blog/${encodeURIComponent(post.slug)}`}>{copy[locale].readPost}<span aria-hidden="true">↗</span></Link>
      </article>;
    })}</div>
  </section>;
}

export function RelatedProducts({ products, locale }: { products: ProductSummary[]; locale: Locale }) {
  if (!products.length) return null;
  return <section className="blog-related-products" aria-labelledby="blog-related-products-title">
    <h2 id="blog-related-products-title">{copy[locale].relatedProducts}</h2>
    <div className="blog-related-product-list">{products.map((product) => {
      const localized = localizeProduct(product, locale, false);
      return <Link key={product.id} className="blog-related-product-card" href={`/products/${encodeURIComponent(localized.slug)}`}>
        {localized.image ? <span className="blog-related-product-card__image"><Image src={localized.image} alt="" fill sizes="(max-width: 700px) 40vw, 240px" unoptimized /></span> : null}
        <span className="blog-related-product-card__copy"><strong>{localized.name}</strong><span>{formatPrice(localized.priceMinor, localized.currency, locale === "fa" ? "fa-IR" : "ckb-IQ")}</span></span>
      </Link>;
    })}</div>
  </section>;
}

export function ArticleReadingTime({ blocks, locale }: { blocks: BlogBlock[]; locale: Locale }) {
  const words = blocks.map((block) => block.text).join(" ").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  const label = locale === "fa" ? copy.fa.read : copy.ckb.read;
  return <span>{new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "ckb-IQ").format(minutes)} {label}</span>;
}

export function ArticleDate({ date, locale }: { date: string; locale: Locale }) {
  return <time dateTime={date}>{formatDate(date, locale === "fa" ? "fa-IR" : "ckb-IQ")}</time>;
}
