"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button, Field, HelpTooltip, Input, Select, Textarea } from "@/components/ui";
import type { Locale } from "@/lib/i18n";
import type { CatalogMessage } from "./messages";
import { catalogMessage } from "./messages";
import { localizedCatalogName } from "./presentation";
import { emptyCatalogFormState, fieldValue, type CatalogFormAction } from "./form-state";
import { useActionState } from "react";

type AttributeKind = "text" | "number" | "boolean" | "select";
type AttributeDraft = { id: string; key: string; label: string; type: AttributeKind; required: boolean; options: string };
type LocalizedText = { name: string; description: string };
type LocalizedContent = { fa?: LocalizedText; ckb?: LocalizedText };

type CategoryDefaults = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  translations: unknown;
  attributes: Array<{ key: string; label: string; type: string; required: boolean; options: unknown }>;
};

function readTranslations(value: unknown): LocalizedContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const read = (key: "fa" | "ckb"): LocalizedText => {
    const item = source[key];
    if (!item || typeof item !== "object" || Array.isArray(item)) return { name: "", description: "" };
    const fields = item as Record<string, unknown>;
    return {
      name: typeof fields.name === "string" ? fields.name : "",
      description: typeof fields.description === "string" ? fields.description : "",
    };
  };
  return { fa: read("fa"), ckb: read("ckb") };
}

function initialAttributes(attributes: CategoryDefaults["attributes"] = []): AttributeDraft[] {
  return attributes.map((attribute, index) => ({
    id: `attribute-${index}`,
    key: attribute.key,
    label: attribute.label,
    type: ["text", "number", "boolean", "select"].includes(attribute.type) ? attribute.type as AttributeKind : "text",
    required: attribute.required,
    options: Array.isArray(attribute.options) ? attribute.options.filter((item): item is string => typeof item === "string").join("\n") : "",
  }));
}

