import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { loadEnvConfig } from '@next/env';
import { jwtVerify } from 'jose';

const postgresOptIn = process.env.SARFE_TEST_POSTGRES === '1';
if (postgresOptIn) loadEnvConfig(process.cwd());
Object.assign(globalThis, { AsyncLocalStorage });

async function inAction<T>(run: () => Promise<T>, cookie?: string): Promise<{ value: T; setCookie: string | null }> {
  const [headersModule, cookiesModule, requestCookiesModule, workModule, unitModule] = await Promise.all([
    import('next/dist/server/web/spec-extension/adapters/headers'),
    import('next/dist/server/web/spec-extension/cookies'),
    import('next/dist/server/web/spec-extension/adapters/request-cookies'),
    import('next/dist/server/app-render/work-async-storage.external'),
    import('next/dist/server/app-render/work-unit-async-storage.external'),
  ]);
  const incoming = new Headers({ host: 'localhost:3000', origin: 'http://localhost:3000', ...(cookie ? { cookie } : {}) });
  const requestCookies = new cookiesModule.RequestCookies(incoming);
  const responseHeaders = new Headers();
  const responseCookies = new cookiesModule.ResponseCookies(responseHeaders);
  const mutableRequestCookies = requestCookiesModule.MutableRequestCookiesAdapter.wrap(requestCookies, (serialized: string[]) => responseHeaders.set('set-cookie', serialized.join(', ')));
  const work = { route: '/account', page: '/account/page', forceStatic: false, dynamicShouldError: false };
  const unit = {
    type: 'request', phase: 'action', implicitTags: [], url: { pathname: '/account', search: '' },
    headers: headersModule.HeadersAdapter.seal(incoming), cookies: requestCookies,
    mutableCookies: responseCookies, userspaceMutableCookies: mutableRequestCookies, draftMode: {}, rootParams: {}, resumeDataCache: null,
  };
  const value = await workModule.workAsyncStorage.run(work as never, () => unitModule.workUnitAsyncStorage.run(unit as never, run));
  return { value, setCookie: responseHeaders.get('set-cookie') };
}

function cookiePair(setCookie: string | null): string | undefined { return setCookie?.split(';', 1)[0]; }

