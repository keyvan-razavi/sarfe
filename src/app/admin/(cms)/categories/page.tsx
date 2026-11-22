import Link from 'next/link';
import { Button } from '@/components/ui';
import { listManageableCatalog } from '@/modules/catalog/admin';
import { getLocale } from '@/lib/locale-server';
import { catalogMessage } from '@/modules/catalog/messages';
import { localizedCatalogName } from '@/modules/catalog/presentation';
export default async function AdminCategoriesPage() {
  const [data,locale] = await Promise.all([listManageableCatalog(),getLocale()]); const m=(key:Parameters<typeof catalogMessage>[1])=>catalogMessage(locale,key);
  const numberFormat = new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'ckb-IQ');
  return <>
    <div className="admin-heading" dir="rtl"><div><p className="eyebrow">{m('configuration')}</p><h1>{m('categories')}</h1><p>{m('manageCategories')}</p></div><Link href="/admin/categories/new"><Button>{m('newCategory')}</Button></Link></div>
    {data.mode === 'preview' ? <p className="admin-notice">{m('editsDisabled')}</p> : null}
    {data.categories.length ? <div className="admin-table-wrap" dir="rtl" role="region" aria-label={m('categories')} tabIndex={0}><table className="admin-table"><thead><tr><th className="admin-table__index" scope="col">{m('rowNumber')}</th><th scope="col">{m('category')}</th><th scope="col">{m('parent')}</th><th scope="col">{m('attributesCount')}</th><th scope="col">{m('productCount')}</th><th scope="col"><span className="sr-only">{m('actions')}</span></th></tr></thead><tbody>{data.categories.map((category, index) => { const parent = data.categories.find((item) => item.id === category.parentId); return <tr key={category.id}><td className="admin-table__index"><span dir="ltr">{numberFormat.format(index + 1)}</span></td><td><strong>{localizedCatalogName(category.name, category.translations, locale)}</strong><br /><span className="admin-help">/<bdi dir="ltr">{category.slug}</bdi></span></td><td>{parent ? localizedCatalogName(parent.name, parent.translations, locale) : '—'}</td><td className="admin-table__numeric">{numberFormat.format(category.attributes.length)}</td><td className="admin-table__numeric">{numberFormat.format(data.products.filter((product) => product.categoryId === category.id).length)}</td><td><Link href={`/admin/categories/${category.id}`}>{m('edit')}</Link></td></tr>; })}</tbody></table></div> : <section className="admin-panel"><h2>{m('noCategories')}</h2><p>{m('addCategoryFirst')}</p><Link href="/admin/categories/new"><Button>{m('newCategory')}</Button></Link></section>}
  </>;
}
