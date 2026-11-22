import 'server-only';
import { scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { customerLoginSchema, customerProfileSchema, customerRegistrationSchema, hashCustomerPassword, type CustomerProfile, type RegistrationResult } from './domain';

const COOKIE_NAME = 'sarfe_customer_session';
const SESSION_SECONDS = 60 * 60 * 24 * 14;
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const ISSUER = 'sarfe-customer-account';
const AUDIENCE = 'sarfe-customer';

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('Customer authentication is not configured.');
  return new TextEncoder().encode(secret);
}

async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [scheme, n, r, p, saltHex, keyHex] = encoded.split('$');
  if (scheme !== 'scrypt' || Number(n) !== SCRYPT_N || Number(r) !== SCRYPT_R || Number(p) !== SCRYPT_P ||
    !/^[a-f\d]{32}$/i.test(saltHex ?? '') || !/^[a-f\d]{128}$/i.test(keyHex ?? '')) return false;
  try {
    const expected = Buffer.from(keyHex!, 'hex');
    const actual = await new Promise<Buffer>((resolve, reject) => scryptCallback(password, Buffer.from(saltHex!, 'hex'), 64, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024 }, (error, derived) => error ? reject(error) : resolve(derived)));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}

async function assertSameOrigin(): Promise<void> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get('origin');
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  if (!origin || !host) throw new Error('Request origin could not be verified.');
  try {
    if (new URL(origin).host.toLowerCase() !== host.toLowerCase()) throw new Error('Request origin could not be verified.');
  } catch { throw new Error('Request origin could not be verified.'); }
}

async function setCustomerSession(customer: CustomerProfile): Promise<void> {
  const token = await new SignJWT({ role: 'customer', customerId: customer.id })
    .setProtectedHeader({ alg: 'HS256' }).setIssuer(ISSUER).setAudience(AUDIENCE)
    .setIssuedAt().setExpirationTime(`${SESSION_SECONDS}s`).sign(secretKey());
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
}

function toProfile(customer: { id: string; name: string; email: string; phone: string }): CustomerProfile {
  return { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone };
}

export async function registerCustomer(raw: unknown): Promise<RegistrationResult> {
  await assertSameOrigin();
  const parsed = customerRegistrationSchema.safeParse(raw);
  if (!parsed.success) return { success: false, reason: 'invalid' };
  secretKey();
  const passwordHash = await hashCustomerPassword(parsed.data.password);
  try {
    const customerData = { name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone };
    const customer = await prisma.customer.create({ data: { ...customerData, passwordHash }, select: { id: true, name: true, email: true, phone: true } });
    await setCustomerSession(customer);
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { success: false, reason: 'exists' };
    throw error;
  }
}

export async function loginCustomer(emailInput: unknown, passwordInput: unknown): Promise<boolean> {
  await assertSameOrigin();
  const parsed = customerLoginSchema.safeParse({ email: emailInput, password: passwordInput });
  if (!parsed.success) return false;
  secretKey();
  const customer = await prisma.customer.findUnique({ where: { email: parsed.data.email } });
  const hash = customer?.passwordHash ?? await hashCustomerPassword('customer-login-placeholder-password');
  const passwordOkay = await verifyPassword(parsed.data.password, hash);
  if (!customer || !passwordOkay) return false;
  await setCustomerSession(toProfile(customer));
  return true;
}

export async function getCustomerSession(): Promise<CustomerProfile | null> {
  let customerId: string;
  try {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE });
    if (payload.role !== 'customer' || typeof payload.customerId !== 'string') return null;
    customerId = payload.customerId;
  } catch { return null; }
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true, email: true, phone: true } });
  return customer ? toProfile(customer) : null;
}

export async function requireCustomer(): Promise<CustomerProfile> {
  const customer = await getCustomerSession();
  if (!customer) throw new Error('Sign in to view your account.');
  return customer;
}

export async function updateCustomerProfile(raw: unknown): Promise<CustomerProfile | null> {
  await assertSameOrigin();
  const customer = await requireCustomer();
  const parsed = customerProfileSchema.safeParse(raw);
  if (!parsed.success) return null;
  const updated = await prisma.customer.update({ where: { id: customer.id }, data: parsed.data, select: { id: true, name: true, email: true, phone: true } });
  return toProfile(updated);
}

export async function signOutCustomer(): Promise<void> {
  await assertSameOrigin();
  (await cookies()).set(COOKIE_NAME, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
}
