import { z } from 'zod';
import { isLocalImagePath } from '@/lib/media-path';
import type { BlogInput } from './types';

const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
export function safeBlogLink(value: string): boolean {
  if (!value || value.length > 2048 || /[<>"'\\\s]/.test(value)) return false;
  if (value.startsWith('/')) return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !value.split('/').includes('..');
  try { const url = new URL(value); return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password; } catch { return false; }
}
const inlineText = z.string().trim().max(10_000).refine((v) => !/<\/?[a-z!][^>]*>/i.test(v), 'Raw HTML is not supported.').refine((v) => {
  for (const match of v.matchAll(linkPattern)) if (!safeBlogLink(match[1] ?? '')) return false;
  return !/\[[^\]]+\]\([^)]*$/.test(v);
}, 'Use supported HTTPS or local links.');
const blockSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.enum(['paragraph', 'heading', 'quote', 'bulletList', 'orderedList', 'image', 'product']),
  text: inlineText,
  level: z.union([z.literal(2), z.literal(3)]).optional(),
  url: z.string().trim().max(2048).optional(),
  alt: z.string().trim().max(300).optional(),
  caption: inlineText.optional(),
  productSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120).optional(),
}).strict().superRefine((block, ctx) => {
  if (['paragraph', 'heading', 'quote', 'bulletList', 'orderedList'].includes(block.type) && !block.text.trim())
    ctx.addIssue({ code: 'custom', path: ['text'], message: 'This content block needs text.' });
  if (block.type === 'heading' && !block.level) ctx.addIssue({code:'custom',path:['level'],message:'Headings require level 2 or 3.'});
  if (block.type === 'image') {
    if (!block.url || !isLocalImagePath(block.url)) ctx.addIssue({code:'custom',path:['url'],message:'Choose a local image path.'});
    if (!block.alt?.trim()) ctx.addIssue({code:'custom',path:['alt'],message:'Images require descriptive alt text.'});
  } else if (block.url !== undefined) ctx.addIssue({code:'custom',path:['url'],message:'Only image blocks may have a media URL.'});
  if (block.type === 'product' && !block.productSlug) ctx.addIssue({code:'custom',path:['productSlug'],message:'Product blocks require a product slug.'});
  if (block.type !== 'product' && block.productSlug !== undefined) ctx.addIssue({code:'custom',path:['productSlug'],message:'Only product blocks may have a product slug.'});
});
const translationSchema = z.object({
  title: z.string().trim().min(1).max(180), excerpt: z.string().trim().min(1).max(600), blocks: z.array(blockSchema).max(100),
  seoTitle: z.string().trim().max(180), seoDescription: z.string().trim().max(320),
}).strict();
export const blogInputSchema = z.object({
  id: z.string().trim().min(1).max(100).optional(), slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: z.enum(['DRAFT','PUBLISHED','ARCHIVED']), coverImage: z.string().trim().max(2048).refine((value) => value === '' || isLocalImagePath(value), 'Choose a local cover image.'), coverAlt: z.string().trim().max(300),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).transform((tags) => [...new Set(tags)]),
  relatedPostSlugs: z.array(z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120)).max(12).transform((slugs) => [...new Set(slugs)]).default([]),
  relatedProductSlugs: z.array(z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120)).max(12).transform((slugs) => [...new Set(slugs)]).default([]),
  translations: z.object({fa: translationSchema, ckb: translationSchema.optional()}).strict(),
}).strict().superRefine((value, ctx) => {
  if (value.relatedPostSlugs.includes(value.slug)) ctx.addIssue({ code: 'custom', path: ['relatedPostSlugs'], message: 'A post cannot be related to itself.' });
  for (const [locale, translation] of Object.entries(value.translations)) {
    if (!translation) continue;
    if (new Set(translation.blocks.map((block) => block.id)).size !== translation.blocks.length)
      ctx.addIssue({ code: 'custom', path: ['translations', locale, 'blocks'], message: 'Block IDs must be unique within a translation.' });
  }
  if (value.coverImage && !value.coverAlt.trim()) ctx.addIssue({code:'custom',path:['coverAlt'],message:'Cover images need descriptive alt text.'});
  if (value.status === 'PUBLISHED') {
    if (!value.translations.fa.blocks.some((block) => block.text.trim())) ctx.addIssue({code:'custom',path:['translations','fa','blocks'],message:'Published posts need meaningful content.'});
  }
});
export type ParsedBlogInput = BlogInput;
