export type JalaliLocale = "fa" | "ckb";
export type IsoDate = `${number}-${number}-${number}`;
export type JalaliDateParts = { year: number; month: number; day: number };

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function persianFormatter(locale: JalaliLocale): Intl.DateTimeFormat {
  const intlLocale = locale === "fa" ? "fa-IR-u-ca-persian-nu-latn" : "ckb-IQ-u-ca-persian-nu-latn";
  let formatter = formatterCache.get(intlLocale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(intlLocale, {
      calendar: "persian",
      numberingSystem: "latn",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      timeZone: "UTC",
    });
    formatterCache.set(intlLocale, formatter);
  }
  return formatter;
}

export function parseIsoDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function toIsoDate(date: Date): IsoDate {
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}` as IsoDate;
}

export function getJalaliParts(date: Date, locale: JalaliLocale): JalaliDateParts {
  const parts = persianFormatter(locale).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

export function findGregorianDate(year: number, month: number, day: number, locale: JalaliLocale): Date | null {
  // Intl exposes Gregorian-to-Persian conversion but no inverse. Search the small
  // Gregorian window that contains a Jalali year, comparing exact calendar parts.
  const cursor = new Date(Date.UTC(year + 620, 0, 1));
  const end = Date.UTC(year + 623, 0, 1);
  while (cursor.getTime() < end) {
    const parts = getJalaliParts(cursor, locale);
    if (parts.year === year && parts.month === month && parts.day === day) return new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return null;
}

export function shiftJalaliMonth(year: number, month: number, amount: number): { year: number; month: number } {
  const index = year * 12 + month - 1 + amount;
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 + 1 };
}

export function getJalaliMonthLabel(year: number, month: number, locale: JalaliLocale): string {
  const date = findGregorianDate(year, month, 1, locale);
  if (!date) return `${year}/${month}`;
  // Sorani ICU data currently transliterates Jalali month names into Latin
  // characters. Keep the shared calendar month name in Persian script and
  // localize the year digits to the active interface locale.
  const monthName = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    calendar: "persian", month: "long", timeZone: "UTC",
  }).format(date);
  const localizedYear = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "ckb-IQ", {
    useGrouping: false,
  }).format(year);
  return `${monthName} ${localizedYear}`;
}

export function formatIsoDate(value: string | undefined, locale: JalaliLocale): string {
  const date = parseIsoDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR-u-ca-persian" : "ckb-IQ-u-ca-persian", {
    calendar: "persian", year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  }).format(date);
}
