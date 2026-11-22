"use client";

import { useLocale } from "@/components/locale-provider";
import { ErrorState } from "@/components/ui";
import { Button } from "@/components/ui";
import { storefrontText } from "@/components/storefront/messages";
import "@/components/storefront/storefront.css";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { locale } = useLocale();
  const t = storefrontText(locale);
  return <main className="not-found-page"><ErrorState title={t.errorTitle}><p>{t.errorBody}</p><Button onClick={reset}>{t.retry}</Button></ErrorState></main>;
}
