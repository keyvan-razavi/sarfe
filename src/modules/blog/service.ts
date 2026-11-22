import 'server-only';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getProductBySlug } from '@/modules/catalog';
import { blogRepository, mapBlog } from './repository';
import { blogInputSchema } from './validation';
import type { BlogInput, BlogListResult } from './types';

const PAGE_SIZE = 12;
const configured = () => Boolean(process.env.DATABASE_URL);
const publicFiltersSchema = z.object({locale:z.enum(['fa','ckb']).optional(),search:z.string().trim().max(120).optional(),tag:z.string().trim().min(1).max(40).optional(),page:z.number().int().min(1).max(100_000).optional()}).strict();
function localized(post: ReturnType<typeof mapBlog>, locale: 'fa'|'ckb' = 'fa') {
  if (locale === 'ckb' && !post.translations.ckb) return {...post,translations:{...post.translations,ckb:post.translations.fa}};
  return post;
}
export async function getBlogPosts(filters: {locale?:'fa'|'ckb';search?:string;tag?:string;page?:number} = {}): Promise<BlogListResult> {
  const parsedFilters = publicFiltersSchema.parse(filters);
  const page = parsedFilters.page ?? 1;
  if (!configured()) return {mode:'preview',posts:[],total:0,page,pageSize:PAGE_SIZE,tags:[]};
  const search = parsedFilters.search;
  const where = {status:'PUBLISHED' as const,publishedAt:{lte:new Date()},...(parsedFilters.tag ? {tags:{has:parsedFilters.tag}} : {}),...(search ? {OR:[{slug:{contains:search,mode:'insensitive' as const}},{tags:{has:search}},{translations:{path:['fa','title'],string_contains:search,mode:'insensitive' as const}},{translations:{path:['fa','excerpt'],string_contains:search,mode:'insensitive' as const}},{translations:{path:['ckb','title'],string_contains:search,mode:'insensitive' as const}},{translations:{path:['ckb','excerpt'],string_contains:search,mode:'insensitive' as const}}]} : {})};
  const [rows,total,tagRows] = await Promise.all([blogRepository.list(where,(page-1)*PAGE_SIZE,PAGE_SIZE),blogRepository.count(where),blogRepository.tags()]);
  return {mode:'database',posts:rows.map((row)=>localized(mapBlog(row),parsedFilters.locale)),total,page,pageSize:PAGE_SIZE,tags:[...new Set(tagRows.flatMap((row)=>row.tags))].sort()};
}
export async function getBlogPostBySlug(slug:string) {
  if (!configured()) return {mode:'preview' as const,post:null};
  const row = await blogRepository.bySlug(slug);
  return {mode:'database' as const,post:row ? mapBlog(row) : null};
}
export async function getRelatedBlogPosts(slugs: string[], locale: 'fa' | 'ckb' = 'fa') {
  const requested = z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120)).max(12).parse(slugs);
  if (!configured() || !requested.length) return [];
  const rows = await prisma.blogPost.findMany({ where: { slug: { in: requested }, status: 'PUBLISHED', publishedAt: { lte: new Date() } } });
  const bySlug = new Map(rows.map((row) => [row.slug, localized(mapBlog(row), locale)]));
  return requested.flatMap((slug) => bySlug.has(slug) ? [bySlug.get(slug)!] : []);
}
export async function getBlogSitemapPosts(): Promise<Array<{slug:string;updatedAt:string}>> {
  if (!configured()) return [];
  const rows = await prisma.blogPost.findMany({where:{status:'PUBLISHED',publishedAt:{lte:new Date()}},select:{slug:true,updatedAt:true},orderBy:{updatedAt:'desc'}});
  return rows.map((row)=>({slug:row.slug,updatedAt:row.updatedAt.toISOString()}));
}
export async function validateBlogProducts(input:BlogInput) {
  const relatedProductSlugs = new Set(input.relatedProductSlugs);
  for (const translation of Object.values(input.translations)) {
    if (!translation) continue;
    for (const block of translation.blocks) if (block.type === 'product' && block.productSlug) {
      relatedProductSlugs.add(block.productSlug);
    }
  }
  for (const slug of relatedProductSlugs) {
    const found = await getProductBySlug(slug);
    if (!found.product) throw new Error(`Product “${slug}” does not exist or is not published.`);
  }
  if (input.relatedPostSlugs.length) {
    const rows = await prisma.blogPost.findMany({ where: { slug: { in: input.relatedPostSlugs }, status: 'PUBLISHED', publishedAt: { lte: new Date() } }, select: { slug: true } });
    const valid = new Set(rows.map((row) => row.slug));
    const missing = input.relatedPostSlugs.find((slug) => !valid.has(slug));
    if (missing) throw new Error(`Related post “${missing}” does not exist or is not published.`);
  }
}
export function parseBlogInput(raw:unknown):BlogInput { return blogInputSchema.parse(raw) as BlogInput; }
