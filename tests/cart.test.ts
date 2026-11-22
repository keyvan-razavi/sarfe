import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCart, parseStoredCart, tryAddLine, type CartLine } from "../src/modules/cart/cart-store.ts";

const oak: CartLine = {
  productId: "p-tray", slug: "arc-oak-tray", name: "Arc tray", variantId: "v-oak", variantName: "Oak / Small",
  image: null, isPreview: true, unitPriceMinor: 6800, currency: "USD", maxStock: 2, quantity: 1,
};

test("adds a variant once and increments it only up to stock", () => {
  const first = tryAddLine([], oak);
  assert.equal(first.error, null);
  assert.equal(first.lines[0]?.quantity, 1);
  const second = tryAddLine(first.lines, oak);
  assert.equal(second.error, null);
  assert.equal(second.lines[0]?.quantity, 2);
  const third = tryAddLine(second.lines, oak);
  assert.match(third.error ?? "", /stock limit/);
  assert.deepEqual(third.lines, second.lines);
});

test("rejects adding a second currency to one cart", () => {
  const alternate = { ...oak, variantId: "v-irr", currency: "IRR" };
  const result = tryAddLine([oak], alternate);
  assert.match(result.error ?? "", /one currency/);
  assert.deepEqual(result.lines, [oak]);
});

test("restores safely, discards malformed and mixed-currency rows, and deduplicates variants", () => {
  const duplicate = { ...oak, quantity: 1 };
  const parsed = parseStoredCart(JSON.stringify([oak, duplicate, { ...oak, currency: "IRR", variantId: "other" }, { broken: true }]));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]?.quantity, 2);
  assert.deepEqual(parseStoredCart("{bad json"), []);
  assert.deepEqual(normalizeCart({ lines: [oak] }), []);
});

test("keeps legacy cart lines but strips non-local image URLs", () => {
  const parsed = parseStoredCart(JSON.stringify([{ ...oak, image: "https://images.example.test/rice.jpg" }]));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]?.image, null);
  assert.equal(tryAddLine([], { ...oak, image: "https://images.example.test/rice.jpg" }).error, "This option is currently unavailable.");
});
