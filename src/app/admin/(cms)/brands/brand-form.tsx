"use client";

import { useState } from "react";
import { Button, Field, HelpTooltip, Input, Textarea } from "@/components/ui";
import type { Locale } from "@/lib/i18n";
import { catalogMessage, type CatalogMessage } from "@/modules/catalog/messages";
import { emptyCatalogFormState, fieldValue, type CatalogFormAction } from "@/modules/catalog/form-state";
import { useActionState } from "react";

type Brand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  translations?: unknown;
};
type LocalizedName = { name: string };
type LocalizedContent = { fa?: LocalizedName; ckb?: LocalizedName };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function initialTranslations(value: unknown): LocalizedContent {
  const source = record(value);
  const read = (key: "fa" | "ckb") => {
    const content = record(source[key]);
    return typeof content.name === "string" ? { name: content.name } : { name: "" };
  };
  return { fa: read("fa"), ckb: read("ckb") };
}

export function BrandForm({ locale, action, initial, submitLabel }: {
  locale: Locale;
  action: CatalogFormAction;
  initial?: Brand;
  submitLabel: string;
}) {
  const m = (key: CatalogMessage) => catalogMessage(locale, key);
  const [state, formAction, pending] = useActionState(action, emptyCatalogFormState());
  const [translations, setTranslations] = useState(() => initialTranslations(initial?.translations));
  const text = (name: string, fallback = "") => {
    const value = fieldValue(state, name, fallback);
    return typeof value === "string" ? value : fallback;
  };
  const translationsPayload = Object.fromEntries(([
    ["fa", translations.fa], ["ckb", translations.ckb],
  ] as const).flatMap(([language, content]) => content?.name.trim() ? [[language, { name: content.name.trim() }]] : []));
  const updateTranslation = (language: "fa" | "ckb", name: string) => setTranslations((current) => ({ ...current, [language]: { name } }));

  return <form action={formAction} className="admin-panel admin-form" dir="rtl">
    <input type="hidden" name="translations" value={JSON.stringify(translationsPayload)} />
    {state.formError ? <div className="admin-notice admin-notice--error" role="alert" aria-live="assertive"><p>{state.formError}</p>{Object.entries(state.fieldErrors).length ? <ul>{Object.entries(state.fieldErrors).map(([field, error]) => <li key={field}><a href={`#${field}`}>{error}</a></li>)}</ul> : null}</div> : null}
    <div className="admin-grid">
      <Field label={m("brandName")} htmlFor="name" error={state.fieldErrors.name}><Input id="name" name="name" defaultValue={text("name", initial?.name)} required minLength={2} maxLength={160} /></Field>
      <Field label={m("brandSlug")} htmlFor="slug" error={state.fieldErrors.slug}><Input id="slug" name="slug" defaultValue={text("slug", initial?.slug)} placeholder="brand-name" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></Field>
    </div>
    <Field label={m("brandDescription")} htmlFor="description" error={state.fieldErrors.description}><Textarea id="description" name="description" defaultValue={text("description", initial?.description ?? "")} maxLength={1000} /></Field>
    <section className="admin-form-section" aria-labelledby={`brand-translations-${initial?.id ?? "new"}`}>
      <div className="admin-form-section__heading"><h2 id={`brand-translations-${initial?.id ?? "new"}`}>{m("localizedContent")} <HelpTooltip text={m("translationHint")} /></h2></div>
      <div className="admin-grid">{(["fa", "ckb"] as const).map((language) => <fieldset className="admin-form-card" key={language} lang={language} dir="rtl"><legend>{m(language === "fa" ? "persian" : "sorani")}</legend><Field label={m("translatedName")} htmlFor={`brand-${initial?.id ?? "new"}-${language}-name`}><Input id={`brand-${initial?.id ?? "new"}-${language}-name`} value={translations[language]?.name ?? ""} onChange={(event) => updateTranslation(language, event.target.value)} maxLength={160} /></Field></fieldset>)}</div>
    </section>
    <label className="admin-checkbox"><input type="checkbox" name="active" defaultChecked={state.submitted ? fieldValue(state, "active", initial?.active ?? true) === true : initial?.active ?? true} />{m("brandActive")}</label>
    <div className="admin-form__actions"><Button type="submit" disabled={pending} aria-disabled={pending}>{pending ? m("saving") : submitLabel}</Button></div>
  </form>;
}
