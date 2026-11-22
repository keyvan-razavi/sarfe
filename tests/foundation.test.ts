import assert from "node:assert/strict";
import test from "node:test";
import { formatMoney } from "../src/lib/format";
import { currencyMinorUnitExponent, isSupportedCurrency } from "../src/lib/currency";
import { isLocale, localeMeta } from "../src/lib/i18n";

test("formatMoney uses the currency's actual minor-unit exponent", () => {
  assert.equal(formatMoney(12_345, "USD", "en-US"), "$123.45");
  assert.match(formatMoney(12_345, "IRR", "en-US"), /123\.45/);
  assert.match(formatMoney(12_345, "IQD", "en-US"), /12\.345/);
  assert.match(formatMoney(12_345, "KWD", "en-US"), /12\.345/);
  assert.match(formatMoney(12_345, "CLF", "en-US"), /1\.2345/);
  assert.equal(currencyMinorUnitExponent("IRR"), 2);
  assert.equal(currencyMinorUnitExponent("IQD"), 3);
  assert.equal(currencyMinorUnitExponent("CLF"), 4);
  assert.equal(currencyMinorUnitExponent("JPY"), 0);
});

test("formatMoney rejects unsafe minor units and invalid currency codes", () => {
  assert.throws(() => formatMoney(Number.MAX_SAFE_INTEGER + 1, "USD"), RangeError);
  assert.throws(() => formatMoney(10.5, "USD"), RangeError);
  assert.throws(() => formatMoney(100, "usd"), RangeError);
  assert.throws(() => formatMoney(100, "ZZZ"), RangeError);
  assert.equal(isSupportedCurrency("XXX"), false);
  assert.equal(isSupportedCurrency("XAU"), false);
  assert.equal(isSupportedCurrency("XDR"), false);
  assert.equal(isSupportedCurrency("BGN"), false);
});

test("only supported Persian and Sorani locales are accepted and both are RTL", () => {
  assert.equal(isLocale("fa"), true);
  assert.equal(isLocale("ckb"), true);
  assert.equal(isLocale("en"), false);
  assert.equal(isLocale(null), false);
  assert.equal(localeMeta.fa.direction, "rtl");
  assert.equal(localeMeta.ckb.direction, "rtl");
});
