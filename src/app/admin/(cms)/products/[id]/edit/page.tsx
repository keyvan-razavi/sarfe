import { notFound } from 'next/navigation';
import { getLocale } from '@/lib/locale-server';
import { catalogMessage } from '@/modules/catalog/messages';
import { ProductForm } from '@/modules/catalog/product-form';
import { saveProductAction } from '@/app/admin/actions';
import { listManageableBrands, listManageableCatalog } from '@/modules/catalog/admin';
export default async function EditProductPage({params}:{params:Promise<{id:string}>}) {
 const [{id},data,brandData,locale]=await Promise.all([params,listManageableCatalog(),listManageableBrands(),getLocale()]); const initial=data.products.find(p=>p.id===id); if(!initial) notFound(); const m=(k:Parameters<typeof catalogMessage>[1])=>catalogMessage(locale,k);
 return <><div className="admin-heading"><div><p className="eyebrow">{m('catalog')}</p><h1>{m('editProduct')}</h1></div></div>{data.mode==='preview'?<p className="admin-notice">{m('editsDisabled')}</p>:null}<ProductForm locale={locale} categories={data.categories} brands={brandData.brands.filter((brand) => brand.active)} action={saveProductAction.bind(null, initial.id)} initial={initial}/></>;
}
