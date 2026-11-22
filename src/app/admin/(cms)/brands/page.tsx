import { Button } from "@/components/ui";
import { getLocale } from "@/lib/locale-server";
import { catalogMessage } from "@/modules/catalog/messages";
import { listManageableBrands } from "@/modules/catalog/admin";
import { archiveBrandAction, saveBrandAction } from "@/app/admin/actions";
import { BrandForm } from "./brand-form";

export default async function BrandsPage() {
  const [data, locale] = await Promise.all([listManageableBrands(), getLocale()]);
  const m = (key: Parameters<typeof catalogMessage>[1]) => catalogMessage(locale, key);
  return <>
    <div className="admin-heading"><div><p className="eyebrow">{m("catalog")}</p><h1>{m("brands")}</h1><p>{m("manageBrands")}</p></div></div>
    {data.mode === "preview" ? <p className="admin-notice">{m("editsDisabled")}</p> : null}
    <section className="admin-form-section" aria-labelledby="create-brand-heading">
      <div className="admin-form-section__heading"><h2 id="create-brand-heading">{m("newBrand")}</h2></div>
      <BrandForm locale={locale} action={saveBrandAction.bind(null, undefined)} submitLabel={m("createBrand")} />
    </section>
    <section className="admin-form-section" aria-labelledby="existing-brands-heading">
      <div className="admin-form-section__heading"><h2 id="existing-brands-heading">{m("brands")}</h2></div>
      {data.brands.length ? <div className="admin-brand-list admin-stack">{data.brands.map((brand) => <article className="admin-panel admin-brand-item admin-stack" key={brand.id}>
        <div className="admin-order-card__top"><h3>{brand.name}</h3><span className="admin-order-status">{brand.active ? m("activeBrand") : m("archivedBrand")}</span></div>
        <BrandForm locale={locale} initial={brand} action={saveBrandAction.bind(null, brand.id)} submitLabel={m("saveBrand")} />
        {brand.active ? <form action={archiveBrandAction.bind(null, brand.id)} className="admin-brand-item__archive"><Button type="submit" variant="danger" size="sm">{m("archiveBrand")}</Button></form> : null}
      </article>)}</div> : <p className="admin-empty-hint">{m("noBrands")}</p>}
    </section>
  </>;
}
