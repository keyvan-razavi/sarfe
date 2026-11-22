import { redirect } from 'next/navigation';
import { getLocale } from '@/lib/locale-server';
import { catalogMessage } from '@/modules/catalog/messages';
import { ProductForm } from '@/modules/catalog/product-form';
import { saveProductAction } from '@/app/admin/actions';
import { listManageableBrands, listManageableCatalog } from '@/modules/catalog/admin';
export default async function NewProductPage() {
 const [data,brandData,locale]=await Promise.all([listManageableCatalog(),listManageableBrands(),getLocale()]); const m=(k:Parameters<typeof catalogMessage>[1])=>catalogMessage(locale,k);
 if (!data.categories.length&&data.mode==='database') redirect('/admin/categories/new');
 return <><div className="admin-heading"><div><p className="eyebrow">{m('catalog')}</p><h1>{m('newProduct')}</h1><p>{m('draftHint')}</p></div></div>{data.mode==='preview'?<p className="admin-notice">{m('editsDisabled')}</p>:null}<ProductForm locale={locale} categories={data.categories} brands={brandData.brands.filter((brand) => brand.active)} action={saveProductAction.bind(null, undefined)}/></>;
}
