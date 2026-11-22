"use client";

import { useState } from "react";
import { MediaPicker } from "@/components/ui";
import type { Locale } from "@/lib/i18n";
import { catalogMessage } from "./messages";

export function CatalogMediaPicker({ locale, paths, error }: { locale: Locale; paths: string[]; error?: string }) {
  const m = (key: Parameters<typeof catalogMessage>[1]) => catalogMessage(locale, key);
  const [images, setImages] = useState(paths);
  return <>
    <input type="hidden" name="image" value={images[0] ?? ""} />
    <input type="hidden" name="images" value={images.slice(1).join("\n")} />
    <MediaPicker
      id="product-images"
      locale={locale}
      paths={images}
      onPathsChange={setImages}
      maxFiles={20}
      error={error}
      disabled={false}
      labels={{
        label: m("productImages"),
        hint: m("uploadTypes"),
        choose: m("chooseImageFiles"),
        upload: m("uploadImages"),
        uploading: m("uploading"),
        complete: m("uploadComplete"),
        failed: m("uploadFailed"),
        limit: m("uploadLimit"),
        invalid: m("uploadFileInvalid"),
        count: m("imageCount"),
        primary: m("primaryImage"),
        gallery: m("galleryImage"),
        remove: m("removeImage"),
        empty: m("noProductImages"),
      }}
    />
  </>;
}
