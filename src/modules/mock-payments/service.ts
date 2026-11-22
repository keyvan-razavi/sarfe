import 'server-only';
import { Prisma, type MockPaymentOutcome } from '@prisma/client';
import { prisma } from '@/lib/db';
import { isMockPaymentsEnabled, mockPaymentRequestSchema, type MockPaymentScenario } from './domain';

export type MockPaymentAttempt = {
  id: string;
  orderId: string;
  outcome: MockPaymentOutcome;
  amountMinor: number;
  currency: string;
  createdAt: Date;
};

function toAttempt(attempt: { id: string; orderId: string; outcome: MockPaymentOutcome; amountMinor: bigint; currency: string; createdAt: Date }): MockPaymentAttempt {
  const amountMinor = Number(attempt.amountMinor);
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) throw new Error('Stored simulated amount exceeds the supported range.');
  return { ...attempt, amountMinor };
}

function replayMatches(attempt: { orderId: string; outcome: MockPaymentOutcome }, orderId: string, scenario: MockPaymentScenario): boolean {
  return attempt.orderId === orderId && attempt.outcome === scenario;
}

export async function simulateOrderPayment(customerId: string, raw: unknown): Promise<MockPaymentAttempt> {
  if (!isMockPaymentsEnabled(process.env)) throw new Error('Mock payment simulation is disabled.');
  if (!process.env.DATABASE_URL) throw new Error('Mock payment simulation requires configured PostgreSQL.');
  if (!customerId.trim()) throw new Error('Customer identity is required.');
  const request = mockPaymentRequestSchema.parse(raw);
  const prior = await prisma.paymentAttempt.findUnique({ where: { attemptKey: request.attemptKey } });
  if (prior) {
    const owner = await prisma.order.findFirst({
      where: { id: prior.orderId, customerId, status: 'RESERVED', expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!owner) throw new Error('Order is unavailable.');
    if (!replayMatches(prior, request.orderId, request.scenario)) throw new Error('This attempt key was already used for a different simulation.');
    return toAttempt(prior);
  }
  try {
    const attempt = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; status: string; expiresAt: Date; totalMinor: bigint; currency: string }>>`
        SELECT id, status, "expiresAt", "totalMinor", currency FROM "Order"
        WHERE id = ${request.orderId} AND "customerId" = ${customerId}
        FOR UPDATE
      `;
      const order = rows[0];
      if (!order) throw new Error('Order is unavailable.');
      if (order.status !== 'RESERVED' || order.expiresAt <= new Date()) throw new Error('Only an active reservation can be simulated.');
      return tx.paymentAttempt.create({ data: {
        orderId: order.id,
        attemptKey: request.attemptKey,
        outcome: request.scenario,
        amountMinor: order.totalMinor,
        currency: order.currency,
      } });
    });
    return toAttempt(attempt);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const concurrent = await prisma.paymentAttempt.findUnique({ where: { attemptKey: request.attemptKey } });
      if (concurrent && replayMatches(concurrent, request.orderId, request.scenario)) {
        const owner = await prisma.order.findFirst({
          where: { id: concurrent.orderId, customerId, status: 'RESERVED', expiresAt: { gt: new Date() } },
          select: { id: true },
        });
        if (owner) return toAttempt(concurrent);
      }
      throw new Error('This attempt key was already used for a different simulation.');
    }
    throw error;
  }
}

export async function listOrderPaymentAttempts(customerId: string, orderId: string): Promise<MockPaymentAttempt[]> {
  if (!customerId.trim() || !orderId.trim()) throw new Error('Customer and order IDs are required.');
  const owner = await prisma.order.findFirst({
    where: { id: orderId, customerId, status: 'RESERVED', expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (!owner) throw new Error('Order is unavailable.');
  const attempts = await prisma.paymentAttempt.findMany({ where: { orderId: owner.id }, orderBy: { createdAt: 'desc' } });
  return attempts.map(toAttempt);
}
