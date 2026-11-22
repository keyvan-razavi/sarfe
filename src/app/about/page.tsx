import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getLocale } from "@/lib/locale-server";
import { localizedPageMetadata } from "@/lib/seo";
import { StorefrontFooter, StorefrontHeader } from "@/components/storefront/site-shell";
import "@/components/storefront/premium-storefront.css";

const copy = {
  fa: { title: "دربارهٔ صرفه", lead: "خرید روزمره، با انتخاب روشن‌تر.", body: "صرفه برای ساده‌تر کردن پیدا کردن کالاهای معمول خانه ساخته شده است. دسته‌بندی روشن و جزئیات هر محصول کمک می‌کند پیش از انتخاب، بسته‌بندی و گزینه‌های موجود را ببینید.", note: "این نسخه برای نمایش کاتالوگ ساخته شده است. نام‌ها، قیمت‌ها، موجودی و عکس‌های عمومی نمونه‌اند و تا زمان ورود اطلاعات واقعی از پنل مدیریت، برای خرید واقعی استفاده نمی‌شوند.", shop: "دیدن کالاها", admin: "ورود به مدیریت" },
  ckb: { title: "دەربارەی صرفه", lead: "کڕینی ڕۆژانە، بە هەڵبژاردنی ڕوونتر.", body: "صرفه بۆ ئاسانکردنی دۆزینەوەی پێداویستییە ئاساییەکانی ماڵ دروست کراوە. پۆلێنکردنی ڕوون و وردەکاریی کاڵاکان یارمەتیت دەدەن پێش هەڵبژاردن، پاکێج و بژاردە بەردەستەکان ببینیت.", note: "ئەم وەشانە بۆ پیشاندانی کاتالۆگ دروست کراوە. ناو، نرخ، کۆگا و وێنە گشتییەکان نموونەن و تا زانیاریی ڕاستەقینە لە بەڕێوەبەرایەتی تۆمار نەکرێت، بۆ کڕینی ڕاستەقینە بەکارناهێنرێن.", shop: "بینینی کاڵاکان", admin: "چوونە بەڕێوەبەرایەتی" },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "fa" ? "دربارهٔ صرفه" : "دەربارەی صرفه", ...localizedPageMetadata("/about", locale) };
}

export default async function AboutPage() {
  const locale = await getLocale();
  const t = copy[locale];
  return <main className="premium-home">
    <StorefrontHeader />
    <article className="about-page-content">
      <div className="about-page-copy"><h1>{t.title}</h1><h2>{t.lead}</h2><p>{t.body}</p><p className="about-page-note">{t.note}</p><div className="about-page-actions"><Link href="/products">{t.shop}</Link><Link href="/admin">{t.admin}</Link></div></div>
      <figure className="about-page-photo"><Image src="/images/grocery/rice.webp" alt={locale === "fa" ? "دانه‌های برنج سفید روی سطح چوبی" : "دانەکانی برنجی سپی لەسەر ڕووی دارین"} fill sizes="(max-width: 700px) 100vw, 45vw" /><figcaption>{locale === "fa" ? "تصویر نمونهٔ برنج" : "وێنەی نموونەیی برنج"}</figcaption></figure>
    </article>
    <StorefrontFooter />
  </main>;
}
