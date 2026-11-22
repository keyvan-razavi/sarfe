import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes, scryptSync } from "node:crypto";
import test from "node:test";
import { loadEnvConfig } from "@next/env";

Object.assign(globalThis, { AsyncLocalStorage });

if (process.env.SARFE_OWNER_LOGIN_PROBE_PASSWORD) loadEnvConfig(process.cwd());

async function inNextActionRequest<T>(run: () => Promise<T>): Promise<T> {
  const [
    { HeadersAdapter },
    { RequestCookies, ResponseCookies },
    { workAsyncStorage },
    { workUnitAsyncStorage },
  ] = await Promise.all([
    import("next/dist/server/web/spec-extension/adapters/headers"),
    import("next/dist/server/web/spec-extension/cookies"),
    import("next/dist/server/app-render/work-async-storage.external"),
    import("next/dist/server/app-render/work-unit-async-storage.external"),
  ]);
  const incoming = new Headers({ host: "localhost:3000", origin: "http://localhost:3000" });
  const requestCookies = new RequestCookies(incoming);
  const responseCookies = new ResponseCookies(new Headers());
  return workAsyncStorage.run({ route: "/admin", page: "/admin/page", forceStatic: false, dynamicShouldError: false } as never, () =>
    workUnitAsyncStorage.run({
      type: "request",
      phase: "action",
      implicitTags: [],
      url: { pathname: "/admin", search: "" },
      headers: HeadersAdapter.seal(incoming),
      cookies: requestCookies,
      mutableCookies: responseCookies,
      userspaceMutableCookies: responseCookies,
      draftMode: {},
      rootParams: {},
      resumeDataCache: null,
    } as never, run),
  );
}

test("owner login does not lock out a valid password after failed attempts", async () => {
  const configuredPassword = process.env.SARFE_OWNER_LOGIN_PROBE_PASSWORD;
  if (configuredPassword) {
    const email = process.env.ADMIN_EMAIL;
    assert.ok(email);
    const { loginOwner } = await import("../src/modules/identity/service");
    assert.equal(await inNextActionRequest(() => loginOwner(email, configuredPassword)), true);
    return;
  }

  const original = {
    email: process.env.ADMIN_EMAIL,
    hash: process.env.ADMIN_PASSWORD_HASH,
    secret: process.env.SESSION_SECRET,
  };
  const email = "owner-login-test@example.test";
  const password = "valid-test-password";
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  process.env.ADMIN_EMAIL = email;
  process.env.ADMIN_PASSWORD_HASH = `scrypt$32768$8$1$${salt.toString("hex")}$${hash.toString("hex")}`;
  process.env.SESSION_SECRET = randomBytes(32).toString("hex");

  try {
    const { signInOwner } = await import("../src/modules/identity/service");
    await inNextActionRequest(async () => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        assert.equal(await signInOwner(email, "wrong-password"), false);
      }
      assert.equal(await signInOwner(email, password), true);
    });
  } finally {
    if (original.email === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = original.email;
    if (original.hash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
    else process.env.ADMIN_PASSWORD_HASH = original.hash;
    if (original.secret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = original.secret;
  }
});
