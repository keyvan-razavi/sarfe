import { z } from 'zod';

export type MockPaymentsEnvironment = {
  NODE_ENV?: string;
  MOCK_PAYMENTS_ENABLED?: string;
};

export function isMockPaymentsEnabled(environment: MockPaymentsEnvironment): boolean {
  return environment.NODE_ENV !== 'production' && environment.MOCK_PAYMENTS_ENABLED === 'true';
}

export const mockPaymentRequestSchema = z.object({
  orderId: z.string().trim().min(1).max(128),
  attemptKey: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),
  scenario: z.enum(['APPROVED', 'DECLINED']),
}).strict();

export type MockPaymentRequest = z.infer<typeof mockPaymentRequestSchema>;
export type MockPaymentScenario = MockPaymentRequest['scenario'];
