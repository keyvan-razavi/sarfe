import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  assertCategoryHierarchy,
  categoryInputSchema,
  brandInputSchema,
  productInputSchema,
  safeCatalogImagePaths,
  validateAttributeValues,
  type CategoryInput,
  type BrandInput,
  type ProductInput,
} from "./validation";
import { requireOwner } from "@/modules/identity";

export async function listManageableCatalog() {
  await requireOwner();
  if (!process.env.DATABASE_URL)
    return { mode: "preview" as const, categories: [], products: [] };
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      include: { attributes: { orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      include: { category: true, brand: true, variants: { orderBy: { name: "asc" } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  // Legacy database rows may still contain remote URLs. Never pass those
  // through to CMS previews; keep persisted rows untouched until an editor saves.
  return {
    mode: "database" as const,
    categories,
    products: products.map((product) => ({
      ...product,
      images: safeCatalogImagePaths(product.images),
    })),
  };
}
export async function listManageableBrands() {
  await requireOwner();
  if (!process.env.DATABASE_URL)
    return { mode: "preview" as const, brands: [] };
  const brands = await prisma.brand.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return { mode: "database" as const, brands };
}
function checkAttributes(
  definitions: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
    options?: unknown;
  }>,
  values: Record<string, unknown>,
  label: string,
) {
  const result = validateAttributeValues(definitions, values);
  if (!result.success) throw new Error(`${label}: ${result.error}`);
  return result.data;
}
function combined(
  product: Record<string, unknown>,
  variant: Record<string, unknown>,
) {
  return { ...product, ...variant };
}
export async function saveCategory(raw: unknown): Promise<string> {
  await requireOwner();
  if (!process.env.DATABASE_URL)
    throw new Error(
      "Catalog management is unavailable in preview mode. Configure PostgreSQL first.",
    );
  const input: CategoryInput = categoryInputSchema.parse(raw);
  try {
    return await prisma.$transaction(
      async (tx) => {
        const id = input.id;
        if (id) {
          const current = await tx.category.findUnique({
            where: { id },
            include: { products: { include: { variants: true } } },
          });
          if (!current) throw new Error("This category no longer exists.");
          await assertCategoryHierarchy(
            id,
            input.parentId ?? null,
            async (parentId) =>
              (
                await tx.category.findUnique({
                  where: { id: parentId },
                  select: { parentId: true },
                })
              )?.parentId,
          );
          const definitions = input.attributes;
          for (const product of current.products) {
            for (const variant of product.variants)
              checkAttributes(
                definitions,
                combined(
                  product.attributes as Record<string, unknown>,
                  variant.attributes as Record<string, unknown>,
                ),
                `Variant “${variant.name}”`,
              );
          }
          await tx.category.update({
            where: { id },
            data: {
              name: input.name,
              slug: input.slug,
              description: input.description ?? null,
              translations: input.translations
                ? (input.translations as Prisma.InputJsonValue)
                : Prisma.JsonNull,
              parentId: input.parentId ?? null,
            },
          });
          await tx.attributeDefinition.deleteMany({
            where: { categoryId: id },
          });
          if (definitions.length)
            await tx.attributeDefinition.createMany({
              data: definitions.map((attribute, sortOrder) => ({
                ...attribute,
                options: attribute.options.length
                  ? attribute.options
                  : Prisma.JsonNull,
                categoryId: id,
                sortOrder,
              })),
            });
          return id;
        }
        if (
          input.parentId &&
          !(await tx.category.findUnique({ where: { id: input.parentId } }))
        )
          throw new Error("The selected parent category no longer exists.");
        const category = await tx.category.create({
          data: {
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
            translations: input.translations
              ? (input.translations as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            parentId: input.parentId ?? null,
          },
        });
        if (input.attributes.length)
          await tx.attributeDefinition.createMany({
            data: input.attributes.map((attribute, sortOrder) => ({
              ...attribute,
              options: attribute.options.length
                ? attribute.options
                : Prisma.JsonNull,
              categoryId: category.id,
              sortOrder,
            })),
          });
        return category.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new Error("That category slug is already in use.");
    throw error;
  }
}
export async function saveBrand(raw: unknown): Promise<string> {
  await requireOwner();
  if (!process.env.DATABASE_URL)
    throw new Error(
      "Catalog management is unavailable in preview mode. Configure PostgreSQL first.",
    );
  const input: BrandInput = brandInputSchema.parse(raw);
  const data = {
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    translations: input.translations
      ? (input.translations as Prisma.InputJsonValue)
      : Prisma.JsonNull,
    active: input.active,
  };
  try {
    if (input.id) {
      const existing = await prisma.brand.findUnique({ where: { id: input.id }, select: { id: true } });
      if (!existing) throw new Error("This brand no longer exists.");
      await prisma.brand.update({ where: { id: input.id }, data });
      return input.id;
    }
    const brand = await prisma.brand.create({ data });
    return brand.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new Error("That brand slug is already in use.");
    throw error;
  }
}
export async function archiveBrand(id: string): Promise<void> {
  await requireOwner();
  if (!process.env.DATABASE_URL)
    throw new Error(
      "Catalog management is unavailable in preview mode. Configure PostgreSQL first.",
    );
  const validId = z.string().min(1).parse(id);
  const existing = await prisma.brand.findUnique({ where: { id: validId }, select: { id: true } });
  if (!existing) throw new Error("This brand no longer exists.");
  await prisma.brand.update({ where: { id: validId }, data: { active: false } });
}
export async function saveProduct(raw: unknown): Promise<string> {
  await requireOwner();
  if (!process.env.DATABASE_URL)
    throw new Error(
      "Catalog management is unavailable in preview mode. Configure PostgreSQL first.",
    );
  const input: ProductInput = productInputSchema.parse(raw);
  const images = [
    ...new Set([...(input.image ? [input.image] : []), ...input.images]),
  ];
  try {
    return await prisma.$transaction(
      async (tx) => {
        const category = await tx.category.findUnique({
          where: { id: input.categoryId },
          include: { attributes: { orderBy: { sortOrder: "asc" } } },
        });
        if (!category) throw new Error("Choose an existing category.");
        if (input.brandId) {
          const brand = await tx.brand.findUnique({
            where: { id: input.brandId },
            select: { id: true, active: true },
          });
          if (!brand?.active) throw new Error("Choose an active brand.");
        }
        const definitions = category.attributes;
        const partialDefinitions = definitions.map((definition) => ({
          ...definition,
          required: false,
        }));
        checkAttributes(
          partialDefinitions,
          input.attributes,
          "Product attributes",
        );
        for (const variant of input.variants)
          checkAttributes(
            definitions,
            combined(input.attributes, variant.attributes),
            `Variant “${variant.name}”`,
          );

        const productData = {
          brandId: input.brandId ?? null,
          categoryId: input.categoryId,
          slug: input.slug,
          name: input.name,
          description: input.description,
          translations: input.translations
            ? (input.translations as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          attributes: input.attributes as Prisma.InputJsonValue,
          images,
          featured: input.featured,
          status: input.status,
        };
        let productId: string;
        let existingVariantIds = new Set<string>();
        if (input.id) {
          const existing = await tx.product.findUnique({
            where: { id: input.id },
            include: { variants: { select: { id: true } } },
          });
          if (!existing) throw new Error("This product no longer exists.");
          existingVariantIds = new Set(
            existing.variants.map((variant) => variant.id),
          );
          await tx.product.update({
            where: { id: input.id },
            data: productData,
          });
          productId = input.id;
        } else {
          const created = await tx.product.create({ data: productData });
          productId = created.id;
        }
        const retainedIds = new Set(
          input.variants.flatMap((variant) => (variant.id ? [variant.id] : [])),
        );
        for (const variant of input.variants) {
          const data = {
            sku: variant.sku,
            name: variant.name,
            priceMinor: variant.priceMinor,
            currency: variant.currency,
            stock: variant.stock,
            attributes: variant.attributes as Prisma.InputJsonValue,
          };
          if (variant.id) {
            if (!existingVariantIds.has(variant.id))
              throw new Error(
                "A submitted variant does not belong to this product.",
              );
            const currentVariant = await tx.variant.findUnique({ where: { id: variant.id }, select: { stock: true } });
            if (currentVariant && currentVariant.stock !== variant.stock) {
              const activeReservation = await tx.orderLine.findFirst({ where: { variantId: variant.id, order: { status: "RESERVED" } }, select: { id: true } });
              if (activeReservation) throw new Error("Stock cannot be changed while this variant has an active reservation.");
            }
            await tx.variant.update({ where: { id: variant.id }, data });
          } else await tx.variant.create({ data: { ...data, productId } });
        }
        const removedIds = [...existingVariantIds].filter(
          (id) => !retainedIds.has(id),
        );
        if (removedIds.length) {
          const activeReservation = await tx.orderLine.findFirst({ where: { variantId: { in: removedIds }, order: { status: "RESERVED" } }, select: { id: true } });
          if (activeReservation) throw new Error("A variant with an active reservation cannot be removed.");
          await tx.variant.deleteMany({
            where: { productId, id: { in: removedIds } },
          });
        }
        return productId;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new Error("That product slug or variant SKU is already in use.");
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    )
      throw new Error("Choose an existing category.");
    throw error;
  }
}

export { brandInputSchema, categoryInputSchema, productInputSchema };
