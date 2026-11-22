import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes, randomUUID, scrypt as scryptCallback } from "node:crypto";
import test from "node:test";
import { loadEnvConfig } from "@next/env";

Object.assign(globalThis, { AsyncLocalStorage });
const postgresOptIn = process.env.SARFE_TEST_POSTGRES === "1";
if (postgresOptIn) loadEnvConfig(process.cwd());
const databaseName = (value: string) => new URL(value).pathname.replace(/^\//, "");

function deriveTestPasswordKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCallback(password, salt, 64, {
    N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024,
  }, (error, key) => error ? reject(error) : resolve(key)));
}

async function inNextActionRequest<T>(run: () => Promise<T>): Promise<T> {
  const [{ HeadersAdapter }, { RequestCookies, ResponseCookies }, { workAsyncStorage }, { workUnitAsyncStorage }] = await Promise.all([
    import("next/dist/server/web/spec-extension/adapters/headers"),
    import("next/dist/server/web/spec-extension/cookies"),
    import("next/dist/server/app-render/work-async-storage.external"),
    import("next/dist/server/app-render/work-unit-async-storage.external"),
  ]);
  const incomingHeaders = new Headers({ host: "localhost:3000", origin: "http://localhost:3000" });
  const requestCookies = new RequestCookies(incomingHeaders);
  const responseCookies = new ResponseCookies(new Headers());
  const workStore = { route: "/admin", page: "/admin/page", forceStatic: false, dynamicShouldError: false };
  const workUnitStore = {
    type: "request", phase: "action", implicitTags: [], url: { pathname: "/admin", search: "" },
    headers: HeadersAdapter.seal(incomingHeaders), cookies: requestCookies, mutableCookies: responseCookies,
    userspaceMutableCookies: responseCookies, draftMode: {}, rootParams: {}, resumeDataCache: null,
  };
  return workAsyncStorage.run(workStore as never, () => workUnitAsyncStorage.run(workUnitStore as never, run));
}

