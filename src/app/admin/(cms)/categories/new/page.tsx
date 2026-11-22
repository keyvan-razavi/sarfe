import { saveCategoryAction } from "@/app/admin/actions";
import { getLocale } from "@/lib/locale-server";
import { catalogMessage } from "@/modules/catalog/messages";
import { CategoryForm } from "@/modules/catalog/category-form";

export default async function NewCategoryPage() {
  const locale = await getLocale();
  const m = (key: Parameters<typeof catalogMessage>[1]) => catalogMessage(locale, key);
  return (
    <div dir="rtl">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">{m("configuration")}</p>
          <h1>{m("newCategory")}</h1>
          <p>{locale === "fa" ? "ویژگی‌های محصولات این مجموعه را تعریف کنید." : "تایبەتمەندیی بەرهەمەکانی ئەم کۆمەڵەیە دیاری بکە."}</p>
        </div>
      </div>
      <CategoryForm locale={locale} categories={[]} action={saveCategoryAction.bind(null, undefined)} />
    </div>
  );
}
