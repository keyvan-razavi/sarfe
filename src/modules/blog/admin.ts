import 'server-only';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireOwner } from '@/modules/identity';
import { blogRepository, mapBlog } from './repository';
import { parseBlogInput, validateBlogProducts } from './service';
import type { BlogPost } from './types';

const PAGE_SIZE = 20;
const adminFiltersSchema=z.object({search:z.string().trim().max(120).optional(),status:z.enum(['DRAFT','PUBLISHED','ARCHIVED']).optional(),page:z.number().int().min(1).max(100_000).optional()}).strict();
export async function listManageableBlogPosts(rawFilters:{search?:string;status?:'DRAFT'|'PUBLISHED'|'ARCHIVED';page?:number} = {}) {
  await requireOwner();
  const filters=adminFiltersSchema.parse(rawFilters);
  const page=filters.page ?? 1;
  if (!process.env.DATABASE_URL) return {mode:'preview' as const,posts:[] as BlogPost[],total:0,page,pageSize:PAGE_SIZE,tags:[] as string[]};
  const search=filters.search?.trim();
  const where={...(filters.status?{status:filters.status}:{}),...(search?{OR:[{slug:{contains:search,mode:'insensitive' as const}},{translations:{path:['fa','title'],string_contains:search,mode:'insensitive' as const}},{translations:{path:['ckb','title'],string_contains:search,mode:'insensitive' as const}}]}:{})};
  const [rows,total,all]=await Promise.all([blogRepository.list(where,(page-1)*PAGE_SIZE,PAGE_SIZE),blogRepository.count(where),prisma.blogPost.findMany({select:{tags:true}})]);
  return {mode:'database' as const,posts:rows.map(mapBlog),total,page,pageSize:PAGE_SIZE,tags:[...new Set(all.flatMap((row)=>row.tags))].sort()};
}
export async function getManageableBlogPost(id:unknown) {
  await requireOwner();
  const validId=z.string().trim().min(1).max(100).parse(id);
  if (!process.env.DATABASE_URL) return {mode:'preview' as const,post:null};
  const row=await blogRepository.byId(validId);
  return {mode:'database' as const,post:row?mapBlog(row):null};
}
export async function getRelatedPostChoices(excludeSlug?: string) {
  await requireOwner();
  if (!process.env.DATABASE_URL) return [];
  const rows = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED', publishedAt: { lte: new Date() }, ...(excludeSlug ? { slug: { not: excludeSlug } } : {}) },
    select: { slug: true, translations: true },
    orderBy: { publishedAt: 'desc' },
    take: 200,
  });
  return rows.map((row) => {
    const translations = row.translations as { fa?: { title?: string } };
    return { slug: row.slug, title: translations.fa?.title?.trim() || row.slug };
  });
}
export async function saveBlogPost(raw:unknown):Promise<string> {
  await requireOwner();
  if (!process.env.DATABASE_URL) throw new Error('Blog management is unavailable in preview mode. Configure PostgreSQL first.');
  const input=parseBlogInput(raw);
  await validateBlogProducts(input);
  try { return (await blogRepository.save(input)).id; }
  catch(error) {
    if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2002') throw new Error('That blog slug is already in use.');
    if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2025') throw new Error('This blog post no longer exists.');
    throw error;
  }
}
export async function deleteBlogPost(id:unknown):Promise<void> {
  await requireOwner();
  if (!process.env.DATABASE_URL) throw new Error('Blog management is unavailable in preview mode. Configure PostgreSQL first.');
  const validId=z.string().trim().min(1).max(100).parse(id);
  try { await blogRepository.delete(validId); }
  catch(error) { if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2025') throw new Error('This blog post no longer exists.'); throw error; }
}
