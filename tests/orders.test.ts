import assert from "node:assert/strict";
import test from "node:test";
import { orderRequestSchema, priceOrder, requestFingerprint, type OrderPricingPolicy, type OrderableVariant } from "../src/modules/orders/domain";

const request = (overrides: Record<string, unknown> = {}) => ({
  idempotencyKey: "order-test-key-001",
  customer: { name: "Test Buyer", email: "buyer@example.test", phone: "+1 555 0100" },
  address: { countryCode: "us", region: "CA", locality: "Oakland", postalCode: "94612", line1: "1 Test Street" },
  items: [{ variantId: "variant-1", quantity: 2 }],
  ...overrides,
});
const variant = (overrides: Partial<OrderableVariant> = {}): OrderableVariant => ({
  id: "variant-1", sku: "SKU-1", name: "Standard", priceMinor: 1250, currency: "USD", stock: 10,
  product: { name: "Test Product", status: "PUBLISHED" }, ...overrides,
});
const policy = (overrides: Partial<OrderPricingPolicy> = {}): OrderPricingPolicy => ({
  id: "shipping-v1",
  quote: ({ currency }) => ({ shippingMinor: 300, shippingPolicy: "flat-v1", taxMinor: 0, taxPolicy: "none-v1", currency }),
  ...overrides,
});

test("order request validates input, normalizes country code, and rejects duplicate or unsafe quantities", () => {
  assert.equal(orderRequestSchema.parse(request()).address.countryCode, "US");
  assert.throws(() => orderRequestSchema.parse(request({ idempotencyKey: "short" })));
  assert.throws(() => orderRequestSchema.parse(request({ items: [{ variantId: "variant-1", quantity: 0 }] })));
  assert.throws(() => orderRequestSchema.parse(request({ items: [{ variantId: "variant-1", quantity: 1 }, { variantId: "variant-1", quantity: 2 }] })));
  assert.throws(() => orderRequestSchema.parse(request({ items: [{ variantId: "variant-1", quantity: Number.MAX_SAFE_INTEGER + 1 }] })));
});

test("request fingerprint is item-order independent and bound to the pricing policy", () => {
  const left = orderRequestSchema.parse(request({ items: [{ variantId: "variant-1", quantity: 1 }, { variantId: "variant-2", quantity: 3 }] }));
  const right = orderRequestSchema.parse(request({ items: [{ variantId: "variant-2", quantity: 3 }, { variantId: "variant-1", quantity: 1 }] }));
  assert.equal(requestFingerprint(left, "policy-v1"), requestFingerprint(right, "policy-v1"));
  assert.notEqual(requestFingerprint(left, "policy-v1"), requestFingerprint(right, "policy-v2"));
  assert.notEqual(requestFingerprint(left, "policy-v1"), requestFingerprint(orderRequestSchema.parse(request({ items: [{ variantId: "variant-1", quantity: 2 }, { variantId: "variant-2", quantity: 3 }] })), "policy-v1"));
});

test("pricing uses server variant values and allows totals above PostgreSQL INTEGER range", async () => {
  const parsed = orderRequestSchema.parse(request({ items: [{ variantId: "variant-1", quantity: 3 }] }));
  const clientInput = { ...parsed, items: [{ ...parsed.items[0], unitPriceMinor: 1 }] };
  const sanitized = orderRequestSchema.parse(clientInput);
  const priced = await priceOrder(sanitized, [variant({ priceMinor: 1_000_000_000 })], policy());
  assert.equal(priced.lines[0].unitPriceMinor, 1_000_000_000);
  assert.equal(priced.subtotalMinor, 3_000_000_000);
  assert.equal(priced.totalMinor, 3_000_000_300);
});

test("pricing rejects unavailable, unpublished, mixed-currency, and unsafe totals", async () => {
  const parsed = orderRequestSchema.parse(request());
  await assert.rejects(priceOrder(parsed, [], policy()), /unavailable/);
  await assert.rejects(priceOrder(parsed, [variant({ product: { name: "Draft", status: "DRAFT" } })], policy()), /unavailable/);
  const mixed = orderRequestSchema.parse(request({ items: [{ variantId: "variant-1", quantity: 1 }, { variantId: "variant-2", quantity: 1 }] }));
  await assert.rejects(priceOrder(mixed, [variant({ currency: "USD" }), variant({ id: "variant-2", currency: "EUR" })], policy()), /one supported currency/);
  const tooLarge = orderRequestSchema.parse(request({ items: Array.from({ length: 47 }, (_, i) => ({ variantId: `v-${i}`, quantity: 100_000 })) }));
  const variants = tooLarge.items.map((item) => variant({ id: item.variantId, priceMinor: 2_147_483_647, stock: 100_000 }));
  await assert.rejects(priceOrder(tooLarge, variants, policy({ quote: ({ currency }) => ({ shippingMinor: 0, shippingPolicy: "free-v1", taxMinor: 0, taxPolicy: "none-v1", currency }) })), /supported amount/);
});
