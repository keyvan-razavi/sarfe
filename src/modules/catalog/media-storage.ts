import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isSupportedImagePayload, type SupportedImageType } from "./validation";

export const MAX_CATALOG_IMAGE_BYTES = 8 * 1024 * 1024;
const extensions: Record<SupportedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const fileNamePattern = /^[a-f0-9-]{36}\.(?:jpg|png|webp)$/;

function storageDirectory() {
  return path.resolve(process.cwd(), ".local", "media", "products");
}

export function validCatalogImageName(fileName: string): boolean {
  return fileNamePattern.test(fileName);
}

export async function storeCatalogImage(bytes: Uint8Array, declaredType: string) {
  if (bytes.byteLength < 1 || bytes.byteLength > MAX_CATALOG_IMAGE_BYTES)
    throw new Error("Image size must be between 1 byte and 8 MB.");
  if (!isSupportedImagePayload(bytes, declaredType))
    throw new Error("Use a valid JPEG, PNG, or WebP image.");

  const mimeType = declaredType;
  const fileName = `${randomUUID()}.${extensions[mimeType]}`;
  const directory = storageDirectory();
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, fileName), bytes, { flag: "wx", mode: 0o644 });
  return { fileName, path: `/api/media/${fileName}`, mimeType };
}

export async function readCatalogImage(fileName: string) {
  if (!validCatalogImageName(fileName)) return null;
  try {
    const bytes = await readFile(path.join(storageDirectory(), fileName));
    const extension = path.extname(fileName).slice(1);
    const mimeType = extension === "jpg" ? "image/jpeg" : extension === "png" ? "image/png" : "image/webp";
    return { bytes, mimeType };
  } catch {
    return null;
  }
}
