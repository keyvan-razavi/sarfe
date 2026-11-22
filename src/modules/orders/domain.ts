import { createHash } from 'node:crypto';
import { z } from 'zod';
import { isSupportedCurrency } from '@/lib/currency';

const text = (max: number) => z.string().trim().min(1).max(max);
export const orderRequestSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),
  customer: z.object({ name: text(160), email: z.string().trim().email().max(254), phone: text(40) }),
  address: z.object({ countryCode: z.string().trim().length(2).regex(/^[A-Za-z]{2}$/).transform((v) => v.toUpperCase()), region: text(120), locality: text(120), postalCode: text(32), line1: text(200), line2: z.string().trim().max(200).optional() }),
  items: z.array(z.object({ variantId: z.string().trim().min(1).max(128), quantity: z.number().int().min(1).max(100_000) })).min(1).max(100),
}).superRefine((value, ctx) => {
  if (new Set(value.items.map((item) => item.variantId)).size !== value.items.length) ctx.addIssue({ code: 'custom', path: ['items'], message: 'Each variant may appear only once.' });
});
export type OrderRequest = z.infer<typeof orderRequestSchema>;
export type OrderableVariant = { id: string; sku: string; name: string; priceMinor: number; currency: string; stock: number; product: { name: string; status: string } };
export type PricingPolicyResult = { shippingMinor: number; shippingPolicy: string; taxMinor: number; taxPolicy: string; currency: string };
/** quote must be read-only and idempotent: serializable retries can call it more than once. */
export type OrderPricingPolicy = { id: string; quote: (input: { customer: OrderRequest['customer']; address: OrderRequest['address']; currency: string; subtotalMinor: number }) => Promise<PricingPolicyResult> | PricingPolicyResult };
export type PricedLine = { variantId: string; productName: string; variantName: string; sku: string; quantity: number; unitPriceMinor: number; lineTotalMinor: number; currency: string };
export type PricedOrder = { customer: OrderRequest['customer']; address: OrderRequest['address']; currency: string; subtotalMinor: number; shippingMinor: number; taxMinor: number; totalMinor: number; shippingPolicy: string; taxPolicy: string; lines: PricedLine[] };
const MAX_MINOR = Number.MAX_SAFE_INTEGER;
function addSafe(a: number, b: number): number {
  const result = a + b;
  if (!Number.isSafeInteger(result) || result > MAX_MINOR) throw new Error('Order total exceeds the supported amount.');
  return result;
}
export function requestFingerprint(request: OrderRequest, policyId: string, customerId: string | null = null): string {
  const normalized = { customer: request.customer, address: request.address, ...(customerId ? { customerId } : {}), items: [...request.items].sort((a, b) => a.variantId.localeCompare(b.variantId)), policyId };
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}
export async function priceOrder(request: OrderRequest, variants: OrderableVariant[], policy: OrderPricingPolicy): Promise<PricedOrder> {
  const byId = new Map(variants.map((item) => [item.id, item]));
  if (byId.size !== request.items.length || request.items.some((item) => !byId.has(item.variantId))) throw new Error('One or more variants are unavailable.');
  if (!policy.id.trim() || policy.id.length > 100) throw new Error('A stable server pricing policy identifier is required.');
  const currencies = new Set(request.items.map((item) => byId.get(item.variantId)!.currency));
  if (currencies.size !== 1 || !isSupportedCurrency([...currencies][0] ?? '')) throw new Error('Variants must use one supported currency.');
  const currency = [...currencies][0]!;
  const lines: PricedLine[] = request.items.map((item) => {
    const variant = byId.get(item.variantId);
    if (!variant) throw new Error('One or more variants are unavailable.');
    if (variant.product.status !== 'PUBLISHED') throw new Error('One or more variants are unavailable.');
    if (!Number.isSafeInteger(variant.priceMinor) || variant.priceMinor < 0 || !Number.isSafeInteger(variant.stock) || variant.stock < item.quantity) throw new Error('Insufficient stock for one or more variants.');
    if (!isSupportedCurrency(variant.currency) || variant.currency !== currency) throw new Error('Variants must use one supported currency.');
    const lineTotalMinor = variant.priceMinor * item.quantity;
    if (!Number.isSafeInteger(lineTotalMinor) || lineTotalMinor > MAX_MINOR) throw new Error('Order total exceeds the supported amount.');
    return { variantId: variant.id, productName: variant.product.name, variantName: variant.name, sku: variant.sku, quantity: item.quantity, unitPriceMinor: variant.priceMinor, lineTotalMinor, currency };
  });
  const subtotalMinor = lines.reduce((sum, line) => addSafe(sum, line.lineTotalMinor), 0);
  const quote = await policy.quote({ customer: request.customer, address: request.address, currency, subtotalMinor });
  if (quote.currency !== currency || !isSupportedCurrency(quote.currency)) throw new Error('Shipping and tax policy currency must match the order currency.');
  for (const [label, amount] of [['shipping', quote.shippingMinor], ['tax', quote.taxMinor]] as const) {
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > MAX_MINOR) throw new Error(`The ${label} policy returned an invalid amount.`);
  }
  if (!quote.shippingPolicy.trim() || quote.shippingPolicy.length > 100 || !quote.taxPolicy.trim() || quote.taxPolicy.length > 100) throw new Error('Shipping and tax policies must have stable identifiers.');
  const totalMinor = addSafe(addSafe(subtotalMinor, quote.shippingMinor), quote.taxMinor);
  return { customer: request.customer, address: request.address, currency, subtotalMinor, shippingMinor: quote.shippingMinor, taxMinor: quote.taxMinor, totalMinor, shippingPolicy: quote.shippingPolicy, taxPolicy: quote.taxPolicy, lines };
}
