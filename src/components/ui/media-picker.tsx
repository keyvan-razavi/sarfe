"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "./button";
import { Field } from "./field";
import { HelpTooltip } from "./help-tooltip";
import { canSelectMediaFiles, currentMediaPaths, mergeUploadedMediaPaths } from "./media-picker-state";
import type { Locale } from "@/lib/i18n";
import styles from "./media-picker.module.css";

export type MediaPickerLabels = {
  label: string;
  hint: string;
  choose: string;
  upload: string;
  uploading: string;
  complete: string;
  failed: string;
  limit: string;
  invalid: string;
  count: string;
  primary: string;
  gallery: string;
  remove: string;
  empty: string;
};

export function MediaPicker({
  id, locale, paths, onPathsChange, labels, maxFiles = 1, error, disabled = false,
}: {
  id: string;
  locale: Locale;
  paths: string[];
  onPathsChange: (paths: string[]) => void;
  labels: MediaPickerLabels;
  maxFiles?: number;
  error?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  // A cleared controlled image field may arrive as [""]. Treat it as empty so
  // it cannot create an invalid <Image src=""> or consume an upload slot.
  const currentPaths = currentMediaPaths(paths);

  async function uploadSelection() {
    const files = Array.from(inputRef.current?.files ?? []);
    if (!files.length) {
      inputRef.current?.focus();
      return;
    }
    if (!canSelectMediaFiles(currentPaths, files.length, maxFiles)) {
      setStatus(labels.limit);
      return;
    }
    const accepted = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (files.some((file) => !accepted.has(file.type) || file.size > 8 * 1024 * 1024)) {
      setStatus(labels.invalid);
      return;
    }

    setPending(true);
    setStatus(labels.uploading);
    const uploaded: string[] = [];
    try {
      for (const file of files) {
        const form = new FormData();
        form.set("file", file);
        const response = await fetch("/api/admin/media", { method: "POST", body: form, credentials: "same-origin" });
        const result = await response.json() as { path?: unknown };
        if (!response.ok || typeof result.path !== "string") throw new Error("upload failed");
        uploaded.push(result.path);
      }
      onPathsChange(mergeUploadedMediaPaths(currentPaths, uploaded, maxFiles));
      if (inputRef.current) inputRef.current.value = "";
      setStatus(labels.complete);
    } catch {
      if (uploaded.length) {
        onPathsChange(mergeUploadedMediaPaths(currentPaths, uploaded, maxFiles));
      }
      setStatus(labels.failed);
    } finally {
      setPending(false);
    }
  }

  return <section className={styles.root} aria-labelledby={`${id}-heading`}>
    <div className={styles.heading}>
      <div className={styles.headingTitle}>
        <h2 id={`${id}-heading`}>{labels.label}</h2>
        <HelpTooltip id={`${id}-upload-hint`} text={labels.hint} />
      </div>
      <span className={styles.count}>{labels.count}: {new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "ckb-IQ").format(currentPaths.length)} / {maxFiles}</span>
    </div>
    <Field label={labels.choose} htmlFor={`${id}-files`} error={error}>
      <input ref={inputRef} id={`${id}-files`} className={styles.input} type="file" accept="image/jpeg,image/png,image/webp" multiple={maxFiles > 1} disabled={pending || disabled} />
    </Field>
    <div className={styles.actions}>
      <Button type="button" variant="secondary" onClick={uploadSelection} disabled={pending || disabled}>{pending ? labels.uploading : labels.upload}</Button>
      <span className={styles.status} role="status" aria-live="polite">{status}</span>
    </div>
    {currentPaths.length ? <ul className={styles.grid} aria-label={labels.label}>
      {currentPaths.map((path, index) => <li className={styles.card} key={`${path}-${index}`}>
        <span className={styles.preview}><Image src={path} alt="" fill unoptimized sizes="(max-width: 640px) 42vw, 180px" /></span>
        <div className={styles.cardFooter}>
          <span>{index === 0 ? labels.primary : labels.gallery} {new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "ckb-IQ").format(index + 1)}</span>
          <button type="button" className={styles.remove} onClick={() => onPathsChange(currentPaths.filter((_, itemIndex) => itemIndex !== index))} disabled={pending || disabled}>{labels.remove}</button>
        </div>
      </li>)}
    </ul> : <p className={styles.empty}>{labels.empty}</p>}
  </section>;
}
