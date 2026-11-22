import "server-only";
import { scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { isOwnerSession } from "./session-policy";

function deriveScrypt(
  password: string,
  salt: Buffer,
  keyLength: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(
      password,
      salt,
      keyLength,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024 },
      (error, derived) => (error ? reject(error) : resolve(derived)),
    ),
  );
}
const COOKIE_NAME = "sarfe_owner_session";
const SESSION_SECONDS = 60 * 60 * 8;
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32)
    throw new Error("Owner authentication is not configured.");
  return new TextEncoder().encode(secret);
}
function config() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!email || !passwordHash)
    throw new Error("Owner authentication is not configured.");
  secretKey();
  return { email, passwordHash };
}
async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const [scheme, n, r, p, saltHex, hashHex] = encoded.split("$");
  if (
    scheme !== "scrypt" ||
    Number(n) !== SCRYPT_N ||
    Number(r) !== SCRYPT_R ||
    Number(p) !== SCRYPT_P ||
    !/^[a-f\d]{32,}$/i.test(saltHex ?? "") ||
    !/^[a-f\d]{64,}$/i.test(hashHex ?? "") ||
    hashHex!.length % 2
  )
    return false;
  try {
    const expected = Buffer.from(hashHex!, "hex");
    const actual = await deriveScrypt(
      password,
      Buffer.from(saltHex!, "hex"),
      expected.length,
    );
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}
async function assertSameOrigin(): Promise<void> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!origin || !host)
    throw new Error("Request origin could not be verified.");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new Error("Request origin could not be verified.");
  }
  if (originHost.toLowerCase() !== host.toLowerCase())
    throw new Error("Request origin could not be verified.");
}
export async function signInOwner(
  emailInput: string,
  password: string,
): Promise<boolean> {
  const owner = config();
  const email = emailInput.trim().toLowerCase();
  const okay = await verifyPassword(password, owner.passwordHash);
  if (email !== owner.email || !okay) return false;
  const token = await new SignJWT({ role: "owner", email: owner.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secretKey());
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // The owner session is also required by CMS APIs under /api/admin.
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return true;
}

export async function hasOwnerSession(): Promise<boolean> {
  try {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) return false;
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    const owner = config();
    return isOwnerSession(
      { role: payload.role, email: payload.email },
      owner.email,
    );
  } catch {
    return false;
  }
}
export async function requireOwner(): Promise<void> {
  if (!(await hasOwnerSession()))
    throw new Error("Sign in to manage the catalog.");
}
export async function signOutOwner(): Promise<void> {
  await assertSameOrigin();
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
export async function loginOwner(
  email: string,
  password: string,
): Promise<boolean> {
  await assertSameOrigin();
  return signInOwner(email, password);
}
