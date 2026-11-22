"use client";

import Link from "next/link";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLocale } from "@/components/locale-provider";
import { useCart } from "@/modules/cart";
import { Button } from "@/components/ui";
import "./premium-storefront.css";

const labels = {
  fa: { home: "خانه", catalog: "همهٔ کالاها", categories: "دسته‌بندی‌ها", about: "دربارهٔ صرفه", blog: "خواندنی‌ها", account: "حساب کاربری", bag: "سبد خرید", menu: "باز کردن فهرست", close: "بستن فهرست", admin: "ورود مدیر", note: "کاتالوگ نمونه؛ تصاویر و کالاها برای نمایش هستند." },
  ckb: { home: "سەرەتا", catalog: "هەموو کاڵاکان", categories: "پۆلەکان", about: "دەربارەی صرفه", blog: "خوێندنەوەکان", account: "هەژماری بەکارهێنەر", bag: "سەبەتە", menu: "کردنەوەی پێڕست", close: "داخستنی پێڕست", admin: "چوونەژوورەوەی بەڕێوەبەر", note: "کاتالۆگی نموونە؛ وێنە و کاڵاکان بۆ پیشاندانن." },
} as const;

export function StorefrontHeader() {
  const { locale } = useLocale();
  const t = labels[locale];
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const links = [["/", t.home], ["/products", t.catalog], ["/categories", t.categories], ["/about", t.about], ["/blog", t.blog], ["/account", t.account]] as const;

  return <>
    <header className="site-header">
      <Link className="site-brand" href="/" aria-label={t.home}><BrandLogo priority /></Link>
      <nav id="site-navigation" className={`site-nav${open ? " is-open" : ""}`} aria-label={t.catalog}>
        {links.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
        <Link className="site-nav-cart" href="/cart" onClick={() => setOpen(false)}><ShoppingBag size={18} aria-hidden="true" />{t.bag}<span>{cart.count}</span></Link>
      </nav>
      <div className="site-tools"><LanguageToggle /><ThemeToggle /><Link className="site-cart" href="/cart" aria-label={`${t.bag}، ${cart.count}`}><ShoppingBag size={20} aria-hidden="true" /><span>{cart.count}</span></Link><Button className="site-menu" variant="ghost" aria-label={open ? t.close : t.menu} aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen((value) => !value)}>{open ? <X size={21} /> : <Menu size={21} />}</Button></div>
    </header>
  </>;
}

export function StorefrontFooter() {
  const { locale } = useLocale();
  const t = labels[locale];
  const cart = useCart();
  return <footer className="site-footer">
    <div className="site-footer-brand"><Link href="/" aria-label={t.home}><BrandLogo /></Link><p>{t.note}</p></div>
    <nav aria-label={t.catalog} className="site-footer-links"><Link href="/products">{t.catalog}</Link><Link href="/categories">{t.categories}</Link><Link href="/about">{t.about}</Link><Link href="/blog">{t.blog}</Link><Link href="/account">{t.account}</Link><Link href="/cart">{t.bag} ({cart.count})</Link><Link href="/admin">{t.admin}</Link></nav>
    <small>صرفه · ۱۴۰۵</small>
  </footer>;
}
