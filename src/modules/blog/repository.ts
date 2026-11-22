import 'server-only';
import type { Prisma, BlogStatus as DbBlogStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { BlogInput, BlogPost } from './types';

export function mapBlog(row: {id:string;slug:string;status:DbBlogStatus;coverImage:string;coverAlt:string;tags:string[];relatedPostSlugs:string[];relatedProductSlugs:string[];translations:Prisma.JsonValue;createdAt:Date;updatedAt:Date;publishedAt:Date|null}): BlogPost {
  return { id:row.id,slug:row.slug,status:row.status,coverImage:row.coverImage,coverAlt:row.coverAlt,tags:row.tags,relatedPostSlugs:row.relatedPostSlugs,relatedProductSlugs:row.relatedProductSlugs,translations:row.translations as BlogPost['translations'],createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString(),publishedAt:row.publishedAt?.toISOString() ?? null };
}
export const blogRepository = {
  list: (where: Prisma.BlogPostWhereInput, skip: number, take: number) => prisma.blogPost.findMany({where,skip,take,orderBy:[{publishedAt:'desc'},{updatedAt:'desc'}]}),
  count: (where: Prisma.BlogPostWhereInput) => prisma.blogPost.count({where}),
  tags: () => prisma.blogPost.findMany({where:{status:'PUBLISHED',publishedAt:{lte:new Date()}},select:{tags:true}}),
  bySlug: (slug:string) => prisma.blogPost.findFirst({where:{slug,status:'PUBLISHED',publishedAt:{lte:new Date()}}}),
  byId: (id:string) => prisma.blogPost.findUnique({where:{id}}),
  save: async (input:BlogInput) => {
    const now = new Date();
    const shared = {slug:input.slug,status:input.status,coverImage:input.coverImage,coverAlt:input.coverAlt,tags:input.tags,relatedPostSlugs:input.relatedPostSlugs,relatedProductSlugs:input.relatedProductSlugs,translations:input.translations as Prisma.InputJsonValue};
    if (!input.id) return prisma.blogPost.create({data:{...shared,publishedAt:input.status==='PUBLISHED'?now:null}});
    return prisma.$transaction(async (tx) => {
      const existing = await tx.blogPost.findUnique({where:{id:input.id}});
      if (!existing) throw new Error('This blog post no longer exists.');
      const publishedAt = input.status !== 'PUBLISHED' ? null : existing.status === 'PUBLISHED' ? existing.publishedAt ?? now : now;
      return tx.blogPost.update({where:{id:input.id},data:{...shared,publishedAt}});
    });
  },
  delete: (id:string) => prisma.blogPost.delete({where:{id}}),
};