test('customer auth persistence and owner-scoped order history in dedicated PostgreSQL', { skip: !postgresOptIn }, async (t) => {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL database ending in _test.');
  const testName = new URL(testUrl).pathname.replace(/^\//, '');
  if (!testName.endsWith('_test')) throw new Error('TEST_DATABASE_URL must point to a dedicated database ending in _test.');
  if (process.env.DATABASE_URL && new URL(process.env.DATABASE_URL).pathname === `/${testName}`) throw new Error('TEST_DATABASE_URL must be separate from DATABASE_URL.');
  process.env.DATABASE_URL = testUrl;
  process.env.SESSION_SECRET = randomUUID() + randomUUID();
  const [{ prisma }, account, orders] = await Promise.all([
    import('../src/lib/db'), import('../src/modules/customer-account'), import('../src/modules/orders'),
  ]);
  const key = `customer-it-${randomUUID().replaceAll('-', '')}`;
  const fixtures: string[] = [];
  let firstId = '';
  let secondId = '';
  let connected = false;
  try {
    await prisma.$connect();
    connected = true;
    await t.test('registration, login and profile persist safe customer data', async () => {
      const registration = { name: 'Buyer One', email: `${key}@example.test`, phone: '+98 21 0000', password: 'long-customer-password' };
      const created = await inAction(() => account.registerCustomer(registration));
      assert.deepEqual(created.value, { success: true });
      const customerCookie = cookiePair(created.setCookie);
      assert.ok(customerCookie?.startsWith('sarfe_customer_session='));
      const saved = await prisma.customer.findUniqueOrThrow({ where: { email: `${key}@example.test` } });
      firstId = saved.id;
      const token = customerCookie!.slice('sarfe_customer_session='.length);
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET), { algorithms: ['HS256'], issuer: 'sarfe-customer-account', audience: 'sarfe-customer' });
      assert.equal(payload.customerId, firstId, 'signed customer cookie must verify and carry the persisted customer ID');
      assert.match(saved.passwordHash, /^scrypt\$/);
      assert.equal(saved.passwordHash.includes(registration.password), false);
      assert.deepEqual(await inAction(() => account.registerCustomer(registration)).then(({ value }) => value), { success: false, reason: 'exists' });
      const session = await inAction(() => account.getCustomerSession(), customerCookie);
      assert.deepEqual(session.value, { id: saved.id, name: 'Buyer One', email: `${key}@example.test`, phone: '+98 21 0000' });
      assert.equal(await inAction(() => account.loginCustomer(`${key}@example.test`, 'wrong-password')).then(({ value }) => value), false);
      const login = await inAction(() => account.loginCustomer(`${key}@example.test`, registration.password));
      assert.equal(login.value, true);
      const loginCookie = cookiePair(login.setCookie);
      assert.ok(loginCookie?.startsWith('sarfe_customer_session='));
      const updated = await inAction(() => account.updateCustomerProfile({ name: ' Buyer Updated ', phone: ' 021 111 ' }), loginCookie);
      assert.equal(updated.value?.name, 'Buyer Updated');
      assert.equal((await prisma.customer.findUniqueOrThrow({ where: { id: saved.id } })).phone, '021 111');
      const invalid = await inAction(() => account.updateCustomerProfile({ name: '', phone: 'x' }), loginCookie);
      assert.equal(invalid.value, null);
      await inAction(() => account.signOutCustomer(), loginCookie);
    });

    await t.test('account orders are linked by session identity and cannot be read by another customer', async () => {
      const second = await inAction(() => account.registerCustomer({ name: 'Buyer Two', email: `${key}-two@example.test`, phone: '021 2', password: 'another-customer-password' }));
      assert.deepEqual(second.value, { success: true });
      secondId = (await prisma.customer.findUniqueOrThrow({ where: { email: `${key}-two@example.test` } })).id;
      const suffix = randomUUID().replaceAll('-', '');
      const category = await prisma.category.create({ data: { name: `Account order ${suffix}`, slug: `account-order-${suffix}` } });
      fixtures.push(category.id);
      const product = await prisma.product.create({ data: { categoryId: category.id, slug: `account-order-${suffix}`, name: 'Account test item', description: 'Postgres fixture', status: 'PUBLISHED' } });
      const variant = await prisma.variant.create({ data: { productId: product.id, sku: `AO-${suffix}`, name: 'Standard', priceMinor: 1250, currency: 'USD', stock: 20 } });
      const orderInput = (idempotencyKey: string) => ({ idempotencyKey, customer: { name: 'Snapshot', email: 'snapshot@example.test', phone: '000' }, address: { countryCode: 'IR', region: 'Tehran', locality: 'Tehran', postalCode: '1234567890', line1: 'Test street' }, items: [{ variantId: variant.id, quantity: 1 }] });
      const policy = { id: 'account-test-policy-v1', quote: ({ currency }: { currency: string }) => ({ shippingMinor: 0, shippingPolicy: 'none-v1', taxMinor: 0, taxPolicy: 'none-v1', currency }) };
      const firstOrder = await orders.createReservedOrder(orderInput(`${key}-one`), policy, firstId);
      const secondOrder = await orders.createReservedOrder(orderInput(`${key}-two`), policy, secondId);
      const guestOrder = await orders.createReservedOrder(orderInput(`${key}-guest`), policy);
      const mine = await orders.listCustomerOrders(firstId);
      assert.deepEqual(mine.map((order) => order.id), [firstOrder.id]);
      assert.equal(await orders.getCustomerOrder(firstId, secondOrder.id), null);
      assert.equal(await orders.getCustomerOrder(firstId, guestOrder.id), null);
      assert.equal((await orders.getCustomerOrder(secondId, secondOrder.id))?.status, 'RESERVED');
      assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: guestOrder.id } })).customerId, null);
      const detail = await orders.getCustomerOrder(firstId, firstOrder.id);
      assert.equal(detail?.lines[0]?.productName, 'Account test item');
      assert.equal(detail?.status, 'RESERVED');
      await assert.rejects(orders.createReservedOrder(orderInput(`${key}-one`), policy, secondId), /different request/);
    });
  } finally {
    if (connected) {
      await prisma.order.deleteMany({ where: { idempotencyKey: { startsWith: key } } });
      await prisma.customer.deleteMany({ where: { email: { startsWith: key } } });
      if (fixtures.length) {
        await prisma.product.deleteMany({ where: { categoryId: { in: fixtures } } });
        await prisma.category.deleteMany({ where: { id: { in: fixtures } } });
      }
      await prisma.$disconnect();
    }
  }
});
