import { currencyMinorUnitExponent } from "@/lib/currency";
import { tomanToIrrMinor } from "@/lib/store-money";
import type { Locale } from "@/lib/i18n";
import { catalogMessage } from "./messages";

function asciiDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 && code <= 0x06f9 ? code - 0x06f0 : code - 0x0660);
  });
}

/** Parse a user-entered major-unit amount into exact integer currency units. */
export function parseCatalogMajorAmount(value: unknown, currency: string, locale: Locale): number {
  if (typeof value !== "string" && typeof value !== "number") throw new Error("Enter a valid price.");
  const amount = asciiDigits(String(value).trim());
  if (currency === "IRR") {
    if (!/^\d+$/.test(amount)) throw new Error(catalogMessage(locale, "priceInvalid"));
    const toman = Number(amount);
    if (!Number.isSafeInteger(toman)) throw new Error("Price is too large.");
    return tomanToIrrMinor(toman);
  }
  const exponent = currencyMinorUnitExponent(currency);
  const match = /^(\d+)(?:\.(\d+))?$/.exec(amount);
  if (!match || (match[2]?.length ?? 0) > exponent) throw new Error("Enter a valid price for the selected currency.");
  const minor = Number(match[1]) * (10 ** exponent) + Number((match[2] ?? "").padEnd(exponent, "0") || "0");
  if (!Number.isSafeInteger(minor) || minor > 2_000_000_000) throw new Error("Price is too large.");
  return minor;
}
