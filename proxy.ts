import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  // Never trust a caller-supplied locale override; only this proxy may set it.
  requestHeaders.delete("x-sarfe-request-locale");
  const locale = request.nextUrl.searchParams.get("lang");
  if (locale !== "fa" && locale !== "ckb") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  requestHeaders.set("x-sarfe-request-locale", locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