export function CategoryForm({
  locale,
  categories,
  action,
  initial,
}: {
  locale: Locale;
  categories: Array<{ id: string; name: string; translations?: unknown }>;
  action: CatalogFormAction;
  initial?: CategoryDefaults;
}) {
  const m = (key: CatalogMessage) => catalogMessage(locale, key);
  const [state, formAction, pending] = useActionState(action, emptyCatalogFormState());
  const [attributes, setAttributes] = useState(() => initialAttributes(initial?.attributes));
  const [translations, setTranslations] = useState(() => readTranslations(initial?.translations));
  const nextAttributeId = useRef(attributes.length);
  const text = (name: string, fallback = "") => {
    const value = fieldValue(state, name, fallback);
    return typeof value === "string" ? value : fallback;
  };
  const errors = state.fieldErrors;

  const updateAttribute = (id: string, update: Partial<AttributeDraft>) => {
    setAttributes((current) => current.map((item) => item.id === id ? { ...item, ...update } : item));
  };
  const updateTranslation = (language: "fa" | "ckb", field: keyof LocalizedText, value: string) => {
    setTranslations((current) => ({ ...current, [language]: { ...current[language], [field]: value } }));
  };
  const submittedTranslations = Object.fromEntries(
    (["fa", "ckb"] as const).flatMap((language) => {
      const item = translations[language];
      if (!item) return [];
      const translated = Object.fromEntries(Object.entries(item).filter(([, value]) => value.trim()));
      return Object.keys(translated).length ? [[language, translated]] : [];
    }),
  );
  const submittedAttributes = attributes.map(({ options, ...attribute }) => ({
    ...attribute,
    options: attribute.type === "select" ? options.split(/\r?\n/).map((option) => option.trim()).filter(Boolean) : [],
  }));

  return (
    <form action={formAction} className="admin-panel admin-form" dir="rtl">
      <input type="hidden" name="translations" value={JSON.stringify(submittedTranslations)} />
      <input type="hidden" name="attributes" value={JSON.stringify(submittedAttributes)} />
      {state.formError ? (
        <div className="admin-notice admin-notice--error" role="alert" aria-live="assertive">
          <p>{state.formError}</p>
          {Object.entries(errors).length ? <><p>{m("formErrorSummary")}</p><ul>{Object.entries(errors).map(([field, error]) => <li key={field}><a href={`#${field}`}>{error}</a></li>)}</ul></> : null}
        </div>
      ) : null}
      <div className="admin-grid">
        <Field label={m("categoryName")} htmlFor="name" error={errors.name}>
          <Input id="name" name="name" defaultValue={text("name", initial?.name)} required minLength={2} />
        </Field>
        <Field label={m("slug")} htmlFor="slug" error={errors.slug}>
          <Input id="slug" name="slug" defaultValue={text("slug", initial?.slug)} placeholder="pantry-staples" required />
        </Field>
      </div>
      {initial ? (
        <Field label={m("parent")} htmlFor="parentId" error={errors.parentId}>
          <Select id="parentId" name="parentId" defaultValue={text("parentId", initial.parentId ?? "")}>
            <option value="">{m("noParent")}</option>
            {categories.filter((category) => category.id !== initial.id).map((category) => <option key={category.id} value={category.id}>{localizedCatalogName(category.name, category.translations, locale)}</option>)}
          </Select>
        </Field>
      ) : null}
      <Field label={m("description")} htmlFor="description" error={errors.description}>
        <Textarea id="description" name="description" defaultValue={text("description", initial?.description ?? "")} />
      </Field>

      <section className="admin-form-section" aria-labelledby="category-translations-heading">
        <div className="admin-form-section__heading"><h2 id="category-translations-heading">{m("localizedContent")} <HelpTooltip id="category-translation-hint" text={m("translationHint")} /></h2></div>
        <div className="admin-grid">
          {(["fa", "ckb"] as const).map((language) => (
            <fieldset className="admin-form-card" key={language} lang={language} dir="rtl">
              <legend>{m(language === "fa" ? "persian" : "sorani")}</legend>
              <div className="admin-stack">
                <Field label={m("translatedName")} htmlFor={`${language}-translation-name`}>
                  <Input id={`${language}-translation-name`} value={translations[language]?.name ?? ""} onChange={(event) => updateTranslation(language, "name", event.target.value)} />
                </Field>
                <Field label={m("translatedDescription")} htmlFor={`${language}-translation-description`}>
                  <Textarea id={`${language}-translation-description`} value={translations[language]?.description ?? ""} onChange={(event) => updateTranslation(language, "description", event.target.value)} />
                </Field>
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="admin-form-section" aria-labelledby="category-attributes-heading">
        <div className="admin-form-section__heading"><h2 id="category-attributes-heading">{m("attributeDefinitions")} <HelpTooltip id="category-attribute-hint" text={m("attributeRowHint")} /></h2></div>
        {errors.attributes ? <p className="ui-field__error" id="attributes-error" role="alert">{errors.attributes}</p> : null}
        {attributes.length === 0 ? <p className="admin-empty-hint">{m("noAttributes")}</p> : null}
        <div className="admin-repeater">
          {attributes.map((attribute, index) => {
            const prefix = `attribute-${attribute.id}`;
            return (
              <fieldset className="admin-form-card" key={attribute.id}>
                <legend>{m("attributeLabel")} {index + 1}</legend>
                <div className="admin-grid">
                  <Field label={m("attributeKey")} htmlFor={`${prefix}-key`}>
                    <Input id={`${prefix}-key`} value={attribute.key} placeholder="package_weight_kg" onChange={(event) => updateAttribute(attribute.id, { key: event.target.value })} required pattern="[a-z][a-z0-9_]*" maxLength={64} />
                  </Field>
                  <Field label={m("attributeLabel")} htmlFor={`${prefix}-label`}>
                    <Input id={`${prefix}-label`} value={attribute.label} onChange={(event) => updateAttribute(attribute.id, { label: event.target.value })} required maxLength={80} />
                  </Field>
                  <Field label={m("attributeType")} htmlFor={`${prefix}-type`}>
                    <Select id={`${prefix}-type`} value={attribute.type} onChange={(event) => updateAttribute(attribute.id, { type: event.target.value as AttributeKind })}>
                      <option value="text">{m("attributeText")}</option>
                      <option value="number">{m("attributeNumber")}</option>
                      <option value="boolean">{m("attributeBoolean")}</option>
                      <option value="select">{m("attributeSelect")}</option>
                    </Select>
                  </Field>
                  {attribute.type === "select" ? <Field label={m("selectOptions")} htmlFor={`${prefix}-options`}>
                    <Textarea id={`${prefix}-options`} placeholder={locale === "fa" ? "کیسه، بسته، قوطی" : "کیسە، پاکەت، قووتوو"} value={attribute.options} onChange={(event) => updateAttribute(attribute.id, { options: event.target.value })} required />
                  </Field> : null}
                </div>
                <label className="admin-checkbox"><input type="checkbox" checked={attribute.required} onChange={(event) => updateAttribute(attribute.id, { required: event.target.checked })} />{m("required")}</label>
                <Button variant="danger" size="sm" onClick={() => setAttributes((current) => current.filter((item) => item.id !== attribute.id))}>{m("removeAttribute")}</Button>
              </fieldset>
            );
          })}
        </div>
        <Button variant="secondary" onClick={() => setAttributes((current) => [...current, { id: `attribute-${nextAttributeId.current++}`, key: "", label: "", type: "text", required: false, options: "" }])}>{m("addAttribute")}</Button>
      </section>

      <div className="admin-form__actions">
        <Button type="submit" disabled={pending} aria-disabled={pending}>{pending ? m("saving") : initial ? m("saveCategory") : m("createCategory")}</Button>
        <Link className="ui-button ui-button--secondary ui-button--md" href="/admin/categories">{m("cancel")}</Link>
      </div>
    </form>
  );
}
