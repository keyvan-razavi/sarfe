"use client";

import { useActionState, useState } from "react";
import { Button, Field, Input, MediaPicker, Textarea } from "@/components/ui";
import type { Locale } from "@/lib/i18n";
import { homeContentMessage } from "./messages";
import { saveHomeContentAction } from "./actions";
import type { HomeContentFormState } from "./actions";
import type { HomePageContent } from "./validation";

const languages = ["fa", "ckb"] as const;
type Language = (typeof languages)[number];

export function HomeContentForm({ locale, initial, editable }: { locale: Locale; initial: HomePageContent; editable: boolean }) {
  const m = (key: Parameters<typeof homeContentMessage>[1]) => homeContentMessage(locale, key);
  const [state, formAction, pending] = useActionState(saveHomeContentAction, {} as HomeContentFormState);
  const [images, setImages] = useState(() => ({
    fa: { hero: initial.fa.heroImage, about: initial.fa.aboutImage },
    ckb: { hero: initial.ckb.heroImage, about: initial.ckb.aboutImage },
  }));
  const imageLabels = (label: string) => ({
    label,
    hint: m("uploadHint"),
    choose: m("chooseFile"),
    upload: m("upload"),
    uploading: m("uploading"),
    complete: m("uploaded"),
    failed: m("uploadFailed"),
    limit: m("invalid"),
    invalid: m("invalid"),
    count: locale === "fa" ? "تصویر" : "وێنە",
    primary: label,
    gallery: label,
    remove: m("remove"),
    empty: m("noImage"),
  });
  const field = (language: Language, key: keyof HomePageContent["fa"], label: string, initialValue: string, long = false) => {
    const name = `${language}.${key}`;
    return <Field label={label} htmlFor={name} key={name}>
      {long
        ? <Textarea id={name} name={name} defaultValue={initialValue} maxLength={2_000} required disabled={!editable} rows={4} />
        : <Input id={name} name={name} defaultValue={initialValue} maxLength={key.endsWith("Alt") ? 240 : 160} required disabled={!editable} />}
    </Field>;
  };

  return <form action={formAction} className="admin-panel admin-form" dir="rtl">
    {state.error ? <div className="admin-notice admin-notice--error" role="alert" aria-live="assertive"><p>{m("error")}</p><p>{state.error}</p></div> : null}
    {languages.map((language) => {
      const content = initial[language];
      const languageLabel = m(language === "fa" ? "persian" : "sorani");
      return <fieldset className="admin-form-section" key={language} lang={language} dir="rtl">
        <legend>{languageLabel}</legend>
        <section className="admin-form-section" aria-label={m("hero")}>
          <h2>{m("hero")}</h2>
          <div className="admin-stack">
            {field(language, "heroTitle", m("heroTitle"), content.heroTitle)}
            {field(language, "heroBody", m("heroBody"), content.heroBody, true)}
            {field(language, "ctaLabel", m("ctaLabel"), content.ctaLabel)}
            <MediaPicker
              id={`${language}-hero-image`}
              locale={locale}
              paths={[images[language].hero]}
              onPathsChange={(paths) => setImages((current) => ({ ...current, [language]: { ...current[language], hero: paths[0] ?? "" } }))}
              labels={imageLabels(m("heroImage"))}
              disabled={!editable}
            />
            <input type="hidden" name={`${language}.heroImage`} value={images[language].hero} />
            {field(language, "heroImageAlt", m("heroImageAlt"), content.heroImageAlt)}
          </div>
        </section>
        <section className="admin-form-section" aria-label={m("health")}>
          <h2>{m("health")}</h2>
          <div className="admin-stack">
            {field(language, "healthTitle", m("healthTitle"), content.healthTitle)}
            {field(language, "healthBody", m("healthBody"), content.healthBody, true)}
          </div>
        </section>
        <section className="admin-form-section" aria-label={m("culture")}>
          <h2>{m("culture")}</h2>
          <div className="admin-stack">
            {field(language, "cultureTitle", m("cultureTitle"), content.cultureTitle)}
            {field(language, "cultureBody", m("cultureBody"), content.cultureBody, true)}
          </div>
        </section>
        <section className="admin-form-section" aria-label={m("about")}>
          <h2>{m("about")}</h2>
          <div className="admin-stack">
            {field(language, "aboutTitle", m("aboutTitle"), content.aboutTitle)}
            {field(language, "aboutBody", m("aboutBody"), content.aboutBody, true)}
            <MediaPicker
              id={`${language}-about-image`}
              locale={locale}
              paths={[images[language].about]}
              onPathsChange={(paths) => setImages((current) => ({ ...current, [language]: { ...current[language], about: paths[0] ?? "" } }))}
              labels={imageLabels(m("aboutImage"))}
              disabled={!editable}
            />
            <input type="hidden" name={`${language}.aboutImage`} value={images[language].about} />
            {field(language, "aboutImageAlt", m("aboutImageAlt"), content.aboutImageAlt)}
          </div>
        </section>
      </fieldset>;
    })}
    <div className="admin-form-actions"><Button type="submit" disabled={!editable || pending}>{pending ? m("uploading") : m("save")}</Button></div>
  </form>;
}
