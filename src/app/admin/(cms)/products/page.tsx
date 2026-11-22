import Link from 'next/link';
import { Button } from '@/components/ui';
import { listManageableCatalog } from '@/modules/catalog/admin';
import { formatStoreMoney } from '@/lib/store-money';
import { getLocale } from '@/lib/locale-server';
import { catalogMessage } from '@/modules/catalog/messages';
import { localizedCatalogName } from '@/modules/catalog/presentation';
export default async function AdminProductsPage() {
  const [data,locale] = await Promise.all([listManageableCatalog(),getLocale()]); const m=(key:Parameters<typeof catalogMessage>[1])=>catalogMessage(locale,key);
  const numberFormat = new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'ckb-IQ');
  return <>
    <div className="admin-heading" dir="rtl"><div><p className="eyebrow">{m('catalog')}</p><h1>{m('products')}</h1><p>{m('manageProducts')}</p></div><Link href="/admin/products/new"><Button>{m('addProduct')}</Button></Link></div>
    {data.mode === 'preview' ? <p className="admin-notice">{m('editsDisabled')}</p> : null}
    {data.products.length ? <div className="admin-table-wrap" dir="rtl" role="region" aria-label={m('products')} tabIndex={0}><table className="admin-table"><thead><tr><th className="admin-table__index" scope="col">{m('rowNumber')}</th><th scope="col">{m('name')}</th><th scope="col">{m('category')}</th><th scope="col">{m('status')}</th><th scope="col">{m('startingPrice')}</th><th scope="col">{m('variantsCount')}</th><th scope="col"><span className="sr-only">{m('actions')}</span></th></tr></thead><tbody>{data.products.map((product, index) => <tr key={product.id}><td className="admin-table__index"><span dir="ltr">{numberFormat.format(index + 1)}</span></td><td><strong>{localizedCatalogName(product.name, product.translations, locale)}</strong><br /><span className="admin-help">/<bdi dir="ltr">{product.slug}</bdi></span></td><td>{localizedCatalogName(product.category.name, product.category.translations, locale)}</td><td>{product.status === 'PUBLISHED' ? m('published') : m('draft')}</td><td className="admin-table__numeric">{product.variants.length ? formatStoreMoney(Math.min(...product.variants.map((v) => v.priceMinor)), product.variants[0]!.currency, locale === 'fa' ? 'fa-IR' : 'ckb-IQ') : '—'}</td><td className="admin-table__numeric">{numberFormat.format(product.variants.length)}</td><td><Link href={`/admin/products/${product.id}/edit`}>{m('edit')}</Link></td></tr>)}</tbody></table></div> : <section className="admin-panel"><h2>{m('noProducts')}</h2><p>{m('draftHint')}</p><Link href="/admin/products/new"><Button>{m('addProduct')}</Button></Link></section>}
  </>;
}
