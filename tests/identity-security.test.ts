import assert from 'node:assert/strict';
import test from 'node:test';
import { isOwnerSession } from '../src/modules/identity/session-policy';

test('CMS authorization accepts only a configured owner identity and role', () => {
  assert.equal(isOwnerSession({ role: 'owner', email: 'owner@example.test' }, 'owner@example.test'), true);
  assert.equal(isOwnerSession({ role: 'customer', email: 'owner@example.test' }, 'owner@example.test'), false);
  assert.equal(isOwnerSession({ role: 'owner', email: 'other@example.test' }, 'owner@example.test'), false);
  assert.equal(isOwnerSession({ role: 'owner', email: 'owner@example.test' }, null), false);
});
