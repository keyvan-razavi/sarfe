import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { z } from 'zod';

const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
export const customerRegistrationSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: emailSchema,
  phone: z.string().trim().min(1).max(40),
  password: z.string().min(12).max(256),
});
export const customerLoginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(256) });
export const customerProfileSchema = z.object({ name: z.string().trim().min(1).max(160), phone: z.string().trim().min(1).max(40) });

export type CustomerProfile = { id: string; name: string; email: string; phone: string };
export type RegistrationResult = { success: true } | { success: false; reason: 'invalid' | 'exists' };

function deriveScrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCallback(password, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024,
  }, (error, derived) => error ? reject(error) : resolve(derived)));
}

export async function hashCustomerPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveScrypt(password, salt);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${key.toString('hex')}`;
}
