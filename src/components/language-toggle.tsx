"use client";

import { useLocale } from "@/components/locale-provider";

export function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();
  const nextLocale = locale === "fa" ? "ckb" : "fa";
  const label = `${t("locale.switch")}: ${t(`locale.${nextLocale}`)}`;

  return (
    <button
      type="button"
      className="theme-toggle language-toggle"
      aria-label={label}
      title={label}
      lang={locale === "fa" ? "ckb" : "fa"}
      onClick={() => setLocale(nextLocale)}
    >
      <span>{t(`locale.${nextLocale}`)}</span>
    </button>
  );
}
