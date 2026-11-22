import type { NextConfig } from "next";
import { getProductionSiteUrl } from "./src/lib/site-config";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
];

if (process.env.NODE_ENV === "production" && getProductionSiteUrl(process.env.APP_URL)) {
  securityHeaders.push({ key: "Strict-Transport-Security", value: "max-age=31536000" });
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Use TypeScript's compiler API for build checks. The CLI subprocess path
  // produces empty captured output in restricted environments, breaking Next's
  // --showConfig parsing even though standalone type checks succeed.
  experimental: { useTypeScriptCli: false },
  // Firefox may resolve localhost to 127.0.0.1 while requesting the dev HMR
  // websocket. Allow both loopback hostnames so client hydration works locally.
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
