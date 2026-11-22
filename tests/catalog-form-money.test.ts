import assert from "node:assert/strict";
import test from "node:test";
import { tomanToIrrMinor } from "../src/lib/store-money";
import { parseCatalogMajorAmount } from "../src/modules/catalog/form-money";

test("catalog form converts whole toman input to IRR storage units", () => {
  assert.equal(parseCatalogMajorAmount("۱۲۵۰۰۰", "IRR", "fa"), tomanToIrrMinor(125_000));
  assert.equal(parseCatalogMajorAmount("١٢٥٠٠٠", "IRR", "ckb"), tomanToIrrMinor(125_000));
  assert.throws(() => parseCatalogMajorAmount("125000.5", "IRR", "fa"), /قیمت را به‌صورت عدد صحیح تومان وارد کنید/);
});

test("catalog form parses supported ISO major units without floating-point rounding", () => {
  assert.equal(parseCatalogMajorAmount("123.45", "USD", "fa"), 12_345);
  assert.equal(parseCatalogMajorAmount("123", "JPY", "fa"), 123);
  assert.equal(parseCatalogMajorAmount("1.234", "KWD", "fa"), 1_234);
  assert.throws(() => parseCatalogMajorAmount("1.234", "USD", "fa"), /valid price/);
  assert.throws(() => parseCatalogMajorAmount("12", "ZZZ", "fa"), /Unsupported ISO 4217/);
});
