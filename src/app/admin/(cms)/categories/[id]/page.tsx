import { notFound } from "next/navigation";
import { saveCategoryAction } from "@/app/admin/actions";
import { getLocale } from "@/lib/locale-server";
import { catalogMessage } from "@/modules/catalog/messages";
import { CategoryForm } from "@/modules/catalog/category-form";
import { listManageableCatalog } from "@/modules/catalog/admin";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, data, locale] = await Promise.all([params, listManageableCatalog(), getLocale()]);
  const category = data.categories.find((item) => item.id === id);
  if (!category) notFound();
  const m = (key: Parameters<typeof catalogMessage>[1]) => catalogMessage(locale, key);
  return (
    <div dir="rtl">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">{m("configuration")}</p>
          <h1>{m("editCategory")}</h1>
          <p>{m("categoryChanged")}</p>
        </div>
      </div>
      {data.mode === "preview" ? <p className="admin-notice">{m("editsDisabled")}</p> : null}
      <CategoryForm
        locale={locale}
        categories={data.categories}
        action={saveCategoryAction.bind(null, category.id)}
        initial={category}
      />
    </div>
  );
}
