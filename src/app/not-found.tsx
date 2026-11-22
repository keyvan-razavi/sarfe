import Link from "next/link";
import { storefrontText } from "@/components/storefront/messages";
import { BrandLogo } from "@/components/brand-logo";
import { getLocale } from "@/lib/locale-server";
import "@/components/storefront/storefront.css";

export default async function NotFound() {
  const locale = await getLocale();
  const t = storefrontText(locale);
  return (
    <main className="not-found-page">
      <Link className="not-found-mark" href="/"><BrandLogo /></Link>
      <h1>{t.notFoundTitle}</h1>
      <p>{t.notFoundBody}</p>
      <Link className="cart-shop-link" href="/">
        {t.seeAll}
      </Link>
    </main>
  );
}
