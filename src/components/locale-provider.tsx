"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { localeMeta, translate, type Direction, type Locale, type MessageKey } from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  direction: Direction;
  t: (key: MessageKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyLocale(locale: Locale) {
  const meta = localeMeta[locale];
  document.documentElement.lang = meta.htmlLang;
  document.documentElement.dir = meta.direction;
}

export function LocaleProvider({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    applyLocale(nextLocale);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `sarfe-locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    const localizedUrl = new URL(window.location.href);
    localizedUrl.searchParams.set("lang", nextLocale);
    window.history.replaceState(null, "", localizedUrl);
    router.refresh();
  }, [router]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    direction: localeMeta[locale].direction,
    t: (key) => translate(locale, key),
  }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
