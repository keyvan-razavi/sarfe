import { z } from 'zod';
import { isSupportedCurrency } from '@/lib/currency';
import { isLocalImagePath, safeLocalImagePaths } from '@/lib/media-path';

const slug = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens.');
/** Catalog image paths are local assets or generated paths served by our media route. */
export function isLocalCatalogImagePath(value: unknown): value is string {
  return isLocalImagePath(value);
}

/** Drop legacy or malformed database image values from any rendered/UI-facing result. */
export function safeCatalogImagePaths(values: unknown): string[] {
  return safeLocalImagePaths(values);
}

const imageSource = z.string().trim().refine((value) => {
  return isLocalCatalogImagePath(value);
}, 'Choose an image from this store. External image URLs are not supported.');
const jsonObject = z.record(z.string(), z.unknown());
const translationSchema = z.object({
  fa: z.object({ name: z.string().trim().max(160).optional(), description: z.string().trim().max(10_000).optional() }).optional(),
  ckb: z.object({ name: z.string().trim().max(160).optional(), description: z.string().trim().max(10_000).optional() }).optional(),
}).optional();
const brandTranslationSchema = z.object({
  fa: z.object({ name: z.string().trim().min(1).max(160) }).optional(),
  ckb: z.object({ name: z.string().trim().min(1).max(160) }).optional(),
}).optional();
export const brandInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(160),
  slug,
  description: z.string().trim().max(1000).nullable().optional(),
  translations: brandTranslationSchema,
  active: z.boolean().default(true),
});
const attributeDefinitionSchema = z.object({
  key: z.string().trim().min(1).max(64).regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().trim().min(1).max(80),
  type: z.enum(['text', 'number', 'boolean', 'select']),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
}).superRefine((value, ctx) => {
  if (value.type === 'select' && value.options.length < 1) ctx.addIssue({ code: 'custom', path: ['options'], message: 'Select attributes need at least one option.' });
  if (value.type !== 'select' && value.options.length) ctx.addIssue({ code: 'custom', path: ['options'], message: 'Only select attributes can have options.' });
  if (new Set(value.options).size !== value.options.length) ctx.addIssue({ code: 'custom', path: ['options'], message: 'Options must be unique.' });
});
export const categoryInputSchema = z.object({
  id: z.string().optional(), name: z.string().trim().min(2).max(100), slug, description: z.string().trim().max(500).nullable().optional(), translations: translationSchema,
  parentId: z.string().nullable().optional(), attributes: z.array(attributeDefinitionSchema).max(40).default([]),
}).superRefine((value, ctx) => {
  if (new Set(value.attributes.map((a) => a.key)).size !== value.attributes.length) ctx.addIssue({ code: 'custom', path: ['attributes'], message: 'Attribute keys must be unique.' });
});
const variantSchema = z.object({
  id: z.string().optional(), sku: z.string().trim().min(2).max(80), name: z.string().trim().min(1).max(100),
  priceMinor: z.number().int().nonnegative().max(2_000_000_000), currency: z.string().trim().length(3).transform((v) => v.toUpperCase()).refine(isSupportedCurrency, 'Use a valid ISO 4217 currency code.'),
  stock: z.number().int().nonnegative().max(2_000_000_000), attributes: jsonObject.default({}),
});
export const productInputSchema = z.object({
  id: z.string().optional(), brandId: z.string().min(1).nullable().optional(), categoryId: z.string().min(1), slug, name: z.string().trim().min(2).max(160), translations: translationSchema,
  description: z.string().trim().min(1).max(10_000), image: imageSource.nullable().optional(), images: z.array(imageSource).max(20).default([]),
  featured: z.boolean().default(false), status: z.enum(['DRAFT', 'PUBLISHED']), attributes: jsonObject.default({}), variants: z.array(variantSchema).min(1).max(100),
}).superRefine((value, ctx) => {
  const skus = value.variants.map((v) => v.sku.toLowerCase());
  if (new Set(skus).size !== skus.length) ctx.addIssue({ code: 'custom', path: ['variants'], message: 'Variant SKUs must be unique.' });
  if (new Set(value.variants.map((v) => v.currency)).size !== 1) ctx.addIssue({ code: 'custom', path: ['variants'], message: 'All variants in one product must use the same currency.' });
  const ids = value.variants.flatMap((v) => v.id ? [v.id] : []);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: ['variants'], message: 'Variant IDs must be unique.' });
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type BrandInput = z.infer<typeof brandInputSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;

export type SupportedImageType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Check image content signatures so the upload endpoint does not trust the browser's MIME claim. */
export function isSupportedImagePayload(bytes: Uint8Array, declaredType: string): declaredType is SupportedImageType {
  if (declaredType === 'image/jpeg')
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (declaredType === 'image/png')
    return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (declaredType === 'image/webp')
    return bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return false;
}

export async function assertCategoryHierarchy(categoryId: string, parentId: string | null, getParentId: (id: string) => Promise<string | null | undefined>): Promise<void> {
  let cursor = parentId;
  const visited = new Set<string>();
  while (cursor) {
    if (cursor === categoryId) throw new Error('A category cannot be its own parent or one of its descendants.');
    if (visited.has(cursor)) throw new Error('The selected parent is already part of a category cycle.');
    visited.add(cursor);
    const parent = await getParentId(cursor);
    if (parent === undefined) throw new Error('The selected parent category no longer exists.');
    cursor = parent;
  }
}
export function validateAttributeValues(definitions: Array<{key: string; label: string; type: string; required: boolean; options?: unknown}>, raw: unknown): { success: true; data: Record<string, string | number | boolean> } | { success: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { success: false, error: 'Attributes must be a JSON object.' };
  const values = raw as Record<string, unknown>;
  const allowedKeys = new Set(definitions.map((definition) => definition.key));
  for (const key of Object.keys(values)) if (!allowedKeys.has(key)) return { success: false, error: `Unknown attribute: ${key}.` };
  const output: Record<string, string | number | boolean> = {};
  for (const definition of definitions) {
    const value = values[definition.key];
    if (value === undefined || value === null || value === '') {
      if (definition.required) return { success: false, error: `${definition.label} is required.` };
      continue;
    }
    if (definition.type === 'text' && typeof value !== 'string') return { success: false, error: `${definition.label} must be text.` };
    if (definition.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) return { success: false, error: `${definition.label} must be a finite number.` };
    if (definition.type === 'boolean' && typeof value !== 'boolean') return { success: false, error: `${definition.label} must be true or false.` };
    if (definition.type === 'select') {
      const options = Array.isArray(definition.options) ? definition.options : [];
      if (typeof value !== 'string' || !options.includes(value)) return { success: false, error: `${definition.label} must match one of its configured options.` };
    }
    output[definition.key] = value as string | number | boolean;
  }
  return { success: true, data: output };
}
