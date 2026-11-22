'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { deleteBlogPost, getManageableBlogPost, saveBlogPost } from './admin';
import type { BlogInput } from './types';

export type BlogFormState = { error?: string; fieldErrors?: string[] };
const MAX_ACTION_BYTES = 256_000;
function value(form: FormData, key: string, max = 20_000): string {
  const raw = form.get(key);
  if (typeof raw !== 'string' || raw.length > max) throw new Error('Invalid form data.');
  return raw;
}
function jsonField<T>(form: FormData, key: string, max = 240_000): T {
  const raw = value(form, key, max);
  if (new TextEncoder().encode(raw).byteLength > MAX_ACTION_BYTES) throw new Error('Form is too large.');
  return JSON.parse(raw) as T;
}
function safeError(error: unknown): BlogFormState {
  const message = error instanceof Error ? error.message : '';
  if (/slug.*(use|exist)|already in use/i.test(message)) return { error: 'duplicate' };
  if (/preview|unavailable/i.test(message)) return { error: 'preview' };
  if (/sign|owner|auth/i.test(message)) return { error: 'auth' };
  const issues = (error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues)) ? error.issues as Array<{ path?: unknown[] }> : [];
  const fieldErrors = issues.map((issue) => (issue.path ?? []).filter((part): part is string | number => typeof part === 'string' || typeof part === 'number').join('.')).filter(Boolean).slice(0, 8);
  return { error: 'invalid', ...(fieldErrors.length ? { fieldErrors } : {}) };
}
function refresh(slug?: string) {
  revalidatePath('/blog', 'layout');
  revalidatePath('/sitemap.xml');
  revalidatePath('/admin/blog');
  if (slug) revalidatePath(`/blog/${slug}`);
}

export async function saveBlogAction(_previous: BlogFormState, form: FormData): Promise<BlogFormState> {
  let oldSlug = '';
  try {
    const id = value(form, 'id', 100).trim();
    const raw: BlogInput = {
      ...(id ? { id } : {}),
      slug: value(form, 'slug', 160),
      status: value(form, 'status', 20) as BlogInput['status'],
      coverImage: value(form, 'coverImage', 2048),
      coverAlt: value(form, 'coverAlt', 300),
      tags: jsonField<string[]>(form, 'tags', 4_000),
      relatedPostSlugs: jsonField<string[]>(form, 'relatedPostSlugs', 4_000),
      relatedProductSlugs: jsonField<string[]>(form, 'relatedProductSlugs', 4_000),
      translations: jsonField<BlogInput['translations']>(form, 'translations'),
    };
    if (id) {
      const existing = await getManageableBlogPost(id);
      oldSlug = existing.post?.slug ?? '';
    }
    const savedId = await saveBlogPost(raw);
    const saved = await getManageableBlogPost(savedId);
    refresh(oldSlug);
    if (saved.post?.slug) refresh(saved.post.slug);
  } catch (error) {
    return safeError(error);
  }
  redirect('/admin/blog?saved=1');
}

export async function deleteBlogAction(_previous: BlogFormState, form: FormData): Promise<BlogFormState> {
  try {
    const id = value(form, 'id', 100);
    if (form.get('confirm') !== 'yes') return { error: 'invalid' };
    const existing = await getManageableBlogPost(id);
    await deleteBlogPost(id);
    refresh(existing.post?.slug);
  } catch (error) { return safeError(error); }
  redirect('/admin/blog?deleted=1');
}
