import { currencyMinorUnitExponent } from "@/lib/currency";

export type CurrencyCode = string;

export function formatMoney(
  amountMinor: number,
  currency: CurrencyCode,
  locale = "fa-IR",
): string {
  if (!Number.isSafeInteger(amountMinor))
    throw new RangeError("Money amounts must be safe integer minor units.");
  const fractionDigits = currencyMinorUnitExponent(currency);
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return formatter.format(amountMinor / 10 ** fractionDigits);
}

export const formatPrice = formatMoney;

export function formatDate(date: Date | string, locale = "fa-IR"): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(date),
  );
}

/** Formats an ISO date or timestamp with the Jalali calendar in Tehran time. */
export function formatJalaliDate(date: Date | string, locale = "fa-IR"): string {
  const instant = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T12:00:00.000Z`)
    : new Date(date);
  return new Intl.DateTimeFormat(`${locale}-u-ca-persian`, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tehran",
  }).format(instant);
}
