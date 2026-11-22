"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button, Field, HelpTooltip, Input, Select, Textarea } from "@/components/ui";
import type { Locale } from "@/lib/i18n";
import { irrMinorToToman } from "@/lib/store-money";
import { currencyMinorUnitExponent } from "@/lib/currency";
import { catalogMessage, type CatalogMessage } from "./messages";
import { localizedCatalogName } from "./presentation";
import { CatalogMediaPicker } from "./media-picker";
import { emptyCatalogFormState, fieldValue, type CatalogFormAction } from "./form-state";
import { useActionState } from "react";

type Kind = "text" | "number" | "boolean" | "select";
type Definition = { key: string; label: string; type: string; required: boolean; options: unknown };
type Category = { id: string; name: string; translations?: unknown; attributes: Definition[] };
type Brand = { id: string; name: string; translations?: unknown };
type Variant = { id?: string; sku: string; name: string; price: string; currency: string; stock: string; attributes: Record<string, string | number | boolean> };
type Product = {
  id: string; categoryId: string; brandId?: string | null; name: string; slug: string; description: string;
  images: string[]; translations: unknown; attributes: unknown;
  featured: boolean; status: "DRAFT" | "PUBLISHED";
  variants: Array<{ id: string; sku: string; name: string; priceMinor: number; currency: string; stock: number; attributes: unknown }>;
};
type LocalizedText = { name: string; description: string };
type LocalizedContent = { fa?: LocalizedText; ckb?: LocalizedText };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function translationsFrom(value: unknown): LocalizedContent {
  const source = record(value);
  const read = (key: "fa" | "ckb"): LocalizedText => {
    const item = record(source[key]);
    return { name: typeof item.name === "string" ? item.name : "", description: typeof item.description === "string" ? item.description : "" };
  };
  return { fa: read("fa"), ckb: read("ckb") };
}
function initialVariant(variant?: Product["variants"][number]): Variant {
  const currency = variant?.currency ?? "IRR";
  let price = "";
  if (variant) {
    try { price = currency === "IRR" ? String(irrMinorToToman(variant.priceMinor)) : (variant.priceMinor / (10 ** currencyMinorUnitExponent(currency))).toFixed(currencyMinorUnitExponent(currency)).replace(/\.?0+$/, ""); }
    catch { price = ""; }
  }
  return { id: variant?.id, sku: variant?.sku ?? "", name: variant?.name ?? "", price, currency, stock: variant ? String(variant.stock) : "0", attributes: record(variant?.attributes) as Record<string, string | number | boolean> };
}
function kindOf(value: string): Kind {
  return value === "number" || value === "boolean" || value === "select" ? value : "text";
}
function selectOptions(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function ProductForm({ locale, categories, brands = [], action, initial }: { locale: Locale; categories: Category[]; brands?: Brand[]; action: CatalogFormAction; initial?: Product }) {
  const m = (key: CatalogMessage) => catalogMessage(locale, key);
  const [state, formAction, pending] = useActionState(action, emptyCatalogFormState());
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [translations, setTranslations] = useState(() => translationsFrom(initial?.translations));
  const [attributes, setAttributes] = useState<Record<string, string | number | boolean>>(() => record(initial?.attributes) as Record<string, string | number | boolean>);
  const [variants, setVariants] = useState<Variant[]>(() => initial?.variants.length ? initial.variants.map(initialVariant) : [initialVariant()]);
  const nextVariantId = useRef(variants.length);
  const text = (name: string, fallback = "") => {
    const value = fieldValue(state, name, fallback);
    return typeof value === "string" ? value : fallback;
  };
  const errors = state.fieldErrors;
  const category = categories.find((item) => item.id === categoryId);
  const definitions = category?.attributes ?? [];
  const imagePaths = [
    text("image", initial?.images[0] ?? ""),
    ...text("images", initial?.images.slice(1).join("\n") ?? "").split(/\r?\n/),
  ].map((path) => path.trim()).filter(Boolean);
  const translationsPayload = Object.fromEntries((["fa", "ckb"] as const).flatMap((language) => {
    const item = translations[language];
    if (!item) return [];
    const translated = Object.fromEntries(Object.entries(item).filter(([, value]) => value.trim()));
    return Object.keys(translated).length ? [[language, translated]] : [];
  }));
  const variantPayload = variants.map(({ price, ...variant }) => ({ ...variant, price: price.trim() }));
  const updateTranslation = (language: "fa" | "ckb", field: keyof LocalizedText, value: string) => setTranslations((current) => ({ ...current, [language]: { ...current[language], [field]: value } }));
  const updateVariant = (index: number, update: Partial<Variant>) => setVariants((current) => current.map((item, row) => row === index ? { ...item, ...update } : item));
  const updateVariantAttribute = (index: number, key: string, value: string | number | boolean) => setVariants((current) => current.map((item, row) => row === index ? { ...item, attributes: { ...item.attributes, [key]: value } } : item));
  const changeCategory = (value: string) => {
    setCategoryId(value);
    const keys = new Set(categories.find((item) => item.id === value)?.attributes.map((item) => item.key) ?? []);
    setAttributes((current) => Object.fromEntries(Object.entries(current).filter(([key]) => keys.has(key))));
    setVariants((current) => current.map((variant) => ({ ...variant, attributes: Object.fromEntries(Object.entries(variant.attributes).filter(([key]) => keys.has(key))) })));
  };

  return <form action={formAction} className="admin-panel admin-form" dir="rtl">
    <input type="hidden" name="translations" value={JSON.stringify(translationsPayload)} />
    <input type="hidden" name="attributes" value={JSON.stringify(attributes)} />
    <input type="hidden" name="variants" value={JSON.stringify(variantPayload)} />
    {state.formError ? <div className="admin-notice admin-notice--error" role="alert" aria-live="assertive"><p>{state.formError}</p>{Object.entries(errors).length ? <><p>{m("formErrorSummary")}</p><ul>{Object.entries(errors).map(([field, error]) => <li key={field}><a href={`#${field}`}>{error}</a></li>)}</ul></> : null}</div> : null}

    <div className="admin-grid">
      <Field label={m("name")} htmlFor="name" error={errors.name}><Input id="name" name="name" defaultValue={text("name", initial?.name)} required minLength={2} maxLength={160} /></Field>
      <Field label={m("slug")} htmlFor="slug" error={errors.slug}><Input id="slug" name="slug" defaultValue={text("slug", initial?.slug)} placeholder="rice-premium" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></Field>
      <Field label={m("category")} htmlFor="categoryId" error={errors.categoryId}><Select id="categoryId" name="categoryId" value={categoryId} onChange={(event) => changeCategory(event.target.value)} required><option value="">{m("chooseCategory")}</option>{categories.map((item) => <option key={item.id} value={item.id}>{localizedCatalogName(item.name, item.translations, locale)}</option>)}</Select></Field>
      <Field label={m("brandAssignment")} htmlFor="brandId" error={errors.brandId}><Select id="brandId" name="brandId" defaultValue={brands.some((brand) => brand.id === initial?.brandId) ? initial?.brandId ?? "" : ""}><option value="">{m("noBrand")}</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{localizedCatalogName(brand.name, brand.translations, locale)}</option>)}</Select></Field>
    </div>
      <Field label={m("description")} htmlFor="description" error={errors.description}><Textarea id="description" name="description" defaultValue={text("description", initial?.description)} required maxLength={10000} /></Field>
    <CatalogMediaPicker locale={locale} paths={imagePaths} error={errors.image ?? errors.images} />

    <section className="admin-form-section" aria-labelledby="product-translations-heading"><div className="admin-form-section__heading"><h2 id="product-translations-heading">{m("localizedContent")} <HelpTooltip id="product-translation-hint" text={m("translationHint")} /></h2></div><div className="admin-grid">{(["fa", "ckb"] as const).map((language) => <fieldset className="admin-form-card" key={language} lang={language} dir="rtl"><legend>{m(language === "fa" ? "persian" : "sorani")}</legend><div className="admin-stack"><Field label={m("translatedName")} htmlFor={`${language}-name`}><Input id={`${language}-name`} value={translations[language]?.name ?? ""} onChange={(event) => updateTranslation(language, "name", event.target.value)} /></Field><Field label={m("translatedDescription")} htmlFor={`${language}-description`}><Textarea id={`${language}-description`} value={translations[language]?.description ?? ""} onChange={(event) => updateTranslation(language, "description", event.target.value)} /></Field></div></fieldset>)}</div></section>

    <section className="admin-form-section" id="attributes" aria-labelledby="product-attributes-heading"><div className="admin-form-section__heading"><h2 id="product-attributes-heading">{m("productAttributes")} <HelpTooltip id="product-attributes-hint" text={m("productAttrHint")} /></h2></div>{errors.attributes ? <p className="ui-field__error" role="alert">{errors.attributes}</p> : null}{definitions.length ? <div className="admin-grid">{definitions.map((definition) => { const kind = kindOf(definition.type); const id = `product-attribute-${definition.key}`; return <Field key={definition.key} label={definition.label} htmlFor={id} error={errors[`attributes.${definition.key}`]}>{kind === "select" ? <Select id={id} value={String(attributes[definition.key] ?? "")} onChange={(event) => setAttributes((current) => ({ ...current, [definition.key]: event.target.value }))}><option value="">{m("selectValue")}</option>{selectOptions(definition.options).map((option) => <option key={option} value={option}>{option}</option>)}</Select> : kind === "boolean" ? <Select id={id} value={attributes[definition.key] === true ? "true" : attributes[definition.key] === false ? "false" : ""} onChange={(event) => setAttributes((current) => ({ ...current, [definition.key]: event.target.value === "" ? "" : event.target.value === "true" }))}><option value="">{m("selectValue")}</option><option value="true">{m("trueValue")}</option><option value="false">{m("falseValue")}</option></Select> : <Input id={id} type={kind === "number" ? "number" : "text"} step={kind === "number" ? "any" : undefined} value={String(attributes[definition.key] ?? "")} onChange={(event) => setAttributes((current) => ({ ...current, [definition.key]: kind === "number" ? event.target.value === "" ? "" : Number(event.target.value) : event.target.value }))} />}</Field>; })}</div> : <p className="admin-empty-hint">{m("noVariantAttributes")}</p>}</section>

    <section className="admin-form-section" id="variants" aria-labelledby="variant-heading"><div className="admin-form-section__heading"><h2 id="variant-heading">{m("variantDetails")} <HelpTooltip id="product-variants-hint" text={m("variantRowHint")} /></h2></div>{errors.variants ? <p className="ui-field__error" role="alert">{errors.variants}</p> : null}<div className="admin-repeater">{variants.map((variant, index) => <fieldset className="admin-form-card" key={variant.id ?? `variant-${index}`}><legend>{m("variantName")} {index + 1}</legend><div className="admin-grid">
      <Field label={m("variantName")} htmlFor={`variant-${index}-name`} error={errors[`variants.${index}.name`]}><Input id={`variant-${index}-name`} value={variant.name} onChange={(event) => updateVariant(index, { name: event.target.value })} required /></Field>
      <Field label={m("sku")} htmlFor={`variant-${index}-sku`} error={errors[`variants.${index}.sku`]}><Input id={`variant-${index}-sku`} value={variant.sku} onChange={(event) => updateVariant(index, { sku: event.target.value })} dir="ltr" required minLength={2} /></Field>
      <Field label={variant.currency === "IRR" ? m("priceToman") : `${m("priceCurrency")} (${variant.currency})`} htmlFor={`variant-${index}-price`} error={errors[`variants.${index}.priceMinor`]} hint={variant.currency === "IRR" ? m("wholeTomanHint") : undefined}><Input id={`variant-${index}-price`} type="number" inputMode={variant.currency === "IRR" ? "numeric" : "decimal"} min="0" step={variant.currency === "IRR" ? "1" : "any"} value={variant.price} onChange={(event) => updateVariant(index, { price: event.target.value })} required /></Field>
      <Field label={m("priceCurrency")} htmlFor={`variant-${index}-currency`}><Select id={`variant-${index}-currency`} value={variant.currency} onChange={(event) => updateVariant(index, { currency: event.target.value, price: "" })}><option value="IRR">IRR — {locale === "fa" ? "تومان" : "تۆمان"}</option>{variant.currency !== "IRR" ? <option value={variant.currency}>{variant.currency}</option> : null}</Select></Field>
      <Field label={m("stock")} htmlFor={`variant-${index}-stock`} error={errors[`variants.${index}.stock`]}><Input id={`variant-${index}-stock`} type="number" min="0" step="1" value={variant.stock} onChange={(event) => updateVariant(index, { stock: event.target.value })} required /></Field>
      {definitions.map((definition) => { const kind = kindOf(definition.type); const id = `variant-${index}-${definition.key}`; const value = variant.attributes[definition.key]; const commonValue = attributes[definition.key]; const required = definition.required && (commonValue === undefined || commonValue === ""); return <Field key={definition.key} label={definition.label} htmlFor={id}>{kind === "select" ? <Select id={id} required={required} value={String(value ?? "")} onChange={(event) => updateVariantAttribute(index, definition.key, event.target.value)}><option value="">{m("selectValue")}</option>{selectOptions(definition.options).map((option) => <option key={option} value={option}>{option}</option>)}</Select> : kind === "boolean" ? <Select id={id} required={required} value={value === true ? "true" : value === false ? "false" : ""} onChange={(event) => updateVariantAttribute(index, definition.key, event.target.value === "" ? "" : event.target.value === "true")}><option value="">{m("selectValue")}</option><option value="true">{m("trueValue")}</option><option value="false">{m("falseValue")}</option></Select> : <Input id={id} required={required} type={kind === "number" ? "number" : "text"} step={kind === "number" ? "any" : undefined} value={String(value ?? "")} onChange={(event) => updateVariantAttribute(index, definition.key, kind === "number" ? event.target.value === "" ? "" : Number(event.target.value) : event.target.value)} />}</Field>; })}
      </div><Button variant="danger" size="sm" disabled={variants.length < 2} onClick={() => setVariants((current) => current.filter((_, row) => row !== index))}>{m("removeVariant")}</Button></fieldset>)}</div><Button variant="secondary" onClick={() => setVariants((current) => [...current, { ...initialVariant(), name: `${m("variantName")} ${nextVariantId.current++}` }])}>{m("addVariant")}</Button></section>

    <div className="admin-grid"><Field label={m("publication")} htmlFor="status"><Select id="status" name="status" defaultValue={text("status", initial?.status ?? "DRAFT")}><option value="DRAFT">{m("draft")}</option><option value="PUBLISHED">{m("published")}</option></Select></Field></div>
    <label className="admin-checkbox"><input type="checkbox" name="featured" defaultChecked={state.submitted ? fieldValue(state, "featured", initial?.featured ?? false) === true : initial?.featured ?? false} />{m("feature")}</label>
    <div className="admin-form__actions"><Button type="submit" disabled={pending} aria-disabled={pending}>{pending ? m("saving") : initial ? m("saveProduct") : m("createProduct")}</Button><Link className="ui-button ui-button--secondary ui-button--md" href="/admin/products">{m("cancel")}</Link></div>
  </form>;
}
