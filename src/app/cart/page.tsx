import { CartView } from "@/components/storefront/cart-view";
import { getLocale } from "@/lib/locale-server";
import "@/components/storefront/storefront.css";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: locale === "fa" ? "سبد خرید شما" : "سەبەتەکەت" };
}

export default function CartPage() {
  return <CartView />;
}
