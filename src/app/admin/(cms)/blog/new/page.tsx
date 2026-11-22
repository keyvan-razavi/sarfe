import { getLocale } from '@/lib/locale-server';
import { getCatalog } from '@/modules/catalog';
import { localizedCatalogName } from '@/modules/catalog/presentation';
import { BlogEditor } from '@/modules/blog/editor';
import { saveBlogAction } from '@/modules/blog/actions';
import { blogMessage } from '@/modules/blog/messages';
import { getRelatedPostChoices } from '@/modules/blog/admin';

export default async function NewBlogPostPage() {
  const [locale, catalog, posts] = await Promise.all([getLocale(), getCatalog(), getRelatedPostChoices()]);
  const products = catalog.products.map((product) => ({ slug: product.slug, name: localizedCatalogName(product.name, product.translations, locale) }));
  return <>
    <div className="admin-heading"><div><p className="eyebrow">{blogMessage(locale, 'title')}</p><h1>{blogMessage(locale, 'newPost')}</h1></div></div>
    {catalog.mode === 'preview' ? <div className="admin-notice" role="status">{blogMessage(locale, 'readOnly')}</div> : null}
    <BlogEditor locale={locale} products={products} posts={posts} action={saveBlogAction} editable={catalog.mode === 'database'} />
  </>;
}
