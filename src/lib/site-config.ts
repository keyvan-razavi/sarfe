import { isIP } from "node:net";

type IndexingConfig = {
  appUrl: string | undefined;
  indexable: string | undefined;
  nodeEnv: string | undefined;
};

function isPublicDnsHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host || isIP(host) !== 0 || !host.includes(".")) return false;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".test") ||
    host.endsWith(".example") ||
    host.endsWith(".invalid") ||
    host.endsWith(".home.arpa")
  ) {
    return false;
  }

  const labels = host.split(".");
  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
  );
}

/** Returns a validated public HTTPS site origin, or null for unsafe/invalid configuration. */
export function getProductionSiteUrl(appUrl: string | undefined): URL | null {
  if (!appUrl) return null;

  try {
    const url = new URL(appUrl);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      !isPublicDnsHostname(url.hostname)
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/** Canonical indexing requires an explicit opt-in and validated production HTTPS URL. */
export function getIndexableSiteUrl(config: IndexingConfig): URL | null {
  if (config.indexable !== "true" || config.nodeEnv !== "production") return null;
  return getProductionSiteUrl(config.appUrl);
}
