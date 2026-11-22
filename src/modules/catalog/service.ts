import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { categoryTranslations, previewCategories, previewProducts, productTranslations } from './fixtures';
import type { AttributeDefinition, BrandResult, BrandSummary, CatalogResult, CategoryResult, CategorySummary, ProductDetail, ProductResult } from './types';
import { safeCatalogImagePaths } from './validation';

/** Transaction-scoped catalog read used by the orders domain to price orders from published inventory. */
export async function loadOrderableVariants(tx: Prisma.TransactionClient, variantIds: string[]) {
  return tx.variant.findMany({
    where: { id: { in: variantIds }, product: { status: 'PUBLISHED' } },
    select: { id: true, sku: true, name: true, priceMinor: true, currency: true, stock: true, product: { select: { name: true, status: true } } },
  });
}

/** Reserve available stock inside the caller's transaction; catalog owns inventory writes. */
export async function reservePublishedVariantStock(tx: Prisma.TransactionClient, variantId: string, quantity: number): Promise<boolean> {
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Reservation quantity must be a positive safe integer.');
  const result = await tx.variant.updateMany({
    where: { id: variantId, product: { status: 'PUBLISHED' }, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });
  return result.count === 1;
}

/** Restore stock to an extant variant inside the caller's transaction. */
export async function restoreVariantStock(tx: Prisma.TransactionClient, variantId: string, quantity: number): Promise<void> {
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Restore quantity must be a positive safe integer.');
  const result = await tx.variant.updateMany({ where: { id: variantId }, data: { stock: { increment: quantity } } });
  if (result.count !== 1) throw new Error(`Cannot restore stock: variant ${variantId} no longer exists.`);
}

const configured = () => Boolean(process.env.DATABASE_URL);
const asRecord = (value: unknown): Record<string, string | number | boolean> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, string | number | boolean> : {};
const mapCategory = (category: {id: string; name: string; slug: string; description: string | null; parentId: string | null; translations?: unknown}): CategorySummary => ({ id: category.id, name: category.name, slug: category.slug, description: category.description, parentId: category.parentId, translations: category.translations as CategorySummary['translations'] });
const mapBrand = (brand: {id: string; name: string; slug: string; description: string | null; translations?: unknown}): BrandSummary => ({ id: brand.id, name: brand.name, slug: brand.slug, description: brand.description, translations: brand.translations as BrandSummary['translations'] });
const mapDefinitions = (items: Array<{id: string; key: string; label: string; type: string; required: boolean; options: unknown}>): AttributeDefinition[] => items.map((item) => ({ id: item.id, key: item.key, label: item.label, type: item.type as AttributeDefinition['type'], required: item.required, options: Array.isArray(item.options) ? item.options.filter((option): option is string => typeof option === 'string') : [] }));
function toProduct(row: {id: string; slug: string; name: string; description: string; translations?: unknown; images: string[]; featured: boolean; attributes: unknown; brand?: {id: string; name: string; slug: string; description: string | null; translations?: unknown; active: boolean} | null; category: {id: string; name: string; slug: string; description: string | null; parentId: string | null; translations?: unknown; attributes?: Array<{id: string; key: string; label: string; type: string; required: boolean; options: unknown}>}; variants: Array<{id: string; sku: string; name: string; priceMinor: number; currency: string; stock: number; attributes: unknown}>}): ProductDetail {
  const sortedVariants = [...row.variants].sort((a, b) => a.priceMinor - b.priceMinor || a.name.localeCompare(b.name));
  const cheapest = sortedVariants[0];
  const images = safeCatalogImagePaths(row.images);
  return { id: row.id, slug: row.slug, name: row.name, description: row.description, translations: row.translations as ProductDetail['translations'], category: mapCategory(row.category), brand: row.brand?.active ? mapBrand(row.brand) : null, priceMinor: cheapest?.priceMinor ?? 0, currency: cheapest?.currency ?? 'USD', image: images[0] ?? null, images, featured: row.featured, attributes: asRecord(row.attributes), attributeDefinitions: mapDefinitions(row.category.attributes ?? []), variants: sortedVariants.map((variant) => ({ ...variant, attributes: asRecord(variant.attributes) })) };
}
const previewCategoriesLocalized = previewCategories.map((category) => ({...category,translations:categoryTranslations[category.slug]}));
const previewProductsLocalized = previewProducts.map((product) => ({...product,translations:productTranslations[product.slug],category:{...product.category,translations:categoryTranslations[product.category.slug]}}));
type CategoryNode = {id: string; slug: string; parentId: string | null};
function categoryBranchIds(categories: CategoryNode[], slug: string): Set<string> {
  const selected = categories.find((category) => category.slug === slug);
  if (!selected) return new Set();
  const ids = new Set([selected.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        changed = true;
      }
    }
  }
  return ids;
}
const previewForCategory = (slug?: string) => {
  if (!slug) return previewProductsLocalized;
  const ids = categoryBranchIds(previewCategories, slug);
  return previewProductsLocalized.filter((product) => ids.has(product.category.id));
};
function categoriesWithPublishedDescendants<T extends CategoryNode>(categories: T[], publishedProductCategoryIds: Set<string>): T[] {
  return categories.filter((category) => [...categoryBranchIds(categories, category.slug)].some((id) => publishedProductCategoryIds.has(id)));
}
const containsPreviewQuery = (product: (typeof previewProductsLocalized)[number], query: string) => [product.name, product.description, productTranslations[product.slug]?.fa?.name, productTranslations[product.slug]?.fa?.description, productTranslations[product.slug]?.ckb?.name, productTranslations[product.slug]?.ckb?.description].some((value) => value?.toLocaleLowerCase().includes(query));

