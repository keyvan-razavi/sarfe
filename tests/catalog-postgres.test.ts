import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes, randomUUID, scrypt as scryptCallback } from "node:crypto";
import test from "node:test";
import { loadEnvConfig } from "@next/env";

// Next's request-context modules read this global while they initialize. Set it
// before any dynamically loaded service can import those modules.
Object.assign(globalThis, { AsyncLocalStorage });

const postgresOptIn = process.env.SARFE_TEST_POSTGRES === "1";
if (postgresOptIn) loadEnvConfig(process.cwd());

const databaseName = (value: string) => new URL(value).pathname.replace(/^\//, "");

function deriveTestPasswordKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, 64, {
      N: 32_768,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    }, (error, key) => error ? reject(error) : resolve(key));
  });
}

async function inNextActionRequest<T>(run: () => Promise<T>): Promise<T> {
  const [
    { HeadersAdapter },
    { RequestCookies, ResponseCookies },
    { workAsyncStorage },
    { workUnitAsyncStorage },
  ] = await Promise.all([
    import("next/dist/server/web/spec-extension/adapters/headers"),
    import("next/dist/server/web/spec-extension/cookies"),
    import("next/dist/server/app-render/work-async-storage.external"),
    import("next/dist/server/app-render/work-unit-async-storage.external"),
  ]);
  const incomingHeaders = new Headers({
    host: "localhost:3000",
    origin: "http://localhost:3000",
  });
  const requestCookies = new RequestCookies(incomingHeaders);
  const responseCookies = new ResponseCookies(new Headers());
  const workStore = {
    route: "/admin",
    page: "/admin/page",
    forceStatic: false,
    dynamicShouldError: false,
  };
  const workUnitStore = {
    type: "request",
    phase: "action",
    implicitTags: [],
    url: { pathname: "/admin", search: "" },
    headers: HeadersAdapter.seal(incomingHeaders),
    cookies: requestCookies,
    mutableCookies: responseCookies,
    userspaceMutableCookies: responseCookies,
    draftMode: {},
    rootParams: {},
    resumeDataCache: null,
  };

  return workAsyncStorage.run(workStore as never, () =>
    workUnitAsyncStorage.run(workUnitStore as never, run),
  );
}

