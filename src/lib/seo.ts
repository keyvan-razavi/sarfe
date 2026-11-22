import type { Locale } from "@/lib/i18n";
import { getIndexableSiteUrl } from "@/lib/site-config";
import type { Metadata } from "next";

export type LocalizedSeoUrls = {
  canonical: string;
  languages: Record<string, string>;
};

export function hasNonEmptySeoFilters(
  params: Record<string, string | string[] | undefined>,
  filterKeys: readonly string[],
): boolean {
  return filterKeys.some((key) => {
    const value = params[key];
    return Array.isArray(value) ? value.some((item) => item.trim() !== "") : typeof value === "string" && value.trim() !== "";
  });
}

/** Build stable, locale-specific SEO URLs. Filter/search params are intentionally excluded. */
export function localizedSeoUrls(siteOrigin: URL, pathname: string): Record<Locale, LocalizedSeoUrls> {
  const safePath = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/";
  const urlFor = (locale: Locale) => {
    const url = new URL(safePath, siteOrigin);
    url.searchParams.set("lang", locale);
    return url.toString();
  };
  const fa = urlFor("fa");
  const ckb = urlFor("ckb");
  const languages = { fa, ckb, "x-default": fa };
  return {
    fa: { canonical: fa, languages },
    ckb: { canonical: ckb, languages },
  };
}

/** Add canonical and hreflang metadata only for the explicitly indexable production origin. */
export function localizedPageMetadata(pathname: string, locale: Locale): Pick<Metadata, "alternates"> {
  const origin = getIndexableSiteUrl({
    appUrl: process.env.APP_URL,
    indexable: process.env.STORE_INDEXABLE,
    nodeEnv: process.env.NODE_ENV,
  });
  if (!origin) return {};
  const urls = localizedSeoUrls(origin, pathname)[locale];
  return { alternates: { canonical: urls.canonical, languages: urls.languages } };
}
