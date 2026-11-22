"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import type { ProductDetail as Product } from "@/modules/catalog";
import { useCart } from "@/modules/cart";
import { formatStoreMoney } from "@/lib/store-money";
import { Button, Select } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";
import { StorefrontFooter, StorefrontHeader } from "./site-shell";
import { attributeLabel, localizeCartError, localizeAttributeValue, localizeCategory, localizeProduct, localizeVariantName, storefrontText } from "./messages";

const localProductImages: Record<string, string> = {
  "berenj-basmati": "/images/grocery/rice.webp",
  "roghan-aftabgardan": "/images/grocery/oil.webp",
  "rob-goje": "/images/grocery/paste.webp",
  "adas-khoraki": "/images/grocery/staples.webp",
  "shooyande-lebas": "/images/grocery/detergent.webp",
};

export function ProductDetailView({ product, mode }: { product: Product; mode: "database" | "preview" }) {
  const cart = useCart();
  const { locale } = useLocale();
  const t = storefrontText(locale);
  const localizedProduct = localizeProduct(product, locale);
  const image = product.image ?? localProductImages[product.slug] ?? null;
  const [selectedId, setSelectedId] = useState(product.variants.find((item) => item.stock > 0)?.id ?? product.variants[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const variant = useMemo(() => product.variants.find((item) => item.id === selectedId) ?? product.variants[0], [product.variants, selectedId]);
  const selectable = product.variants.filter((item) => item.stock > 0);
  const inStock = Boolean(variant && variant.stock > 0);
  const attributes = variant ? Object.entries(variant.attributes) : [];
  const intlLocale = locale === "fa" ? "fa-IR" : "ckb-IQ";

  return <main className="product-page">
    <StorefrontHeader />
    {mode === "preview" && <div className="preview-note"><span>{t.preview}</span><span>{t.sample}</span></div>}
    <div className="product-breadcrumb"><Link href="/products">{t.breadcrumb}</Link><span>/</span><Link href={`/categories/${encodeURIComponent(product.category.slug)}`}>{localizeCategory(product.category.slug, product.category.name, locale, mode === "preview", product.category.translations)}</Link><span>/</span><span>{localizedProduct.name}</span></div>
    <section className="product-detail-layout">
      <div className="detail-image">
        {image ? <Image unoptimized src={image} alt={`${t.sample}: ${localizedProduct.name}`} fill priority sizes="(max-width: 800px) 100vw, 56vw" /> : <div className="detail-placeholder" />}
        {mode === "preview" && <span className="photo-credit">{t.sample}</span>}
      </div>
      <div className="detail-copy">
        <Link className="back-link" href="/products"><ArrowLeft className="directional-icon" size={16} /> {t.back}</Link>
        <p className="detail-category">{localizeCategory(product.category.slug, product.category.name, locale, mode === "preview", product.category.translations)}</p>
        <h1>{localizedProduct.name}</h1>
        <p className="detail-description">{localizedProduct.description}</p>
        <p className="detail-price">{formatStoreMoney(variant?.priceMinor ?? product.priceMinor, variant?.currency ?? product.currency, intlLocale)}</p>
        {attributes.length > 0 && <dl className="variant-attributes">{attributes.map(([key, value]) => <div key={key}><dt>{attributeLabel(key, locale)}</dt><dd>{localizeAttributeValue(key, value, locale)}</dd></div>)}</dl>}
        <label className="variant-field" htmlFor="variant">{t.choose}</label>
        <Select id="variant" value={variant?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)} disabled={!product.variants.length}>
          {product.variants.map((item) => <option key={item.id} value={item.id} disabled={item.stock <= 0}>{localizeVariantName(item.name, locale)}{item.stock <= 0 ? ` · ${t.unavailable}` : ""}</option>)}
        </Select>
        <div className={`stock-line${inStock ? " is-available" : " is-unavailable"}`}><span className="stock-dot" />{inStock ? `${variant?.stock} ${t.available}` : t.notAvailable}</div>
        <Button size="lg" className="detail-add" disabled={!inStock} onClick={() => {
          if (!variant) return;
          const error = cart.add({ productId: product.id, slug: product.slug, name: localizedProduct.name, translations: product.translations, variantId: variant.id, variantName: localizeVariantName(variant.name, locale), image, isPreview: mode === "preview", unitPriceMinor: variant.priceMinor, currency: variant.currency, maxStock: variant.stock, quantity: 1 });
          setMessage(localizeCartError(error, locale) ?? `${localizedProduct.name}، ${localizeVariantName(variant.name, locale)}، ${t.addSuccess}`);
        }}><ShoppingBag size={18} /> {t.add}</Button>
        <p className="detail-status" role="status">{message && <><Check size={16} /> {message} <Link href="/cart">{t.viewBag}</Link></>}</p>
        <div className="product-note"><span>{t.less}</span><p>{mode === "preview" ? t.sampleProduct : ""}</p></div>
        {selectable.length === 0 && <p className="out-of-stock-note">{t.noOptions}</p>}
      </div>
    </section>
    <StorefrontFooter />
  </main>;
}