test(
  "catalog CMS services enforce owner authorization and persist changes in PostgreSQL",
  { skip: !postgresOptIn },
  async (t) => {
    const testDatabaseUrl = process.env.TEST_DATABASE_URL;
    if (!testDatabaseUrl) {
      throw new Error("Set TEST_DATABASE_URL to a dedicated PostgreSQL database ending in _test.");
    }
    const parsedTestUrl = new URL(testDatabaseUrl);
    if (!["postgres:", "postgresql:"].includes(parsedTestUrl.protocol)) {
      throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
    }
    const testName = databaseName(testDatabaseUrl);
    if (!testName.endsWith("_test")) {
      throw new Error("TEST_DATABASE_URL must point to a dedicated database ending in _test.");
    }
    const configuredDatabaseUrl = process.env.DATABASE_URL;
    if (configuredDatabaseUrl && databaseName(configuredDatabaseUrl) === testName) {
      throw new Error("TEST_DATABASE_URL must use a database name distinct from DATABASE_URL.");
    }

    process.env.DATABASE_URL = testDatabaseUrl;
    const ownerEmail = "catalog-integration-owner@example.test";
    const ownerPassword = `test-${randomUUID()}`;
    const salt = randomBytes(16);
    const passwordKey = await deriveTestPasswordKey(ownerPassword, salt);
    process.env.ADMIN_EMAIL = ownerEmail;
    process.env.ADMIN_PASSWORD_HASH = `scrypt$32768$8$1$${salt.toString("hex")}$${passwordKey.toString("hex")}`;
    process.env.SESSION_SECRET = randomBytes(32).toString("hex");

    const [{ prisma }, identity, catalogAdmin, catalog, orders, homeContentAdmin, homeContent] = await Promise.all([
      import("../src/lib/db"),
      import("../src/modules/identity"),
      import("../src/modules/catalog/admin"),
      import("../src/modules/catalog"),
      import("../src/modules/orders"),
      import("../src/modules/home-content/admin"),
      import("../src/modules/home-content"),
    ]);
    const prefix = `cms-it-${randomUUID().replaceAll("-", "")}`;
    const categorySlug = `${prefix}-category`;
    const productSlug = `${prefix}-product`;
    const duplicateSkuProductSlug = `${prefix}-duplicate-sku`;
    const invalidAttributeProductSlug = `${prefix}-invalid-attribute`;
    const inactiveBrandProductSlug = `${prefix}-inactive-brand-product`;
    const skuOne = `${prefix}-SKU-1`.toUpperCase();
    const skuTwo = `${prefix}-SKU-2`.toUpperCase();
    const categoryAttributes = [
      {
        key: "package_size",
        label: "Package size",
        type: "select",
        required: true,
        options: ["1kg", "2kg"],
      },
    ];

    function productInput(overrides: Record<string, unknown> = {}) {
      return {
        categoryId: "",
        slug: productSlug,
        name: "CMS integration product",
        description: "Temporary PostgreSQL CMS integration fixture.",
        translations: { fa: { name: "محصول آزمایشی" }, ckb: { name: "بەرهەمی تاقیکردنەوە" } },
        status: "DRAFT",
        attributes: {},
        variants: [
          { sku: skuOne, name: "1 kg", priceMinor: 125_000, currency: "IRR", stock: 8, attributes: { package_size: "1kg" } },
          { sku: skuTwo, name: "2 kg", priceMinor: 240_000, currency: "IRR", stock: 5, attributes: { package_size: "2kg" } },
        ],
        ...overrides,
      };
    }

    let databaseConnected = false;
    try {
      await prisma.$connect();
      databaseConnected = true;
      await inNextActionRequest(async () => {
        const pageContent = {
          fa: { heroTitle: "عنوان آزمون", heroBody: "متن آزمون", ctaLabel: "کاتالوگ", heroImage: "/images/grocery/hero.webp", heroImageAlt: "قفسهٔ فروشگاه", healthTitle: "عنوان سلامت", healthBody: "متن سلامت", cultureTitle: "عنوان فرهنگ", cultureBody: "متن فرهنگ", aboutTitle: "درباره", aboutBody: "معرفی فروشگاه", aboutImage: "/images/grocery/rice.webp", aboutImageAlt: "برنج" },
          ckb: { heroTitle: "ناونیشان", heroBody: "دەقی تاقیکردنەوە", ctaLabel: "کاتالۆگ", heroImage: "/images/grocery/hero.webp", heroImageAlt: "ڕەفی فرۆشگا", healthTitle: "ناونیشانی تەندروستی", healthBody: "دەقی تەندروستی", cultureTitle: "ناونیشانی کەلتوور", cultureBody: "دەقی کەلتوور", aboutTitle: "دەربارە", aboutBody: "ناساندنی فرۆشگا", aboutImage: "/images/grocery/rice.webp", aboutImageAlt: "برنج" },
        };
        await assert.rejects(
          catalogAdmin.saveCategory({ name: "Signed out", slug: `${prefix}-signed-out`, attributes: [] }),
          /Sign in to manage the catalog/,
        );
        await assert.rejects(homeContentAdmin.saveHomePageContent(pageContent), /Sign in to manage the catalog/);

        assert.equal(await identity.loginOwner(ownerEmail, ownerPassword), true);

        await homeContentAdmin.saveHomePageContent(pageContent);
        const savedHomePage = await prisma.homePageContent.findUniqueOrThrow({ where: { id: "home" } });
        assert.deepEqual(savedHomePage.translations, pageContent);
        assert.deepEqual((await homeContent.getHomePageContent()).content, pageContent);
        await assert.rejects(
          homeContentAdmin.saveHomePageContent({ ...pageContent, fa: { ...pageContent.fa, heroImage: "https://example.test/hero.png" } }),
          /local image/i,
        );

        const categoryId = await catalogAdmin.saveCategory({
          name: "CMS integration category",
          slug: categorySlug,
          description: "Temporary category used by the PostgreSQL CMS test.",
          attributes: categoryAttributes,
        });
        const createdProductId = await catalogAdmin.saveProduct(
          productInput({ categoryId }),
        );
        const archivedBrandId = await catalogAdmin.saveBrand({
          name: "Archived integration brand",
          slug: `${prefix}-archived-brand`,
          translations: { fa: { name: "برند بایگانی‌شده" }, ckb: { name: "براندی ئەرشیفکراو" } },
        });
        await catalogAdmin.archiveBrand(archivedBrandId);

        await t.test("products cannot be assigned an archived brand", async () => {
          await assert.rejects(
            catalogAdmin.saveProduct(
              productInput({
                categoryId,
                brandId: archivedBrandId,
                slug: inactiveBrandProductSlug,
              }),
            ),
            /active brand/i,
          );
          assert.equal(
            await prisma.product.count({ where: { slug: inactiveBrandProductSlug } }),
            0,
          );
        });

        await t.test("draft products stay hidden until published", async () => {
          const hidden = await catalog.getProductBySlug(productSlug);
          assert.equal(hidden.mode, "database");
          assert.equal(hidden.product, null);
        });

        await t.test("invalid configuration and duplicate SKU writes roll back", async () => {
          await assert.rejects(
            catalogAdmin.saveProduct(
              productInput({
                categoryId,
                slug: invalidAttributeProductSlug,
                variants: [
                  { sku: `${prefix}-BAD-SKU`.toUpperCase(), name: "Invalid size", priceMinor: 1000, currency: "IRR", stock: 1, attributes: { package_size: "3kg" } },
                ],
              }),
            ),
            /configured options/,
          );
          assert.equal(
            await prisma.product.count({ where: { slug: invalidAttributeProductSlug } }),
            0,
          );

          const duplicateSkuInput = productInput({
            categoryId,
            slug: duplicateSkuProductSlug,
            variants: [
              { sku: skuOne, name: "Duplicate SKU", priceMinor: 1000, currency: "IRR", stock: 1, attributes: { package_size: "1kg" } },
            ],
          });
          await assert.rejects(catalogAdmin.saveProduct(duplicateSkuInput), /SKU.*already in use/);
          assert.equal(
            await prisma.product.count({ where: { slug: duplicateSkuProductSlug } }),
            0,
          );

          await assert.rejects(
            catalogAdmin.saveCategory({
              id: categoryId,
              name: "Rejected category edit",
              slug: categorySlug,
              description: "This edit must not persist.",
              attributes: [{ ...categoryAttributes[0]!, options: ["3kg"] }],
            }),
            /configured options/,
          );
          const unchangedCategory = await prisma.category.findUniqueOrThrow({
            where: { id: categoryId },
            include: { attributes: true },
          });
          assert.equal(unchangedCategory.name, "CMS integration category");
          assert.deepEqual(unchangedCategory.attributes[0]?.options, ["1kg", "2kg"]);
        });

        await t.test("category and product edits persist with stable variant IDs and publish publicly", async () => {
          const initialVariants = await prisma.variant.findMany({
            where: { productId: createdProductId },
            select: { id: true, sku: true, name: true, priceMinor: true, currency: true, stock: true, attributes: true },
            orderBy: { sku: "asc" },
          });
          assert.equal(initialVariants.length, 2);

          const editedCategoryId = await catalogAdmin.saveCategory({
            id: categoryId,
            name: "Edited CMS integration category",
            slug: categorySlug,
            description: "Category edit persisted.",
            attributes: categoryAttributes,
          });
          assert.equal(editedCategoryId, categoryId);

          const editedProductId = await catalogAdmin.saveProduct(
            productInput({
              id: createdProductId,
              categoryId,
              name: "Edited CMS integration product",
              status: "PUBLISHED",
              variants: initialVariants.map((variant) => ({
                ...variant,
                name: `${variant.name} edited`,
                priceMinor: variant.priceMinor + 1000,
                stock: variant.stock,
              })),
            }),
          );
          assert.equal(editedProductId, createdProductId);

          const savedVariants = await prisma.variant.findMany({
            where: { productId: createdProductId },
            select: { id: true, sku: true, name: true, priceMinor: true },
            orderBy: { sku: "asc" },
          });
          assert.deepEqual(savedVariants.map((variant) => variant.id), initialVariants.map((variant) => variant.id));
          assert.ok(savedVariants.every((variant) => variant.name.endsWith("edited")));

          const visible = await catalog.getProductBySlug(productSlug);
          assert.equal(visible.mode, "database");
          assert.equal(visible.product?.id, createdProductId);
          assert.equal(visible.product?.name, "Edited CMS integration product");
          assert.deepEqual(
            new Set(visible.product?.variants.map((variant) => variant.id)),
            new Set(initialVariants.map((variant) => variant.id)),
          );

          const reservedVariant = initialVariants[0]!;
          const reservationKey = `${prefix}-active-reservation`;
          const reservation = await orders.createReservedOrder(
            {
              idempotencyKey: reservationKey,
              customer: { name: "Integration buyer", email: "buyer@example.test", phone: "+1 555 0100" },
              address: { countryCode: "US", region: "CA", locality: "Oakland", postalCode: "94612", line1: "1 Test Street" },
              items: [{ variantId: reservedVariant.id, quantity: 1 }],
            },
            {
              id: "catalog-integration-shipping-v1",
              quote: ({ currency }) => ({ currency, shippingMinor: 0, shippingPolicy: "free-v1", taxMinor: 0, taxPolicy: "none-v1" }),
            },
          );
          let reservationReleased = false;
          try {
            await assert.rejects(
              catalogAdmin.saveProduct(
                productInput({
                  id: createdProductId,
                  categoryId,
                  name: "Edited CMS integration product",
                  status: "PUBLISHED",
                  variants: initialVariants.map((variant) => ({
                    ...variant,
                    stock: variant.id === reservedVariant.id ? variant.stock + 1 : variant.stock,
                  })),
                }),
              ),
              /Stock cannot be changed while this variant has an active reservation/,
            );
            await assert.rejects(
              catalogAdmin.saveProduct(
                productInput({
                  id: createdProductId,
                  categoryId,
                  name: "Edited CMS integration product",
                  status: "PUBLISHED",
                  variants: initialVariants
                    .filter((variant) => variant.id !== reservedVariant.id)
                    .map((variant) => ({ ...variant })),
                }),
              ),
              /A variant with an active reservation cannot be removed/,
            );

            const activeVariantAfterRejections = await prisma.variant.findUniqueOrThrow({
              where: { id: reservedVariant.id },
              select: { stock: true },
            });
            assert.equal(activeVariantAfterRejections.stock, reservedVariant.stock - 1);
            assert.equal(
              await prisma.order.count({ where: { id: reservation.id, status: "RESERVED" } }),
              1,
            );

            assert.equal(await orders.releaseOrder(reservation.id, "CANCELED"), true);
            reservationReleased = true;
            const releasedVariant = await prisma.variant.findUniqueOrThrow({
              where: { id: reservedVariant.id },
              select: { stock: true },
            });
            assert.equal(releasedVariant.stock, reservedVariant.stock);
          } finally {
            if (!reservationReleased) await orders.releaseOrder(reservation.id, "CANCELED");
          }
        });
      });
    } finally {
      try {
        if (databaseConnected) {
          await prisma.order.deleteMany({ where: { idempotencyKey: { startsWith: prefix } } });
          await prisma.product.deleteMany({ where: { slug: { startsWith: prefix } } });
          await prisma.brand.deleteMany({ where: { slug: { startsWith: prefix } } });
          await prisma.category.deleteMany({ where: { slug: { startsWith: prefix } } });
        }
      } finally {
        await prisma.$disconnect();
      }
    }
  },
);
