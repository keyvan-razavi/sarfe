export type BlogStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type BlogBlock = { id: string; type: 'paragraph' | 'heading' | 'quote' | 'bulletList' | 'orderedList' | 'image' | 'product'; text: string; level?: 2 | 3; url?: string; alt?: string; caption?: string; productSlug?: string };
export type BlogTranslation = { title: string; excerpt: string; blocks: BlogBlock[]; seoTitle: string; seoDescription: string };
export type BlogInput = { id?: string; slug: string; status: BlogStatus; coverImage: string; coverAlt: string; tags: string[]; relatedPostSlugs: string[]; relatedProductSlugs: string[]; translations: { fa: BlogTranslation; ckb?: BlogTranslation } };
export type BlogPost = BlogInput & { id: string; createdAt: string; updatedAt: string; publishedAt: string | null };
export type BlogListResult = { mode: 'database' | 'preview'; posts: BlogPost[]; total: number; page: number; pageSize: number; tags: string[] };
