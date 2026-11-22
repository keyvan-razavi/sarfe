import type { MetadataRoute } from "next";
import { getIndexableSiteUrl } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getIndexableSiteUrl({
    appUrl: process.env.APP_URL,
    indexable: process.env.STORE_INDEXABLE,
    nodeEnv: process.env.NODE_ENV,
  });

  return {
    rules: {
      userAgent: "*",
      // Only an explicitly enabled production origin is crawlable. Staging and
      // unconfigured environments stay closed to crawlers by default.
      allow: siteUrl ? "/" : undefined,
      disallow: siteUrl
        ? ["/admin", "/api", "/cart", "/account", "/checkout"]
        : ["/", "/admin", "/api", "/cart", "/account", "/checkout"],
    },
    ...(siteUrl ? { sitemap: new URL("/sitemap.xml", siteUrl).toString() } : {}),
  };
}
