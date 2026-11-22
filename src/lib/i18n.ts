export const locales = ["fa", "ckb"] as const;
export type Locale = (typeof locales)[number];
export type Direction = "rtl";

export const localeMeta: Record<
  Locale,
  { name: string; nativeName: string; direction: Direction; htmlLang: string }
> = {
  fa: {
    name: "Persian",
    nativeName: "فارسی",
    direction: "rtl",
    htmlLang: "fa",
  },
  ckb: {
    name: "Central Kurdish",
    nativeName: "کوردی",
    direction: "rtl",
    htmlLang: "ckb",
  },
};

const messages = {
  fa: {
    "locale.fa": "فارسی",
    "locale.ckb": "کوردی",
    "locale.switch": "تغییر زبان",
    "theme.system": "سامانه",
    "theme.light": "روشن",
    "theme.dark": "تیره",
    "theme.toggle": "تغییر پوسته",
  },
  ckb: {
    "locale.fa": "فارسی",
    "locale.ckb": "کوردی",
    "locale.switch": "گۆڕینی زمان",
    "theme.system": "سیستەم",
    "theme.light": "ڕووناک",
    "theme.dark": "تاریک",
    "theme.toggle": "گۆڕینی ڕووکار",
  },
} as const;

export type MessageKey = keyof (typeof messages)["fa"];

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key];
}

export function isLocale(value: string | null): value is Locale {
  return value !== null && locales.includes(value as Locale);
}
