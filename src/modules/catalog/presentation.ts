import type { Locale } from "@/lib/i18n";

/** Resolve a display name from catalog translations without changing stored data. */
export function localizedCatalogName(
  fallback: string,
  translations: unknown,
  locale: Locale,
): string {
  if (!translations || typeof translations !== "object" || Array.isArray(translations))
    return fallback;

  const localized = (translations as Record<string, unknown>)[locale];
  if (!localized || typeof localized !== "object" || Array.isArray(localized))
    return fallback;

  const name = (localized as Record<string, unknown>).name;
  return typeof name === "string" && name.trim() ? name : fallback;
}
