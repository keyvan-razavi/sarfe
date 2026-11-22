import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LocaleProvider } from "@/components/locale-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getLocale } from "@/lib/locale-server";
import { localeMeta } from "@/lib/i18n";
import { getIndexableSiteUrl, getProductionSiteUrl } from "@/lib/site-config";
import type { ThemePreference } from "@/components/theme-provider";
import "./globals.css";

function isThemePreference(value: string | undefined): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

const localizedMetadata = {
  fa: {
    title: "صرفه — پروژهٔ خوراک و تندرستی با فروشگاه روزمره",
    description:
      "پروژه‌ای دربارهٔ خوراک و تندرستی، همراه با فروشگاهی برای تهیهٔ خواربار و نیازهای روزانهٔ خانه.",
  },
  ckb: {
    title: "صرفه — پڕۆژەی خۆراک و تەندروستی بە فرۆشگای ڕۆژانە",
    description:
      "پڕۆژەیەک دەربارەی خۆراک و تەندروستی، لەگەڵ فرۆشگایەک بۆ پێداویستیی ڕۆژانەی ماڵ.",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = localizedMetadata[locale];
  return {
    metadataBase: getProductionSiteUrl(process.env.APP_URL) ?? undefined,
    title: { default: copy.title, template: `%s | صرفه` },
    description: copy.description,
    robots: getIndexableSiteUrl({ appUrl: process.env.APP_URL, indexable: process.env.STORE_INDEXABLE, nodeEnv: process.env.NODE_ENV })
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title: copy.title,
      description: copy.description,
      locale: locale === "fa" ? "fa_IR" : "ckb_IQ",
      siteName: "صرفه",
      type: "website",
      images: [{ url: "/images/brand/grocery-collection.jpg", width: 1248, height: 1248, alt: "صرفه؛ خوراک و تندرستی" }],
    },
    twitter: { card: "summary_large_image", images: ["/images/brand/grocery-collection.jpg"] },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("sarfe-theme")?.value;
  const initialTheme = isThemePreference(themeCookie) ? themeCookie : "system";
  return (
    <html lang={localeMeta[locale].htmlLang} dir="rtl" data-theme={initialTheme}>
      <body>
        <LocaleProvider initialLocale={locale}>
          <ThemeProvider
            initialPreference={initialTheme}
            hasPersistedPreference={isThemePreference(themeCookie)}
          >
            <div className="site-frame">{children}</div>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
