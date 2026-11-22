import type { Metadata } from "next";
import { getCatalog } from "@/modules/catalog";
import { LandingPage } from "@/components/storefront/landing-page";
import { getLocale } from "@/lib/locale-server";
import { localizedPageMetadata } from "@/lib/seo";
import { getHomePageContent } from "@/modules/home-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "fa"
    ? { title: "صرفه؛ خوراک، تندرستی و فرهنگ", description: "خواندنی نکته‌های کاربردی سلامت و فرهنگ خوراک، همراه با کاتالوگ مواد غذایی روزمرهٔ صرفه.", ...localizedPageMetadata("/", locale) }
    : { title: "صرفه؛ خۆراک، تەندروستی و کەلتوور", description: "خوێندنەوەی ئامۆژگاریی تەندروستی و کەلتووری خواردن، لەگەڵ کاتالۆگی خۆراکی ڕۆژانەی صرفه.", ...localizedPageMetadata("/", locale) };
}

export default async function HomePage() {
  const [catalog, locale, homeContent] = await Promise.all([getCatalog(), getLocale(), getHomePageContent()]);
  return <LandingPage locale={locale} categories={catalog.categories} products={catalog.products} mode={catalog.mode} content={homeContent.content[locale]} />;
}
