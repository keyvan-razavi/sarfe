import 'server-only';
import { Prisma, type Order } from '@prisma/client';
import { prisma } from '@/lib/db';
import { loadOrderableVariants, reservePublishedVariantStock, restoreVariantStock } from '@/modules/catalog';
import { orderRequestSchema, priceOrder, requestFingerprint, type OrderPricingPolicy } from './domain';

export type ReservedOrderResult = { id: string; status: 'RESERVED'; currency: string; totalMinor: number; expiresAt: Date; replayed: boolean };
const RESERVATION_MS = 20 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const publicOrder = (order: Order, replayed: boolean): ReservedOrderResult => {
  if (order.status !== 'RESERVED') throw new Error('This idempotency key belongs to a reservation that has ended.');
  const totalMinor = Number(order.totalMinor);
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0) throw new Error('Stored order total exceeds the supported amount.');
  return { id: order.id, status: 'RESERVED', currency: order.currency, totalMinor, expiresAt: order.expiresAt, replayed };
};
async function findReplay(key: string, fingerprint: string): Promise<ReservedOrderResult | null> {
  const existing = await prisma.order.findUnique({ where: { idempotencyKey: key } });
  if (!existing) return null;
  if (existing.requestFingerprint !== fingerprint) throw new Error('This idempotency key was already used for a different request.');
  if (existing.status === 'RESERVED' && existing.expiresAt <= new Date()) {
    await releaseOrder(existing.id, 'EXPIRED', new Date());
    throw new Error('This reservation has expired and cannot be recreated with the same idempotency key.');
  }
  return publicOrder(existing, true);
}
async function retrySerializable<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try { return await operation(); }
    catch (error) {
      lastError = error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') continue;
      throw error;
    }
  }
  throw lastError ?? new Error('Could not complete transaction after retrying serialization conflicts.');
}
async function releaseInTransaction(tx: Prisma.TransactionClient, id: string, status: 'EXPIRED' | 'CANCELED', now: Date): Promise<boolean> {
  const order = await tx.order.findUnique({ where: { id }, include: { lines: true } });
  if (!order || order.status !== 'RESERVED' || order.releasedAt) return false;
  if (status === 'EXPIRED' && order.expiresAt > now) return false;
  const changed = await tx.order.updateMany({ where: { id, status: 'RESERVED', releasedAt: null }, data: { status, releasedAt: now } });
  if (changed.count !== 1) return false;
  for (const line of order.lines) {
    if (line.variantId && line.reservedRemaining > 0) {
      await restoreVariantStock(tx, line.variantId, line.reservedRemaining);
    }
    await tx.orderLine.update({ where: { id: line.id }, data: { reservedRemaining: 0 } });
  }
  return true;
}
export async function createReservedOrder(raw: unknown, policy: OrderPricingPolicy, customerId: string | null = null): Promise<ReservedOrderResult> {
  if (!process.env.DATABASE_URL) throw new Error('Order reservations require configured PostgreSQL.');
  const request = orderRequestSchema.parse(raw);
  if (customerId !== null && (typeof customerId !== 'string' || !customerId.trim() || customerId.length > 128)) throw new Error('Customer identity is invalid.');
  if (!policy.id.trim() || policy.id.length > 100) throw new Error('A stable server pricing policy identifier is required.');
  const fingerprint = requestFingerprint(request, policy.id, customerId);
  const replay = await findReplay(request.idempotencyKey, fingerprint);
  if (replay) return replay;
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const prior = await tx.order.findUnique({ where: { idempotencyKey: request.idempotencyKey } });
        if (prior) {
          if (prior.requestFingerprint !== fingerprint) throw new Error('This idempotency key was already used for a different request.');
          if (prior.status !== 'RESERVED' || prior.expiresAt <= new Date()) throw new Error('This reservation has expired and cannot be recreated with the same idempotency key.');
          return publicOrder(prior, true);
        }
        const variants = await loadOrderableVariants(tx, request.items.map((item) => item.variantId));
        const priced = await priceOrder(request, variants, policy);
        for (const item of request.items) if (!await reservePublishedVariantStock(tx, item.variantId, item.quantity)) throw new Error('Insufficient stock for one or more variants.');
        const expiresAt = new Date(Date.now() + RESERVATION_MS);
        const order = await tx.order.create({ data: {
          idempotencyKey: request.idempotencyKey, requestFingerprint: fingerprint, customerId, customerSnapshot: priced.customer, addressSnapshot: priced.address,
          currency: priced.currency, subtotalMinor: BigInt(priced.subtotalMinor), shippingMinor: BigInt(priced.shippingMinor), taxMinor: BigInt(priced.taxMinor), totalMinor: BigInt(priced.totalMinor),
          shippingPolicy: priced.shippingPolicy, taxPolicy: priced.taxPolicy, expiresAt,
          lines: { create: priced.lines.map((line) => ({ variantId: line.variantId, productNameSnapshot: line.productName, variantNameSnapshot: line.variantName, skuSnapshot: line.sku, quantity: line.quantity, reservedRemaining: line.quantity, unitPriceMinor: line.unitPriceMinor, lineTotalMinor: BigInt(line.lineTotalMinor), currency: line.currency })) },
        } });
        return publicOrder(order, false);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
    } catch (error) {
      lastError = error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const concurrentReplay = await findReplay(request.idempotencyKey, fingerprint);
        if (concurrentReplay) return concurrentReplay;
        continue;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') continue;
      throw error;
    }
  }
  throw lastError ?? new Error('Could not reserve order after retrying transaction conflicts.');
}
export async function releaseOrder(id: string, status: 'EXPIRED' | 'CANCELED' = 'CANCELED', now = new Date()): Promise<boolean> {
  if (!process.env.DATABASE_URL) throw new Error('Order reservations require configured PostgreSQL.');
  if (typeof id !== 'string' || !id.trim()) throw new Error('Order ID is required.');
  if (status !== 'EXPIRED' && status !== 'CANCELED') throw new Error('Release status must be EXPIRED or CANCELED.');
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Release time must be a valid date.');
  return retrySerializable(() => prisma.$transaction((tx) => releaseInTransaction(tx, id, status, now), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}
/** Returns a batch of expired reservations that were released while processing; callers may safely invoke this on every scheduler run. */
export async function expireDueReservations(now = new Date(), batchSize = 100): Promise<number> {
  if (!process.env.DATABASE_URL) throw new Error('Order reservations require configured PostgreSQL.');
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1000) throw new Error('Batch size must be between 1 and 1000.');
  if (!Number.isFinite(now.getTime())) throw new Error('Expiry time must be a valid date.');
  const due = await prisma.order.findMany({ where: { status: 'RESERVED', expiresAt: { lte: now } }, select: { id: true }, orderBy: { expiresAt: 'asc' }, take: batchSize });
  let released = 0;
  for (const { id } of due) if (await releaseOrder(id, 'EXPIRED', now)) released++;
  return released;
}
export type { OrderRequest } from './domain';
export { orderRequestSchema, priceOrder, type OrderPricingPolicy } from './domain';
