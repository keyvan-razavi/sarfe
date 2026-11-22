import assert from "node:assert/strict";
import test from "node:test";
import { formatMoney } from "../src/lib/format";
import {
  formatStoreMoney,
  irrMinorToToman,
  tomanToIrrMinor,
} from "../src/lib/store-money";
import { previewProducts } from "../src/modules/catalog/fixtures";

test("toman and IRR minor-unit conversions round-trip whole toman values exactly", () => {
  for (const toman of [0, 1, 125, 89_000, 399_000]) {
    const minor = tomanToIrrMinor(toman);
    assert.equal(irrMinorToToman(minor), toman);
    assert.equal(tomanToIrrMinor(irrMinorToToman(minor)), minor);
  }
});

test("toman conversion rejects fractional or unsafe amounts without rounding", () => {
  assert.throws(() => tomanToIrrMinor(1.5), RangeError);
  assert.throws(() => tomanToIrrMinor(Number.MAX_SAFE_INTEGER), RangeError);
  assert.throws(() => irrMinorToToman(Number.MAX_SAFE_INTEGER + 1), RangeError);
  assert.throws(() => irrMinorToToman(10.5), RangeError);
  assert.throws(() => irrMinorToToman(Number.MAX_SAFE_INTEGER), RangeError);
  assert.equal(irrMinorToToman(1), 0.001);
  assert.equal(formatStoreMoney(1, "IRR", "en-US"), "0.001 toman");
});

test("store formatting labels IRR as toman in Persian and Sorani", () => {
  assert.match(formatStoreMoney(125_000, "IRR", "fa-IR"), /۱۲۵ تومان$/);
  assert.match(formatStoreMoney(125_000, "IRR", "ckb-IQ"), /١٢٥ تۆمان$|۱۲۵ تۆمان$|125 تۆمان$/);
  assert.match(formatStoreMoney(125_500, "IRR", "fa-IR"), /۱۲۵٫۵ تومان$/);
});

test("store formatting preserves boundary, negative, and zero IRR minor units exactly", () => {
  assert.equal(formatStoreMoney(Number.MAX_SAFE_INTEGER, "IRR", "en-US"), "9,007,199,254,740.991 toman");
  assert.equal(formatStoreMoney(-1, "IRR", "en-US"), "-0.001 toman");
  assert.equal(formatStoreMoney(0, "IRR", "en-US"), "0 toman");
});

test("store formatting keeps other ISO currencies on the generic formatter", () => {
  assert.equal(formatStoreMoney(12_345, "USD", "en-US"), formatMoney(12_345, "USD", "en-US"));
  assert.equal(formatStoreMoney(12_345, "IRR", "en-US"), "12.345 toman");
  assert.throws(() => formatStoreMoney(100, "ZZZ", "en-US"), RangeError);
});

test("preview catalog prices are illustrative IRR minor units for whole toman amounts", () => {
  for (const product of previewProducts) {
    assert.equal(product.currency, "IRR");
    assert.equal(product.priceMinor % 1_000, 0);
    for (const variant of product.variants) {
      assert.equal(variant.currency, "IRR");
      assert.equal(variant.priceMinor % 1_000, 0);
    }
  }
});
