import assert from 'node:assert/strict';
import test from 'node:test';
import { isMockPaymentsEnabled, mockPaymentRequestSchema } from '../src/modules/mock-payments/domain';

test('mock payment route is enabled only behind both explicit local gates', () => {
  assert.equal(isMockPaymentsEnabled({ NODE_ENV: 'development', MOCK_PAYMENTS_ENABLED: 'true' }), true);
  assert.equal(isMockPaymentsEnabled({ NODE_ENV: 'test', MOCK_PAYMENTS_ENABLED: 'true' }), true);
  assert.equal(isMockPaymentsEnabled({ NODE_ENV: 'production', MOCK_PAYMENTS_ENABLED: 'true' }), false);
  assert.equal(isMockPaymentsEnabled({ NODE_ENV: 'development', MOCK_PAYMENTS_ENABLED: 'false' }), false);
  assert.equal(isMockPaymentsEnabled({ NODE_ENV: 'development' }), false);
});

test('mock payment requests accept only a bounded order, attempt key and fixed scenario', () => {
  const valid = mockPaymentRequestSchema.parse({ orderId: 'order-1', attemptKey: 'attempt-key-123', scenario: 'APPROVED' });
  assert.equal(valid.scenario, 'APPROVED');
  assert.equal(mockPaymentRequestSchema.safeParse({ ...valid, scenario: 'PAID' }).success, false);
  assert.equal(mockPaymentRequestSchema.safeParse({ ...valid, ownerId: 'attacker' }).success, false);
  assert.equal(mockPaymentRequestSchema.safeParse({ ...valid, attemptKey: 'x' }).success, false);
});
