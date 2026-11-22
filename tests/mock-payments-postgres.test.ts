import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { loadEnvConfig } from '@next/env';

const postgresOptIn = process.env.SARFE_TEST_POSTGRES === '1';
if (postgresOptIn) loadEnvConfig(process.cwd());

test('local mock attempts are persisted, owner-scoped and leave orders unpaid with reservations unchanged', { skip: !postgresOptIn }, async () => {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL database ending in _test.');
  const databaseName = new URL(testUrl).pathname.replace(/^\//, '');
  if (!databaseName.endsWith('_test')) throw new Error('TEST_DATABASE_URL must point to a dedicated database ending in _test.');
  if (process.env.DATABASE_URL && new URL(process.env.DATABASE_URL).pathname === `/${databaseName}`) throw new Error('TEST_DATABASE_URL must be separate from DATABASE_URL.');
  process.env.DATABASE_URL = testUrl;
  Object.assign(process.env, { NODE_ENV: 'test', MOCK_PAYMENTS_ENABLED: 'true' });
  const [{ prisma }, { simulateOrderPayment, listOrderPaymentAttempts }] = await Promise.all([
    import('../src/lib/db'), import('../src/modules/mock-payments/service'),
  ]);
  const suffix = randomUUID().replaceAll('-', '');
  const customerIds: string[] = [];
  const orderIds: string[] = [];
  const categoryIds: string[] = [];
  const productIds: string[] = [];
  let connected = false;
  try {
    await prisma.$connect();
    connected = true;
    const customerA = await prisma.customer.create({ data: { email: `${suffix}-a@example.test`, name: 'Customer A', phone: '021', passwordHash: 'fixture-only' } });
    const customerB = await prisma.customer.create({ data: { email: `${suffix}-b@example.test`, name: 'Customer B', phone: '022', passwordHash: 'fixture-only' } });
    customerIds.push(customerA.id, customerB.id);
    const category = await prisma.category.create({ data: { name: `Mock payment ${suffix}`, slug: `mock-payment-${suffix}` } });
    categoryIds.push(category.id);
    const product = await prisma.product.create({ data: { categoryId: category.id, slug: `mock-payment-${suffix}`, name: 'Mock payment fixture', description: 'test', status: 'PUBLISHED' } });
    productIds.push(product.id);
    const variant = await prisma.variant.create({ data: { productId: product.id, sku: `MP-${suffix}`, name: 'Single', priceMinor: 500000, currency: 'IRR', stock: 7 } });
    const makeOrder = async (customerId: string, key: string, status: 'RESERVED' | 'CANCELED' = 'RESERVED') => prisma.order.create({ data: {
      idempotencyKey: `${suffix}-${key}`,
      requestFingerprint: randomUUID().replaceAll('-', '').slice(0, 64),
      status,
      customerSnapshot: { name: 'Snapshot', email: 'snapshot@example.test', phone: '000' },
      addressSnapshot: { countryCode: 'IR', region: 'Tehran', locality: 'Tehran', postalCode: '1234567890', line1: 'Test' },
      currency: 'IRR', subtotalMinor: BigInt('500000'), shippingMinor: BigInt('0'), taxMinor: BigInt('0'), totalMinor: BigInt('500000'),
      shippingPolicy: 'demo-zero-shipping', taxPolicy: 'demo-zero-tax',
      expiresAt: new Date(Date.now() + 600_000), customerId,
      ...(key === 'order-a' ? { lines: { create: { variantId: variant.id, productNameSnapshot: 'Mock payment fixture', variantNameSnapshot: 'Single', skuSnapshot: variant.sku, quantity: 1, reservedRemaining: 1, unitPriceMinor: 500000, lineTotalMinor: BigInt('500000'), currency: 'IRR' } } } : {}),
    } });
    const orderA = await makeOrder(customerA.id, 'order-a');
    const orderB = await makeOrder(customerB.id, 'order-b');
    const canceled = await makeOrder(customerA.id, 'order-canceled', 'CANCELED');
    orderIds.push(orderA.id, orderB.id, canceled.id);

    const request = { orderId: orderA.id, attemptKey: `${suffix}-attempt`, scenario: 'APPROVED' as const };
    const attempt = await simulateOrderPayment(customerA.id, request);
    const replay = await simulateOrderPayment(customerA.id, request);
    assert.equal(replay.id, attempt.id);
    assert.equal(attempt.outcome, 'APPROVED');
    assert.equal(attempt.amountMinor, 500000);
    assert.equal(attempt.currency, 'IRR');
    assert.deepEqual((await listOrderPaymentAttempts(customerA.id, orderA.id)).map((item) => item.id), [attempt.id]);
    await assert.rejects(listOrderPaymentAttempts(customerB.id, orderA.id), /unavailable/);
    await assert.rejects(simulateOrderPayment(customerB.id, { ...request, attemptKey: `${suffix}-wrong-owner` }), /unavailable/);
    await assert.rejects(simulateOrderPayment(customerA.id, { ...request, attemptKey: `${suffix}-different`, orderId: canceled.id }), /active reservation/);
    await assert.rejects(simulateOrderPayment(customerA.id, { ...request, scenario: 'DECLINED' }), /different simulation/);
    const unchanged = await prisma.order.findUniqueOrThrow({ where: { id: orderA.id } });
    assert.equal(unchanged.status, 'RESERVED');
    assert.equal(unchanged.releasedAt, null);
    assert.equal(await prisma.paymentAttempt.count({ where: { orderId: orderA.id } }), 1);
    assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: variant.id } })).stock, 7);
    assert.equal((await prisma.orderLine.findFirstOrThrow({ where: { orderId: orderA.id } })).reservedRemaining, 1);
    await prisma.order.update({ where: { id: orderA.id }, data: { expiresAt: new Date(Date.now() - 1_000) } });
    await assert.rejects(listOrderPaymentAttempts(customerA.id, orderA.id), /unavailable/);
    await assert.rejects(simulateOrderPayment(customerA.id, request), /unavailable/);
    Object.assign(process.env, { MOCK_PAYMENTS_ENABLED: 'false' });
    await assert.rejects(simulateOrderPayment(customerA.id, { ...request, attemptKey: `${suffix}-disabled` }), /disabled/);
    Object.assign(process.env, { MOCK_PAYMENTS_ENABLED: 'true' });
  } finally {
    if (connected) {
      await prisma.paymentAttempt.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      if (productIds.length) await prisma.product.deleteMany({ where: { id: { in: productIds } } });
      if (categoryIds.length) await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
      await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
      await prisma.$disconnect();
    }
  }
});