test("owner order operations enforce access, return snapshots, and restore reserved stock once", { skip: !postgresOptIn }, async () => {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) throw new Error("Set TEST_DATABASE_URL to a dedicated PostgreSQL database ending in _test.");
  if (!["postgres:", "postgresql:"].includes(new URL(testDatabaseUrl).protocol)) throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
  const testName = databaseName(testDatabaseUrl);
  if (!testName.endsWith("_test")) throw new Error("TEST_DATABASE_URL must point to a dedicated database ending in _test.");
  if (process.env.DATABASE_URL && databaseName(process.env.DATABASE_URL) === testName) throw new Error("TEST_DATABASE_URL must be separate from DATABASE_URL.");
  process.env.DATABASE_URL = testDatabaseUrl;

  const ownerEmail = "admin-orders-integration@example.test";
  const ownerPassword = `test-${randomUUID()}`;
  const salt = randomBytes(16);
  const key = await deriveTestPasswordKey(ownerPassword, salt);
  process.env.ADMIN_EMAIL = ownerEmail;
  process.env.ADMIN_PASSWORD_HASH = `scrypt$32768$8$1$${salt.toString("hex")}$${key.toString("hex")}`;
  process.env.SESSION_SECRET = randomBytes(32).toString("hex");

  const [{ prisma }, identity, ordersAdmin, orders] = await Promise.all([
    import("../src/lib/db"),
    import("../src/modules/identity"),
    import("../src/modules/orders/admin"),
    import("../src/modules/orders/service"),
  ]);
  const prefix = `admin-orders-${randomUUID().replaceAll("-", "")}`;
  let categoryId: string | undefined;
  let connected = false;
  try {
    await prisma.$connect();
    connected = true;
    await inNextActionRequest(async () => {
      await assert.rejects(ordersAdmin.listAdminOrders(), /Sign in to manage the catalog/);
      await assert.rejects(ordersAdmin.getAdminOrder("missing"), /Sign in to manage the catalog/);
      await assert.rejects(ordersAdmin.getAdminOrderCounts(), /Sign in to manage the catalog/);
      await assert.rejects(ordersAdmin.getAdminOrderReport(), /Sign in to manage the catalog/);
      await assert.rejects(ordersAdmin.cancelAdminOrder("missing"), /Sign in to manage the catalog/);
      assert.equal(await identity.loginOwner(ownerEmail, ownerPassword), true);

      const category = await prisma.category.create({ data: { name: prefix, slug: prefix } });
      categoryId = category.id;
      const product = await prisma.product.create({ data: {
        categoryId, name: "Order admin test product", slug: `${prefix}-product`, description: "Snapshot test", status: "PUBLISHED",
      } });
      const variant = await prisma.variant.create({ data: { productId: product.id, sku: `${prefix}-SKU`, name: "Test pack", priceMinor: 1250, currency: "USD", stock: 8 } });
      const input = (key: string) => ({
        idempotencyKey: key,
        customer: { name: "Admin Snapshot Buyer", email: "buyer@example.test", phone: "+1 555 0100" },
        address: { countryCode: "US", region: "CA", locality: "Oakland", postalCode: "94612", line1: "8 Test Avenue", line2: "Unit 2" },
        items: [{ variantId: variant.id, quantity: 3 }],
      });
      const policy = { id: `${prefix}-policy`, quote: ({ currency }: { currency: string }) => ({ shippingMinor: 25, shippingPolicy: "flat-v1", taxMinor: 0, taxPolicy: "none-v1", currency }) };
      const reservation = await orders.createReservedOrder(input(`${prefix}-live`), policy);
      const other = await orders.createReservedOrder({ ...input(`${prefix}-other`), customer: { name: "Other buyer", email: "other@example.test", phone: "555" } }, policy);

      const page = await ordersAdmin.listAdminOrders({ status: "RESERVED", page: 1, pageSize: 1 });
      assert.equal(page.status, "RESERVED");
      assert.equal(page.pageSize, 1);
      assert.ok(page.total >= 2);
      assert.equal(page.orders.length, 1);
      assert.equal(page.pageCount, page.total);
      const detail = await ordersAdmin.getAdminOrder(reservation.id);
      assert.equal(detail?.status, "RESERVED");
      assert.deepEqual(detail?.customerSnapshot, input("snapshot").customer);
      assert.deepEqual(detail?.addressSnapshot, input("snapshot").address);
      assert.equal(detail?.lines[0]?.productNameSnapshot, "Order admin test product");
      assert.equal(detail?.lines[0]?.quantity, 3);
      assert.equal(detail?.expiresAt.getTime(), reservation.expiresAt.getTime());
      const createdDay = detail!.createdAt.toISOString().slice(0, 10);
      const customerMatches = await ordersAdmin.listAdminOrders({ customer: "ADMIN SNAPSHOT" });
      assert.ok(customerMatches.orders.some((order) => order.id === reservation.id));
      const skuMatches = await ordersAdmin.listAdminOrders({ sku: `${prefix.toUpperCase()}-SKU` });
      assert.ok(skuMatches.orders.some((order) => order.id === reservation.id));
      const idMatches = await ordersAdmin.listAdminOrders({ orderId: reservation.id.slice(-8) });
      assert.ok(idMatches.orders.some((order) => order.id === reservation.id));
      const dateMatches = await ordersAdmin.listAdminOrders({ from: createdDay, to: createdDay });
      assert.ok(dateMatches.orders.some((order) => order.id === reservation.id));
      await assert.rejects(ordersAdmin.listAdminOrders({ from: "2026-12-31", to: "2026-01-01" }), { name: "ZodError" });
      await assert.rejects(ordersAdmin.getAdminOrderReport({ from: "2024-01-01", to: "2025-01-02" }), { name: "ZodError" });
      const report = await ordersAdmin.getAdminOrderReport({ from: createdDay, to: createdDay });
      assert.equal(report.daily.length, 1);
      assert.ok(report.total >= 2);
      assert.equal(report.daily[0]?.total, report.total);
      assert.equal(report.daily[0]?.RESERVED, report.reserved);
      assert.equal("revenue" in report, false);
      await assert.rejects(ordersAdmin.listAdminOrders({ status: "PAID" } as never), { name: "ZodError" });
      await assert.rejects(ordersAdmin.cancelAdminOrder(" "), { name: "ZodError" });

      assert.deepEqual(await ordersAdmin.cancelAdminOrder(reservation.id), { released: true });
      assert.deepEqual(await ordersAdmin.cancelAdminOrder(reservation.id), { released: false });
      assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: reservation.id } })).status, "CANCELED");
      assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: variant.id } })).stock, 5);
      assert.deepEqual(await ordersAdmin.cancelAdminOrder(other.id), { released: true });
      assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: variant.id } })).stock, 8);
      const counts = await ordersAdmin.getAdminOrderCounts();
      assert.ok(counts.total >= 2);
      assert.ok(counts.canceled >= 2);
      assert.equal("revenue" in counts, false);

      const configuredDatabaseUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;
      try {
        await assert.rejects(ordersAdmin.listAdminOrders(), /configured PostgreSQL/);
      } finally {
        process.env.DATABASE_URL = configuredDatabaseUrl;
      }
    });
  } finally {
    if (connected) {
      await prisma.order.deleteMany({ where: { idempotencyKey: { startsWith: prefix } } });
      if (categoryId) {
        await prisma.product.deleteMany({ where: { categoryId } });
        await prisma.category.deleteMany({ where: { id: categoryId } });
      }
      await prisma.$disconnect();
    }
  }
});
