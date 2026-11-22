import { notFound } from 'next/navigation';
import { getLocale } from '@/lib/locale-server';
import { getCatalog } from '@/modules/catalog';
import { localizedCatalogName } from '@/modules/catalog/presentation';
import { BlogEditor, BlogDeleteForm } from '@/modules/blog/editor';
import { getManageableBlogPost, getRelatedPostChoices } from '@/modules/blog/admin';
import { saveBlogAction } from '@/modules/blog/actions';
import { blogMessage } from '@/modules/blog/messages';

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [locale, result, catalog] = await Promise.all([getLocale(), getManageableBlogPost(id), getCatalog()]);
  if (!result.post) notFound();
  const posts = await getRelatedPostChoices(result.post.slug);
  const products = catalog.products.map((product) => ({ slug: product.slug, name: localizedCatalogName(product.name, product.translations, locale) }));
  const editable = result.mode === 'database';
  return <>
    <div className="admin-heading"><div><p className="eyebrow">{blogMessage(locale, 'title')}</p><h1>{blogMessage(locale, 'editPost')}</h1></div></div>
    {!editable ? <div className="admin-notice" role="status">{blogMessage(locale, 'readOnly')}</div> : null}
    <BlogEditor locale={locale} initial={result.post} products={products} posts={posts} action={saveBlogAction} editable={editable} />
    <section className="admin-panel"><h2>{blogMessage(locale, 'delete')}</h2><BlogDeleteForm locale={locale} id={result.post.id} editable={editable} /></section>
  </>;
}
