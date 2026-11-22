import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadEnvConfig } from "@next/env";
const postgresOptIn = process.env.SARFE_TEST_POSTGRES === "1";
if (postgresOptIn) loadEnvConfig(process.cwd());
const testDatabaseUrl = postgresOptIn ? process.env.TEST_DATABASE_URL : undefined;
const databaseName = (value: string) => new URL(value).pathname.replace(/^\//, "");

test("order reservations against dedicated PostgreSQL test database", { skip: !postgresOptIn }, async (t) => {
  if (!testDatabaseUrl) {
    throw new Error("Set TEST_DATABASE_URL to a dedicated PostgreSQL database ending in _test.");
  }
  const parsedTestUrl = new URL(testDatabaseUrl);
  if (!["postgres:", "postgresql:"].includes(parsedTestUrl.protocol)) {
    throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
  }
  const testName = databaseName(testDatabaseUrl);
  if (!testName.endsWith("_test")) throw new Error("TEST_DATABASE_URL must point to a dedicated database ending in _test.");
  if (process.env.DATABASE_URL && databaseName(process.env.DATABASE_URL) === testName) {
    throw new Error("TEST_DATABASE_URL must be separate from DATABASE_URL.");
  }
  process.env.DATABASE_URL = testDatabaseUrl;
  const [{ prisma }, orders] = await Promise.all([
    import("../src/lib/db"),
    import("../src/modules/orders/service"),
  ]);
  const fixtures: string[] = [];
  const prefix = `it-${randomUUID().replaceAll("-", "")}`;

  async function fixture(options: { stock?: number; price?: number; status?: "DRAFT" | "PUBLISHED" } = {}) {
    const id = randomUUID().replaceAll("-", "");
    const category = await prisma.category.create({ data: { name: `Order test ${id}`, slug: `order-test-${id}` } });
    fixtures.push(category.id);
    const product = await prisma.product.create({ data: {
      categoryId: category.id,
      slug: `order-test-${id}`,
      name: `Order test ${id}`,
      description: "Temporary order integration fixture",
      status: options.status ?? "PUBLISHED",
    } });
    const variant = await prisma.variant.create({ data: {
      productId: product.id,
      sku: `OT-${id}`,
      name: "Test variant",
      priceMinor: options.price ?? 1250,
      currency: "USD",
      stock: options.stock ?? 10,
    } });
    return variant;
  }

  function input(key: string, variantId: string, quantity = 1, extra: Record<string, unknown> = {}) {
    return {
      idempotencyKey: key,
      customer: { name: "Integration Buyer", email: "integration@example.test", phone: "+1 555 0110" },
      address: { countryCode: "US", region: "CA", locality: "Oakland", postalCode: "94612", line1: "1 Test Street" },
      items: [{ variantId, quantity, ...extra }],
    };
  }

  const policy = { id: "integration-shipping-v1", quote: ({ currency }: { currency: string }) => ({ shippingMinor: 25, shippingPolicy: "flat-v1", taxMinor: 0, taxPolicy: "none-v1", currency }) };
  const stockOf = async (id: string) => (await prisma.variant.findUniqueOrThrow({ where: { id }, select: { stock: true } })).stock;
  const orderCountFor = (key: string) => prisma.order.count({ where: { idempotencyKey: key } });

  let databaseConnected = false;
  try {
    await prisma.$connect();
    databaseConnected = true;

    await t.test("concurrent reservations cannot oversell", async () => {
      const variant = await fixture({ stock: 3 });
      const result = await Promise.allSettled([
        orders.createReservedOrder(input(`${prefix}-oversell-a`, variant.id, 2), policy),
        orders.createReservedOrder(input(`${prefix}-oversell-b`, variant.id, 2), policy),
      ]);
      assert.equal(result.filter((item) => item.status === "fulfilled").length, 1);
      assert.equal(await stockOf(variant.id), 1);
    });

    await t.test("same-key concurrent retries create one reservation; changed payload is rejected", async () => {
      const variant = await fixture({ stock: 5 });
      const key = `${prefix}-retry`;
      const result = await Promise.all([
        orders.createReservedOrder(input(key, variant.id, 2), policy),
        orders.createReservedOrder(input(key, variant.id, 2), policy),
      ]);
      assert.equal(result[0].id, result[1].id);
      assert.equal(await orderCountFor(key), 1);
      assert.equal(await stockOf(variant.id), 3);
      await prisma.variant.update({ where: { id: variant.id }, data: { priceMinor: 9000 } });
      const replayAfterReprice = await orders.createReservedOrder(input(key, variant.id, 2), policy);
      assert.equal(replayAfterReprice.id, result[0].id);
      assert.equal(replayAfterReprice.totalMinor, result[0].totalMinor);
      await assert.rejects(orders.createReservedOrder(input(key, variant.id, 1), policy), /different request/);
      await assert.rejects(orders.createReservedOrder(input(key, variant.id, 2), { ...policy, id: "integration-shipping-v2" }), /different request/);
    });

    await t.test("server pricing is persisted and unpublished or missing variants are rejected", async () => {
      const variant = await fixture({ stock: 4, price: 9876 });
      const key = `${prefix}-pricing`;
      const created = await orders.createReservedOrder(input(key, variant.id, 2, { unitPriceMinor: 1 }), policy);
      const saved = await prisma.order.findUniqueOrThrow({ where: { id: created.id }, include: { lines: true } });
      assert.equal(saved.lines[0].unitPriceMinor, 9876);
      assert.equal(saved.lines[0].lineTotalMinor, BigInt(19_752));
      assert.equal(saved.totalMinor, BigInt(19_777));
      const draft = await fixture({ status: "DRAFT" });
      await assert.rejects(orders.createReservedOrder(input(`${prefix}-draft`, draft.id), policy), /unavailable/);
      await assert.rejects(orders.createReservedOrder(input(`${prefix}-missing`, "does-not-exist"), policy), /unavailable/);
      assert.equal(await stockOf(draft.id), 10);
    });

    await t.test("database total columns persist values above INTEGER range", async () => {
      const variant = await fixture({ stock: 3, price: 1_000_000_000 });
      const created = await orders.createReservedOrder(input(`${prefix}-wide`, variant.id, 3), policy);
      const saved = await prisma.order.findUniqueOrThrow({ where: { id: created.id }, include: { lines: true } });
      assert.equal(saved.subtotalMinor, BigInt(3_000_000_000));
      assert.equal(saved.totalMinor, BigInt(3_000_000_025));
      assert.equal(saved.lines[0].lineTotalMinor, BigInt(3_000_000_000));
      assert.equal(created.totalMinor, 3_000_000_025);
    });

    await t.test("failed order insertion rolls back its stock reservation", async () => {
      const variant = await fixture({ stock: 4 });
      const key = `${prefix}-rollback`;
      const safe = randomUUID().replaceAll("-", "");
      const trigger = `order_test_${safe}`;
      const fn = `order_test_fn_${safe}`;
      try {
        await prisma.$executeRawUnsafe(`CREATE FUNCTION "${fn}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."idempotencyKey" LIKE '${key}%' THEN RAISE EXCEPTION 'intentional test rollback'; END IF; RETURN NEW; END $$`);
        await prisma.$executeRawUnsafe(`CREATE TRIGGER "${trigger}" BEFORE INSERT ON "Order" FOR EACH ROW EXECUTE FUNCTION "${fn}"()`);
        await assert.rejects(orders.createReservedOrder(input(key, variant.id, 2), policy), /intentional test rollback/);
      } finally {
        await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${trigger}" ON "Order"`);
        await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${fn}"()`);
      }
      assert.equal(await stockOf(variant.id), 4);
      assert.equal(await orderCountFor(key), 0);
    });

    await t.test("double cancellation and repeated expiry restore stock once", async () => {
      const canceledVariant = await fixture({ stock: 5 });
      const canceled = await orders.createReservedOrder(input(`${prefix}-cancel`, canceledVariant.id, 2), policy);
      const canceledResults = await Promise.all([
        orders.releaseOrder(canceled.id, "CANCELED"),
        orders.releaseOrder(canceled.id, "CANCELED"),
      ]);
      assert.equal(canceledResults.filter(Boolean).length, 1);
      assert.equal(await stockOf(canceledVariant.id), 5);
      await assert.rejects(orders.createReservedOrder(input(`${prefix}-cancel`, canceledVariant.id, 2), policy), /ended/);
      const canceledLine = await prisma.orderLine.findFirstOrThrow({ where: { orderId: canceled.id } });
      assert.equal(canceledLine.reservedRemaining, 0);

      const expiredVariant = await fixture({ stock: 5 });
      const expired = await orders.createReservedOrder(input(`${prefix}-expiry`, expiredVariant.id, 2), policy);
      const past = new Date(Date.now() - 1000);
      await prisma.order.update({ where: { id: expired.id }, data: { expiresAt: past } });
      assert.equal(await orders.expireDueReservations(new Date(), 100), 1);
      assert.equal(await orders.expireDueReservations(new Date(), 100), 0);
      assert.equal(await stockOf(expiredVariant.id), 5);
      await assert.rejects(orders.createReservedOrder(input(`${prefix}-expiry`, expiredVariant.id, 2), policy), /ended|expired/);
      const expiredLine = await prisma.orderLine.findFirstOrThrow({ where: { orderId: expired.id } });
      assert.equal(expiredLine.reservedRemaining, 0);
    });

    // CMS active-stock guarding is not covered here because its authorization path requires Next request auth context.
  } finally {
    try {
      if (databaseConnected) {
        await prisma.order.deleteMany({ where: { idempotencyKey: { startsWith: prefix } } });
        for (const categoryId of fixtures) {
          await prisma.product.deleteMany({ where: { categoryId } });
          await prisma.category.delete({ where: { id: categoryId } });
        }
      }
    } finally {
      await prisma.$disconnect();
    }
  }
});
