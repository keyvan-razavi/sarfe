import { formatMoney } from "@/lib/format";

/** One conventional Iranian toman is ten whole rials, or 1,000 IRR minor units. */
export const IRR_MINOR_UNITS_PER_TOMAN = 1_000;

function assertSafeMinorUnits(value: number) {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError("Money amounts must be safe integer minor units.");
  }
}

/** Convert a whole toman amount to the integer minor units persisted with currency IRR. */
export function tomanToIrrMinor(toman: number): number {
  if (!Number.isSafeInteger(toman)) {
    throw new RangeError("Toman amounts must be safe whole numbers.");
  }
  const amountMinor = toman * IRR_MINOR_UNITS_PER_TOMAN;
  assertSafeMinorUnits(amountMinor);
  return amountMinor;
}

/**
 * Convert persisted IRR minor units to a number of toman when multiplying the
 * result back to minor units recovers the original safe integer exactly.
 */
export function irrMinorToToman(amountMinor: number): number {
  assertSafeMinorUnits(amountMinor);
  const toman = amountMinor / IRR_MINOR_UNITS_PER_TOMAN;
  if (Math.round(toman * IRR_MINOR_UNITS_PER_TOMAN) !== amountMinor) {
    throw new RangeError("This IRR amount cannot be represented exactly as a toman number.");
  }
  return toman;
}

/** Format the store's IRR prices as toman while preserving generic ISO currency output. */
export function formatStoreMoney(
  amountMinor: number,
  currency: string,
  locale = "fa-IR",
): string {
  if (currency !== "IRR") return formatMoney(amountMinor, currency, locale);
  assertSafeMinorUnits(amountMinor);
  const negative = amountMinor < 0;
  const absoluteMinor = BigInt(Math.abs(amountMinor));
  const wholeToman = absoluteMinor / BigInt(IRR_MINOR_UNITS_PER_TOMAN);
  const remainder = Number(absoluteMinor % BigInt(IRR_MINOR_UNITS_PER_TOMAN));
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
  let amount = formatter.format(wholeToman);
  if (remainder !== 0) {
    const fractionalDigits = remainder.toString().padStart(3, "0").replace(/0+$/, "");
    const decimal = new Intl.NumberFormat(locale)
      .formatToParts(1.1)
      .find((part) => part.type === "decimal")?.value ?? ".";
    const localizedFraction = [...fractionalDigits]
      .map((digit) => new Intl.NumberFormat(locale, { useGrouping: false }).format(Number(digit)))
      .join("");
    amount += `${decimal}${localizedFraction}`;
  }
  if (negative) {
    const sign = formatter.formatToParts(BigInt(-1))
      .filter((part) => part.type === "minusSign" || part.type === "literal")
      .map((part) => part.value)
      .join("");
    amount = `${sign}${amount}`;
  }
  const tomanLabel = locale.startsWith("fa")
    ? "تومان"
    : locale.startsWith("ckb")
      ? "تۆمان"
      : "toman";
  return `${amount} ${tomanLabel}`;
}
