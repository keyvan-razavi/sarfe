import "server-only";
import { cookies, headers } from "next/headers";
import { isLocale, type Locale } from "@/lib/i18n";

export async function getLocale(): Promise<Locale> {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const requestLocale = requestHeaders.get("x-sarfe-request-locale");
  if (isLocale(requestLocale)) return requestLocale;
  const value = cookieStore.get("sarfe-locale")?.value ?? null;
  return isLocale(value) ? value : "fa";
}
