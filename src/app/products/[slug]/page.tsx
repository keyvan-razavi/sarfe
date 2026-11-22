import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/modules/catalog";
import { ProductDetailView } from "@/components/storefront/product-detail";
import { getLocale } from "@/lib/locale-server";
import { currencyMinorUnitExponent, isSupportedCurrency } from "@/lib/currency";
import { getProductionSiteUrl } from "@/lib/site-config";
import { localizedPageMetadata, localizedSeoUrls } from "@/lib/seo";
import { localizeProduct } from "@/components/storefront/messages";
import "@/components/storefront/storefront.css";

function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [{ product, mode }, locale] = await Promise.all([getProductBySlug(slug), getLocale()]);
  if (!product) return locale === "fa" ? { title: "محصول پیدا نشد" } : { title: "بەرهەم نەدۆزرایەوە" };
  const localized = localizeProduct(product, locale, mode === "preview");
  const image = product.images[0] ? [{ url: product.images[0], alt: localized.name }] : undefined;
  return { title: localized.name, description: localized.description, ...localizedPageMetadata(`/products/${encodeURIComponent(product.slug)}`, locale), openGraph: { type: "website", title: localized.name, description: localized.description, images: image } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { product, mode } = await getProductBySlug(slug);
  if (!product) notFound();
  const locale = await getLocale();
  const localized = localizeProduct(product, locale, mode === "preview");
  const siteUrl = getProductionSiteUrl(process.env.APP_URL);
  const url = siteUrl ? localizedSeoUrls(siteUrl, `/products/${encodeURIComponent(product.slug)}`)[locale].canonical : undefined;
  const images = product.images.map((path) => siteUrl ? new URL(path, siteUrl).toString() : undefined).filter((image): image is string => Boolean(image));
  const currencies = new Set(product.variants.map((variant) => variant.currency));
  const offers = mode === "database" && currencies.size === 1
    ? product.variants.flatMap((variant) => {
        if (!isSupportedCurrency(variant.currency) || !Number.isSafeInteger(variant.priceMinor) || variant.priceMinor < 0) return [];
        const exponent = currencyMinorUnitExponent(variant.currency);
        const price = variant.priceMinor / 10 ** exponent;
        return [{
          "@type": "Offer",
          name: variant.name,
          price: price.toFixed(exponent),
          priceCurrency: variant.currency,
          availability: variant.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          ...(url ? { url } : {}),
        }];
      })
    : [];
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: localized.name,
    description: localized.description,
    category: localized.category.name,
    ...(images.length ? { image: images } : {}),
    ...(url ? { url } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand.translations?.[locale]?.name ?? product.brand.name } } : {}),
    ...(product.variants.length === 1 ? { sku: product.variants[0].sku } : {}),
    ...(offers.length ? { offers } : {}),
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }} />
    <ProductDetailView product={product} mode={mode} />
  </>;
}
