import 'server-only';
import { prisma } from '@/lib/db';

export type CustomerOrderSummary = {
  id: string;
  status: 'RESERVED' | 'EXPIRED' | 'CANCELED';
  currency: string;
  totalMinor: number;
  createdAt: Date;
  expiresAt: Date;
};

export type CustomerOrderDetail = CustomerOrderSummary & {
  customer: { name: string; email: string; phone: string };
  address: { countryCode: string; region: string; locality: string; postalCode: string; line1: string; line2?: string };
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  shippingPolicy: string;
  taxPolicy: string;
  releasedAt: Date | null;
  lines: Array<{ id: string; productName: string; variantName: string; sku: string; quantity: number; unitPriceMinor: number; lineTotalMinor: number; currency: string }>;
};

function safeAmount(value: bigint): number {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Stored order amount exceeds the supported range.');
  return amount;
}

export async function listCustomerOrders(customerId: string): Promise<CustomerOrderSummary[]> {
  if (!customerId.trim()) throw new Error('Customer identity is required.');
  const orders = await prisma.order.findMany({
    where: { customerId },
    select: { id: true, status: true, currency: true, totalMinor: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return orders.map((order) => ({ ...order, totalMinor: safeAmount(order.totalMinor) }));
}

export async function getCustomerOrder(customerId: string, orderId: string): Promise<CustomerOrderDetail | null> {
  if (!customerId.trim() || !orderId.trim()) throw new Error('Customer and order IDs are required.');
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId },
    include: { lines: { orderBy: { id: 'asc' } } },
  });
  if (!order) return null;
  const customer = order.customerSnapshot as CustomerOrderDetail['customer'];
  const address = order.addressSnapshot as CustomerOrderDetail['address'];
  return {
    id: order.id,
    status: order.status,
    currency: order.currency,
    totalMinor: safeAmount(order.totalMinor),
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    customer,
    address,
    subtotalMinor: safeAmount(order.subtotalMinor),
    shippingMinor: safeAmount(order.shippingMinor),
    taxMinor: safeAmount(order.taxMinor),
    shippingPolicy: order.shippingPolicy,
    taxPolicy: order.taxPolicy,
    releasedAt: order.releasedAt,
    lines: order.lines.map((line) => ({
      id: line.id,
      productName: line.productNameSnapshot,
      variantName: line.variantNameSnapshot,
      sku: line.skuSnapshot,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
      lineTotalMinor: safeAmount(line.lineTotalMinor),
      currency: line.currency,
    })),
  };
}
