import assert from 'node:assert/strict';
import test from 'node:test';
import { orderRequestSchema, priceOrder, type OrderableVariant } from '../src/modules/orders/domain';
import { isCheckoutEnabled, readCheckoutPolicyConfig } from '../src/modules/orders/checkout-policy';

const configured = {
  DATABASE_URL: 'postgresql://localhost/store',
  CHECKOUT_POLICY_ID: 'iran-flat-fees-v1',
  CHECKOUT_POLICY_CURRENCY: 'IRR',
  CHECKOUT_SHIPPING_MINOR: '250000',
  CHECKOUT_SHIPPING_POLICY: 'flat-shipping-v1',
  CHECKOUT_TAX_MINOR: '0',
  CHECKOUT_TAX_POLICY: 'explicit-no-tax-v1',
};

test('checkout policy stays unavailable until every explicit fee setting is valid', () => {
  assert.equal(readCheckoutPolicyConfig({}), null);
  assert.equal(readCheckoutPolicyConfig({ ...configured, CHECKOUT_TAX_MINOR: undefined }), null);
  assert.equal(readCheckoutPolicyConfig({ ...configured, CHECKOUT_SHIPPING_MINOR: '-1' }), null);
  assert.equal(readCheckoutPolicyConfig({ ...configured, CHECKOUT_POLICY_CURRENCY: 'irr' }), null);
  assert.equal(readCheckoutPolicyConfig({ ...configured, CHECKOUT_POLICY_CURRENCY: 'ZZZ' }), null);
  assert.equal(isCheckoutEnabled(readCheckoutPolicyConfig(configured), configured), true);
});

test('production checkout stays disabled unless the server flag is explicitly enabled', () => {
  const production = { ...configured, NODE_ENV: 'production' };
  assert.equal(isCheckoutEnabled(readCheckoutPolicyConfig(production), production), false);
  const enabled = { ...production, CHECKOUT_ENABLED: 'true' };
  assert.equal(isCheckoutEnabled(readCheckoutPolicyConfig(enabled), enabled), true);
  assert.equal(isCheckoutEnabled(readCheckoutPolicyConfig({ ...configured, DATABASE_URL: undefined }), { ...configured, DATABASE_URL: undefined }), false);
});

test('order input ignores client price, currency, name, image and preview claims', async () => {
  const untrusted = {
    idempotencyKey: 'checkout-tamper-test-1',
    customer: { name: 'Buyer', email: 'buyer@example.test', phone: '02100000000' },
    address: { countryCode: 'IR', region: 'Tehran', locality: 'Tehran', postalCode: '1234567890', line1: 'Test street' },
    items: [{ variantId: 'db-variant', quantity: 2, unitPriceMinor: 1, currency: 'USD', name: 'Fake', image: '/fake.png', isPreview: true }],
  };
  const request = orderRequestSchema.parse(untrusted);
  assert.deepEqual(request.items, [{ variantId: 'db-variant', quantity: 2 }]);
  const config = readCheckoutPolicyConfig(configured)!;
  const variant: OrderableVariant = { id: 'db-variant', sku: 'DB-SKU', name: 'Database Variant', priceMinor: 9000, currency: 'IRR', stock: 4, product: { name: 'Database Product', status: 'PUBLISHED' } };
  const priced = await priceOrder(request, [variant], config.policy);
  assert.equal(priced.lines[0].unitPriceMinor, 9000);
  assert.equal(priced.lines[0].productName, 'Database Product');
  assert.equal(priced.currency, 'IRR');
  assert.equal(priced.totalMinor, 268000);
});

test('configured policy rejects a product currency mismatch', async () => {
  const request = orderRequestSchema.parse({
    idempotencyKey: 'checkout-currency-test-1',
    customer: { name: 'Buyer', email: 'buyer@example.test', phone: '02100000000' },
    address: { countryCode: 'IR', region: 'Tehran', locality: 'Tehran', postalCode: '1234567890', line1: 'Test street' },
    items: [{ variantId: 'db-variant', quantity: 1 }],
  });
  const variant: OrderableVariant = { id: 'db-variant', sku: 'DB-SKU', name: 'Database Variant', priceMinor: 9000, currency: 'USD', stock: 4, product: { name: 'Database Product', status: 'PUBLISHED' } };
  await assert.rejects(priceOrder(request, [variant], readCheckoutPolicyConfig(configured)!.policy), /currency must match/);
});
