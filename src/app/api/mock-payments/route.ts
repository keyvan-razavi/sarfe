import { NextResponse, type NextRequest } from 'next/server';
import { getCustomerSession } from '@/modules/customer-account';
import { isMockPaymentsEnabled, mockPaymentRequestSchema, simulateOrderPayment } from '@/modules/mock-payments';

export const runtime = 'nodejs';
const MAX_BODY_BYTES = 4096;

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
    if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new Error('Request body is too large.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

export async function POST(request: NextRequest) {
  if (!isMockPaymentsEnabled(process.env)) return NextResponse.json({ error: 'شبیه‌سازی پرداخت در این محیط فعال نیست.' }, { status: 404 });
  if (request.headers.get('origin') !== request.nextUrl.origin || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'درخواست نامعتبر است.' }, { status: 403 });
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) return NextResponse.json({ error: 'درخواست نامعتبر است.' }, { status: 400 });
  const customer = await getCustomerSession();
  if (!customer) return NextResponse.json({ error: 'برای شبیه‌سازی وارد حساب شوید.' }, { status: 401 });
  let raw: unknown;
  try { raw = await readBoundedJson(request); }
  catch { return NextResponse.json({ error: 'درخواست شبیه‌سازی معتبر نیست.' }, { status: 400 }); }
  const parsed = mockPaymentRequestSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'درخواست شبیه‌سازی معتبر نیست.' }, { status: 400 });
  try {
    const attempt = await simulateOrderPayment(customer.id, parsed.data);
    return NextResponse.json({ attempt: { ...attempt, createdAt: attempt.createdAt.toISOString() }, message: 'Simulation only. No funds moved; order status and fulfillment were not changed.' }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Order is unavailable.' || error.message === 'Only an active reservation can be simulated.')) {
      return NextResponse.json({ error: 'فقط سفارش رزروشده و فعال قابل شبیه‌سازی است.' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'This attempt key was already used for a different simulation.') {
      return NextResponse.json({ error: 'کلید شبیه‌سازی پیش‌تر برای ورودی دیگری استفاده شده است.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'ثبت شبیه‌سازی ممکن نشد.' }, { status: 503 });
  }
}
