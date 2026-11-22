/** Local image paths accepted by storefront and catalog image handling. */
export function isLocalImagePath(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const publicAsset = /^\/images\/[A-Za-z0-9][A-Za-z0-9/_\-.]*$/.test(value);
  const uploadedAsset = /^\/api\/media\/[a-f0-9-]{36}\.(?:jpg|png|webp)$/.test(value);
  return (publicAsset || uploadedAsset) &&
    !value.includes("..") && !value.includes("//") &&
    !value.includes("\\") && !value.includes("?") && !value.includes("#");
}

export function safeLocalImagePaths(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(isLocalImagePath) : [];
}
