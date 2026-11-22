"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loginOwner, requireOwner, signOutOwner } from "@/modules/identity";
import { archiveBrand, saveBrand, saveCategory, saveProduct } from "@/modules/catalog/admin";
import { catalogError, catalogMessage } from "@/modules/catalog/messages";
import { cookies } from "next/headers";
import { isLocale } from "@/lib/i18n";
import { parseCatalogMajorAmount } from "@/modules/catalog/form-money";
import {
  catalogFailureState,
  formFieldFromIssues,
  parseCatalogJson,
  type CatalogFormState,
} from "@/modules/catalog/form-state";

const text = (form: FormData, name: string) =>
  String(form.get(name) ?? "").trim();
async function locale() {
  const value = (await cookies()).get("sarfe-locale")?.value;
  return value && isLocale(value) ? value : "fa";
}
function parseJsonField(form: FormData, name: string) {
  const result = parseCatalogJson(String(form.get(name) ?? ""));
  if (!result.success) throw new InvalidJsonFieldError(name);
  return result.value;
}
function asciiDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 && code <= 0x06f9 ? code - 0x06f0 : code - 0x0660);
  });
}
function parseProductVariants(form: FormData, localeValue: Awaited<ReturnType<typeof locale>>) {
  const raw = parseJsonField(form, "variants");
  if (!Array.isArray(raw)) throw new Error("Product variants must be a list.");
  return raw.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Each variant must be a form entry.");
    const row = value as Record<string, unknown>;
    const currency = typeof row.currency === "string" ? row.currency.toUpperCase() : "IRR";
    return {
      ...(typeof row.id === "string" ? { id: row.id } : {}),
      sku: row.sku,
      name: row.name,
      priceMinor: parseCatalogMajorAmount(row.price, currency, localeValue),
      currency,
      stock: typeof row.stock === "string" && /^\d+$/.test(asciiDigits(row.stock)) ? Number(asciiDigits(row.stock)) : row.stock,
      attributes: row.attributes,
    };
  });
}
class InvalidJsonFieldError extends Error {
  constructor(readonly field: string) {
    super("Invalid JSON input.");
  }
}
const categoryFields = [
  "name",
  "slug",
  "parentId",
  "description",
  "translations",
  "attributes",
] as const;
const productFields = [
  "categoryId",
  "brandId",
  "slug",
  "name",
  "description",
  "translations",
  "image",
  "images",
  "attributes",
  "variants",
  "status",
  "featured",
] as const;
function failedState(
  formData: FormData,
  fields: readonly string[],
  checkboxes: readonly string[],
  error: unknown,
  localeValue: Awaited<ReturnType<typeof locale>>,
): CatalogFormState {
  const field = error instanceof InvalidJsonFieldError
    ? (fields.includes(error.field) ? error.field : undefined)
    : (() => {
        if (!error || typeof error !== "object" || !("issues" in error) || !Array.isArray(error.issues)) return undefined;
        return formFieldFromIssues(error.issues as Array<{ path: PropertyKey[] }>, fields);
      })();
  const fieldErrors = field
    ? { [field]: error instanceof InvalidJsonFieldError
        ? catalogMessage(localeValue, "invalidJson")
        : catalogError(localeValue, error instanceof Error ? error.message : "") }
    : {};
  return catalogFailureState(
    formData,
    fields,
    checkboxes,
    fieldErrors,
    catalogError(localeValue, error instanceof Error ? error.message : ""),
  );
}
export async function loginAction(form: FormData) {
  let valid = false;
  try {
    valid = await loginOwner(text(form, "email"), text(form, "password"));
  } catch {
    valid = false;
  }
  if (!valid)
    redirect(
      `/admin/login?error=${encodeURIComponent(catalogError(await locale(), "Sign-in failed."))}`,
    );
  redirect("/admin");
}
export async function logoutAction() {
  await signOutOwner();
  redirect("/admin/login");
}
export async function saveCategoryAction(
  id: string | undefined,
  _previousState: CatalogFormState,
  form: FormData,
): Promise<CatalogFormState> {
  await requireOwner();
  const currentLocale = await locale();
  try {
    await saveCategory({
      id,
      name: text(form, "name"),
      slug: text(form, "slug"),
      description: text(form, "description") || null,
      translations: parseJsonField(form, "translations"),
      parentId: text(form, "parentId") || null,
      attributes: parseJsonField(form, "attributes"),
    });
  } catch (error) {
    return failedState(form, categoryFields, [], error, currentLocale);
  }
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin/categories");
}
export async function saveProductAction(
  id: string | undefined,
  _previousState: CatalogFormState,
  form: FormData,
): Promise<CatalogFormState> {
  await requireOwner();
  const currentLocale = await locale();
  try {
    const rawImages = text(form, "images")
      .split("\n")
      .map((image) => image.trim())
      .filter(Boolean);
    const image = text(form, "image") || undefined;
    await saveProduct({
      id,
      categoryId: text(form, "categoryId"),
      brandId: text(form, "brandId") || null,
      slug: text(form, "slug"),
      name: text(form, "name"),
      description: text(form, "description"),
      translations: parseJsonField(form, "translations"),
      image,
      images: rawImages,
      featured: form.get("featured") === "on",
      status: text(form, "status"),
      attributes: parseJsonField(form, "attributes"),
      variants: parseProductVariants(form, currentLocale),
    });
  } catch (error) {
    return failedState(form, productFields, ["featured"], error, currentLocale);
  }
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");
  redirect("/admin/products");
}

const brandFields = ["name", "slug", "description", "translations"] as const;

export async function saveBrandAction(
  id: string | undefined,
  _previousState: CatalogFormState,
  form: FormData,
): Promise<CatalogFormState> {
  await requireOwner();
  const currentLocale = await locale();
  try {
    await saveBrand({
      id,
      name: text(form, "name"),
      slug: text(form, "slug"),
      description: text(form, "description") || null,
      translations: parseJsonField(form, "translations"),
      active: form.get("active") === "on",
    });
  } catch (error) {
    return failedState(form, brandFields, ["active"], error, currentLocale);
  }
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/brands");
  revalidatePath("/admin/products");
  redirect("/admin/brands");
}

export async function archiveBrandAction(id: string) {
  await requireOwner();
  await archiveBrand(id);
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/brands");
  revalidatePath("/admin/products");
  redirect("/admin/brands");
}
