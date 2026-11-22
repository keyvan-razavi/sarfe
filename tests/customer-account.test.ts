import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { customerProfileSchema, customerRegistrationSchema, hashCustomerPassword } from '../src/modules/customer-account/domain';
import { orderRequestSchema, requestFingerprint } from '../src/modules/orders/domain';

test('customer registration normalizes email and validates required profile and password fields', () => {
  const parsed = customerRegistrationSchema.parse({ name: '  Buyer  ', email: '  BUYER@Example.test ', phone: ' 021 123 ', password: 'long-enough-password' });
  assert.equal(parsed.name, 'Buyer');
  assert.equal(parsed.email, 'buyer@example.test');
  assert.equal(parsed.phone, '021 123');
  assert.equal(customerRegistrationSchema.safeParse({ ...parsed, password: 'short' }).success, false);
  assert.equal(customerRegistrationSchema.safeParse({ ...parsed, email: 'invalid' }).success, false);
});

test('profile updates trim safe public fields and exclude email or password input', () => {
  const parsed = customerProfileSchema.parse({ name: ' Customer ', phone: '+98 21', email: 'ignored@example.test', passwordHash: 'secret' });
  assert.deepEqual(parsed, { name: 'Customer', phone: '+98 21' });
});

test('stored customer password material is a salted one-way scrypt encoding', async () => {
  const password = 'customer-test-password';
  const hash = await hashCustomerPassword(password);
  assert.match(hash, /^scrypt\$32768\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  assert.notEqual(hash, password);
  assert.notEqual(await hashCustomerPassword(password), hash);
});

test('order fingerprint distinguishes an authenticated customer from guest checkout', () => {
  const request = orderRequestSchema.parse({
    idempotencyKey: 'customer-fingerprint-1',
    customer: { name: 'Buyer', email: 'buyer@example.test', phone: '021' },
    address: { countryCode: 'IR', region: 'Tehran', locality: 'Tehran', postalCode: '1234567890', line1: 'Test' },
    items: [{ variantId: 'variant-1', quantity: 1 }],
  });
  const guest = requestFingerprint(request, 'policy-v1');
  const legacyGuest = createHash('sha256').update(JSON.stringify({ customer: request.customer, address: request.address, items: [...request.items].sort((a, b) => a.variantId.localeCompare(b.variantId)), policyId: 'policy-v1' })).digest('hex');
  const customer = requestFingerprint(request, 'policy-v1', 'customer-1');
  assert.equal(guest, legacyGuest);
  assert.notEqual(guest, customer);
  assert.notEqual(customer, requestFingerprint(request, 'policy-v1', 'customer-2'));
});
