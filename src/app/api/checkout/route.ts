import { NextResponse, type NextRequest } from 'next/server';
import { configuredCheckoutPolicy, createReservedOrder, expireDueReservations, orderRequestSchema } from '@/modules/orders';
import { getCustomerSession } from '@/modules/customer-account';
import { isMockPaymentsEnabled } from '@/modules/mock-payments';

export const runtime = 'nodejs';
const MAX_BODY_BYTES = 32 * 1024;
const BUSINESS_ERROR_MESSAGES = [
  'One or more variants are unavailable.',
  'This idempotency key was already used for a different request.',
  'This idempotency key belongs to a reservation that has ended.',
  'This reservation has expired and cannot be recreated with the same idempotency key.',
  'Insufficient stock for one or more variants.',
  'Variants must use one supported currency.',
  'Shipping and tax policy currency must match the order currency.',
  'Order total exceeds the supported amount.',
];

async function readBoundedJson(request: NextRequest): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) throw new Error('Request body is too large.');
  if (!request.body) throw new Error('Request body is required.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error('Request body is too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== request.nextUrl.origin || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'درخواست نامعتبر است.' }, { status: 403 });
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
    return NextResponse.json({ error: 'درخواست نامعتبر است.' }, { status: 400 });
  }
  const configuredPolicy = configuredCheckoutPolicy(process.env);
  const mockDemo = !configuredPolicy && isMockPaymentsEnabled(process.env);
  const policy = configuredPolicy ?? (mockDemo ? {
    id: 'local-mock-estimate-zero-v1',
    quote: ({ currency }: { currency: string }) => ({ shippingMinor: 0, shippingPolicy: 'local-demo-zero-shipping-v1', taxMinor: 0, taxPolicy: 'local-demo-zero-tax-v1', currency }),
  } : null);
  if (!policy) return NextResponse.json({ error: 'ثبت سفارش فعلاً در دسترس نیست.' }, { status: 503 });
  let raw: unknown;
  try {
    raw = await readBoundedJson(request);
  } catch {
    return NextResponse.json({ error: 'درخواست سفارش معتبر نیست.' }, { status: 400 });
  }
  const parsed = orderRequestSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'درخواست سفارش معتبر نیست.' }, { status: 400 });
  try {
    await expireDueReservations(new Date(), 100);
  } catch {
    return NextResponse.json({ error: 'ثبت سفارش فعلاً ممکن نیست. کمی بعد دوباره تلاش کنید.' }, { status: 503 });
  }
  try {
    const customerSession = await getCustomerSession();
    const trustedRequest = customerSession ? { ...parsed.data, customer: { name: customerSession.name, email: customerSession.email, phone: customerSession.phone } } : parsed.data;
    const order = await createReservedOrder(trustedRequest, policy, customerSession?.id ?? null);
    return NextResponse.json({ id: order.id, status: order.status, currency: order.currency, totalMinor: order.totalMinor, expiresAt: order.expiresAt.toISOString(), mockDemo }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && BUSINESS_ERROR_MESSAGES.includes(error.message)) {
      return NextResponse.json({ error: 'اطلاعات سفارش یا موجودی کالاها معتبر نیست. سبد خرید را بررسی و دوباره تلاش کنید.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'ثبت سفارش فعلاً ممکن نیست. کمی بعد دوباره تلاش کنید.' }, { status: 503 });
  }
}
