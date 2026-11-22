"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { formatStoreMoney } from "@/lib/store-money";
import { useCart } from "@/modules/cart";
import { useLocale } from "@/components/locale-provider";
import { localizeCartName, localizeVariantName, storefrontText } from "./messages";
import { StorefrontFooter, StorefrontHeader } from "./site-shell";

export function CartView() {
  const cart = useCart();
  const { locale } = useLocale();
  const t = storefrontText(locale);
  const intlLocale = locale === "fa" ? "fa-IR" : "ckb-IQ";
  if (!cart.ready) return <main className="cart-page"><div className="cart-loading" aria-live="polite">{t.yourBag}…</div></main>;

  return <main className="cart-page">
    <StorefrontHeader />
    <div className="cart-content">
      <Link className="back-link" href="/products"><ArrowLeft className="directional-icon" size={16} /> {t.continue}</Link>
      <div className="cart-title-row"><div><p className="detail-category">{t.selected}</p><h1>{t.yourBag}<span>.</span></h1></div><span className="cart-total-count">{cart.count} {t.item}</span></div>
      {cart.lines.length === 0 ? <section className="cart-empty"><div className="empty-bag" aria-hidden="true">S</div><h2>{t.emptyTitle}</h2><p>{t.emptyBody}</p><Link className="cart-shop-link" href="/products">{t.explore}</Link></section> : <div className="cart-layout">
        <section className="cart-lines" aria-label="Items in your bag">
          {cart.lines.map((line) => {
            const name = localizeCartName(line, locale);
            const variantName = line.isPreview ? localizeVariantName(line.variantName, locale) : line.variantName;
            return <article className="cart-line" key={line.variantId}>
            <Link className="cart-line-image" href={`/products/${line.slug}`}>
              {line.image ? <Image unoptimized src={line.image} alt={`${t.sample}: ${name}`} fill sizes="120px" /> : <span aria-hidden="true">S</span>}
            </Link>
            <div className="cart-line-info"><Link className="cart-line-name" href={`/products/${line.slug}`}>{name}</Link><p>{variantName}</p><span>{formatStoreMoney(line.unitPriceMinor, line.currency, intlLocale)} {t.each}</span></div>
            <div className="quantity-control" aria-label={`${t.item}: ${name}`}>
              <Button variant="ghost" aria-label={`${t.decrease}: ${name}`} disabled={line.quantity <= 1} onClick={() => cart.setQuantity(line.variantId, line.quantity - 1)}><Minus size={15} /></Button>
              <span aria-live="polite">{line.quantity}</span>
              <Button variant="ghost" aria-label={`${t.increase}: ${name}`} disabled={line.quantity >= line.maxStock} onClick={() => cart.setQuantity(line.variantId, line.quantity + 1)}><Plus size={15} /></Button>
            </div>
            <strong className="cart-line-total">{formatStoreMoney(line.unitPriceMinor * line.quantity, line.currency, intlLocale)}</strong>
            <Button variant="ghost" className="remove-line" aria-label={`${t.remove}: ${name}`} onClick={() => cart.remove(line.variantId)}><Trash2 size={17} /></Button>
          </article>;
          })}
        </section>
        <aside className="cart-summary"><h2>{t.selected}</h2><div className="summary-row"><span>{t.subtotal}</span><strong>{formatStoreMoney(cart.subtotalMinor, cart.currency, intlLocale)}</strong></div><p>{t.shipping}</p><Link className="ui-button ui-button--primary ui-button--md checkout-placeholder" href="/checkout">{locale === "fa" ? "ادامه به ثبت سفارش" : "بەردەوامبوون بۆ تۆمارکردنی داواکاری"}</Link><p className="checkout-note">{locale === "fa" ? "قیمت و موجودی هنگام ثبت سفارش از پایگاه داده بررسی می‌شود. پرداخت آنلاین هنوز فعال نیست." : "نرخ و کۆگا لە کاتی تۆمارکردنی داواکاری لە بنکەدراوە دە پشکنرێن. پارەدانی ئۆنلاین هێشتا چالاک نییە."}</p></aside>
      </div>}
      {cart.lines.some((line) => line.isPreview) && <p className="cart-preview-note">{t.savedSample}</p>}
    </div>
    <StorefrontFooter />
  </main>;
}
