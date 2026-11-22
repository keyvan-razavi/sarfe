import { NextResponse, type NextRequest } from "next/server";
import { hasOwnerSession } from "@/modules/identity";
import { MAX_CATALOG_IMAGE_BYTES, storeCatalogImage } from "@/modules/catalog/media-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  try {
    if (!(await hasOwnerSession())) return NextResponse.json({ error: "Sign in to upload images." }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Image upload is unavailable." }, { status: 503 });
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_CATALOG_IMAGE_BYTES + 64 * 1024)
    return NextResponse.json({ error: "Image size must be 8 MB or less." }, { status: 413 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
    if (file.size < 1 || file.size > MAX_CATALOG_IMAGE_BYTES)
      return NextResponse.json({ error: "Image size must be between 1 byte and 8 MB." }, { status: 413 });
    const result = await storeCatalogImage(new Uint8Array(await file.arrayBuffer()), file.type);
    return NextResponse.json({ path: result.path, type: result.mimeType, size: file.size });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not store image.";
    const clientError = /valid JPEG|image size/i.test(message);
    return NextResponse.json({ error: clientError ? message : "Could not store image." }, { status: clientError ? 400 : 500 });
  }
}