export async function getCatalog(filters: {category?: string; query?: string; brand?: string} = {}): Promise<CatalogResult> {
  if (!configured()) {
    const q = filters.query?.trim().toLocaleLowerCase();
    const products = previewForCategory(filters.category).filter((product) => !filters.brand && (!q || containsPreviewQuery(product, q)));
    return { products, categories: previewCategoriesLocalized, mode: 'preview' };
  }
  const query = filters.query?.trim();
  const allCategories = await prisma.category.findMany({select: {id: true, slug: true, parentId: true}});
  const categoryIds = filters.category ? [...categoryBranchIds(allCategories, filters.category)] : undefined;
  const rows = await prisma.product.findMany({ where: { status: 'PUBLISHED', ...(filters.category ? { categoryId: { in: categoryIds } } : {}), ...(filters.brand ? { brand: { slug: filters.brand, active: true } } : {}), ...(query ? { OR: [
    { name: { contains: query, mode: 'insensitive' } },
    { description: { contains: query, mode: 'insensitive' } },
    { translations: { path: ['fa', 'name'], string_contains: query, mode: 'insensitive' } },
    { translations: { path: ['fa', 'description'], string_contains: query, mode: 'insensitive' } },
    { translations: { path: ['ckb', 'name'], string_contains: query, mode: 'insensitive' } },
    { translations: { path: ['ckb', 'description'], string_contains: query, mode: 'insensitive' } },
  ] } : {}) }, include: { category: { include: { attributes: { orderBy: { sortOrder: 'asc' } } } }, brand: true, variants: true }, orderBy: [{ featured: 'desc' }, { name: 'asc' }] });
  const categories = await prisma.category.findMany({orderBy: {name: 'asc'}});
  const publishedProducts = await prisma.product.findMany({where: {status: 'PUBLISHED'}, select: {categoryId: true}});
  const visibleCategories = categoriesWithPublishedDescendants(categories, new Set(publishedProducts.map((product) => product.categoryId)));
  return { products: rows.map(toProduct), categories: visibleCategories.map(mapCategory), mode: 'database' };
}
export async function getProductBySlug(slug: string): Promise<ProductResult> {
  if (!configured()) return { product: previewProductsLocalized.find((product) => product.slug === slug) ?? null, mode: 'preview' };
  const row = await prisma.product.findFirst({ where: { slug, status: 'PUBLISHED' }, include: { category: { include: { attributes: { orderBy: { sortOrder: 'asc' } } } }, brand: true, variants: true } });
  return { product: row ? toProduct(row) : null, mode: 'database' };
}
export async function getCategories(): Promise<CategoryResult> {
  if (!configured()) return { categories: previewCategoriesLocalized, mode: 'preview' };
  const categories = await prisma.category.findMany({orderBy: {name: 'asc'}});
  const publishedProducts = await prisma.product.findMany({where: {status: 'PUBLISHED'}, select: {categoryId: true}});
  const visibleCategories = categoriesWithPublishedDescendants(categories, new Set(publishedProducts.map((product) => product.categoryId)));
  return { categories: visibleCategories.map(mapCategory), mode: 'database' };
}
/** Public active brands that have at least one published product. */
export async function getBrands(): Promise<BrandResult> {
  if (!configured()) return { brands: [], mode: 'preview' };
  const brands = await prisma.brand.findMany({
    where: { active: true, products: { some: { status: 'PUBLISHED' } } },
    select: { id: true, name: true, slug: true, description: true, translations: true },
    orderBy: { name: 'asc' },
  });
  return { brands: brands.map(mapBrand), mode: 'database' };
}
