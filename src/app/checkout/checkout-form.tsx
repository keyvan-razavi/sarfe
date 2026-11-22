'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Button, Field, Input, Textarea } from '@/components/ui';
import { useCart } from '@/modules/cart';
import type { Locale } from '@/lib/i18n';
import { formatStoreMoney } from '@/lib/store-money';
import type { CustomerProfile } from '@/modules/customer-account';
import { localizeCartName, localizeVariantName } from '@/components/storefront/messages';
import Link from 'next/link';
import { PaymentSimulator } from '@/modules/mock-payments/client';

const copy = {
  fa: { name: 'نام و نام خانوادگی', email: 'ایمیل', phone: 'شمارهٔ تلفن', province: 'استان', city: 'شهر', postal: 'کد پستی', address: 'نشانی', details: 'واحد، پلاک یا توضیحات (اختیاری)', submit: 'ثبت درخواست سفارش', sending: 'در حال ثبت…', empty: 'سبد خرید خالی است.', error: 'ثبت سفارش انجام نشد. اطلاعات و موجودی را بررسی کنید.', success: 'درخواست سفارش ثبت شد. پرداختی انجام نشده است.', noPayment: 'این مرحله هیچ پرداختی دریافت نمی‌کند.', country: 'ایران', total: 'مبلغ نهایی محاسبه‌شده', expires: 'رزرو تا', demo: 'حالت دمو محلی: هزینهٔ ارسال و مالیات با برآورد آزمایشی صفر محاسبه می‌شوند و سیاست واقعی فروشگاه نیستند.', account: 'برای نمایش شبیه‌سازی محلی پرداخت، وارد حساب شوید.' },
  ckb: { name: 'ناوی تەواو', email: 'ئیمەیڵ', phone: 'ژمارەی تەلەفۆن', province: 'پارێزگا', city: 'شار', postal: 'کۆدی پۆستی', address: 'ناونیشان', details: 'یەکە، ژمارەی بینا یان وردەکاری (ئارەزوومەندانە)', submit: 'تۆمارکردنی داواکاری', sending: 'لە تۆمارکردندایە…', empty: 'سەبەتەکەت بەتاڵە.', error: 'داواکاری تۆمار نەکرا. زانیاری و کۆگا بپشکنە.', success: 'داواکاری تۆمار کرا. هیچ پارەدانێک نەکراوە.', noPayment: 'لەم قۆناغەدا هیچ پارەیەک وەرناگیرێت.', country: 'ئێران', total: 'بڕی کۆتاییی ژمێردراو', expires: 'ڕاگرتن تا', demo: 'دۆخی دیمۆی ناوخۆیی: تێچووی گەیاندن و باج بە بڕی تاقیکاریی سفر دەژمێردرێن و سیاسەتی ڕاستەقینەی فرۆشگا نین.', account: 'بۆ پیشاندانی شبیه‌سازیی ناوخۆییی پارەدان، بچۆرە ژوورەوە.' },
};

const summaryCopy = {
  fa: { title: 'خلاصهٔ سبد', itemCount: 'قلم', quantity: 'تعداد', unitPrice: 'قیمت هر واحد', subtotal: 'برآورد جمع کالاها', estimate: 'این مبلغ برآورد موقت بر پایهٔ اطلاعات ذخیره‌شده در این دستگاه است؛ قیمت و موجودی هنگام ثبت سفارش در سرور دوباره بررسی می‌شوند.', delivery: 'اطلاعات تحویل' },
  ckb: { title: 'پوختەی سەبەتە', itemCount: 'دانە', quantity: 'ژمارە', unitPrice: 'نرخی هەر دانەیەک', subtotal: 'کۆی خەمڵێندراوی کاڵاکان', estimate: 'ئەم بڕە خەمڵاندنێکی کاتییە لەسەر بنەمای زانیاریی پاشەکەوتکراو لەم ئامێرە؛ نرخ و کۆگا لە کاتی تۆمارکردن لەسێرڤەر دووبارە دەپشکنرێن.', delivery: 'زانیاریی گەیاندن' },
};

type ReservationReceipt = { id: string; totalMinor: number; currency: string; expiresAt: string; mockDemo?: boolean };

export function CheckoutForm({ locale, customer, mockDemo, mockPaymentsEnabled }: { locale: Locale; customer: Pick<CustomerProfile, 'name' | 'email' | 'phone'> | null; mockDemo: boolean; mockPaymentsEnabled: boolean }) {
  const t = copy[locale];
  const cart = useCart();
  const idempotencyKey = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [receipt, setReceipt] = useState<ReservationReceipt | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!cart.ready || cart.lines.length === 0) { setError(t.empty); return; }
    setPending(true);
    const data = new FormData(event.currentTarget);
    const payload = {
      idempotencyKey: idempotencyKey.current ?? (idempotencyKey.current = crypto.randomUUID()),
      customer: { name: data.get('name'), email: data.get('email'), phone: data.get('phone') },
      address: { countryCode: 'IR', region: data.get('region'), locality: data.get('locality'), postalCode: data.get('postalCode'), line1: data.get('line1'), line2: data.get('line2') || undefined },
      items: cart.lines.map(({ variantId, quantity }) => ({ variantId, quantity })),
    };
    try {
      const response = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(t.error);
      const result: unknown = await response.json();
      if (!result || typeof result !== 'object' || !('id' in result) || typeof result.id !== 'string' || !('totalMinor' in result) || typeof result.totalMinor !== 'number' || !Number.isSafeInteger(result.totalMinor) || !('currency' in result) || typeof result.currency !== 'string' || !('expiresAt' in result) || typeof result.expiresAt !== 'string' || !Number.isFinite(Date.parse(result.expiresAt))) throw new Error(t.error);
      setReceipt({ id: result.id, totalMinor: result.totalMinor, currency: result.currency, expiresAt: result.expiresAt, mockDemo: 'mockDemo' in result && result.mockDemo === true });
      for (const line of cart.lines) cart.remove(line.variantId);
      setComplete(true);
      setError('');
    } catch { setError(t.error); }
    finally { setPending(false); }
  }

  if (complete && receipt) {
    const intlLocale = locale === 'fa' ? 'fa-IR' : 'ckb-IQ';
    const expiresAt = new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(receipt.expiresAt));
    return <section className="checkout-result"><h2>{t.success}</h2><p>{t.noPayment}</p>{receipt.mockDemo && <p className="checkout-demo-notice">{t.demo}</p>}<p className="checkout-result__total">{t.total}: {formatStoreMoney(receipt.totalMinor, receipt.currency, intlLocale)}</p><p>{t.expires}: <time dateTime={receipt.expiresAt}>{expiresAt}</time></p>{mockPaymentsEnabled && customer ? <PaymentSimulator locale={locale} orderId={receipt.id} /> : mockPaymentsEnabled ? <p className="checkout-demo-account"><Link href="/account/login">{t.account}</Link></p> : null}</section>;
  }
  const intlLocale = locale === 'fa' ? 'fa-IR' : 'ckb-IQ';
  const summary = summaryCopy[locale];
  return <form className="checkout-form" onSubmit={submit}>
    <section className="checkout-summary" aria-labelledby="checkout-summary-heading">
      <div className="checkout-summary__heading"><h2 id="checkout-summary-heading">{summary.title}</h2><span>{new Intl.NumberFormat(intlLocale).format(cart.count)} {summary.itemCount}</span></div>
      {cart.ready && cart.lines.length > 0 ? <>
        <ul className="checkout-summary__lines">{cart.lines.map((line) => <li key={line.variantId}>
          <div className="checkout-summary__product"><strong>{localizeCartName(line, locale)}</strong><span>{localizeVariantName(line.variantName, locale)} · {summary.quantity}: {new Intl.NumberFormat(intlLocale).format(line.quantity)}</span><span>{summary.unitPrice}: {formatStoreMoney(line.unitPriceMinor, line.currency, intlLocale)}</span></div>
          <strong className="checkout-summary__line-total">{formatStoreMoney(line.unitPriceMinor * line.quantity, line.currency, intlLocale)}</strong>
        </li>)}</ul>
        <div className="checkout-summary__subtotal"><span>{summary.subtotal}</span><strong>{formatStoreMoney(cart.subtotalMinor, cart.currency, intlLocale)}</strong></div>
      </> : <p className="checkout-summary__empty">{t.empty}</p>}
      <p className="checkout-summary__notice">{summary.estimate}</p>
      {mockDemo && <p className="checkout-demo-notice">{t.demo}</p>}
    </section>
    <div className="checkout-form__details">
    <h2 className="checkout-form__section-title">{summary.delivery}</h2>
    <div className="checkout-fields">
      <Field label={t.name} htmlFor="customer-name"><Input name="name" autoComplete="name" required maxLength={160} defaultValue={customer?.name} /></Field>
      <Field label={t.email} htmlFor="customer-email"><Input name="email" type="email" autoComplete="email" required maxLength={254} dir="ltr" defaultValue={customer?.email} /></Field>
      <Field label={t.phone} htmlFor="customer-phone"><Input name="phone" type="tel" autoComplete="tel" required maxLength={40} dir="ltr" defaultValue={customer?.phone} /></Field>
      <Field label={t.province} htmlFor="delivery-region"><Input name="region" autoComplete="address-level1" required maxLength={120} /></Field>
      <Field label={t.city} htmlFor="delivery-city"><Input name="locality" autoComplete="address-level2" required maxLength={120} /></Field>
      <Field label={t.postal} htmlFor="delivery-postal"><Input name="postalCode" autoComplete="postal-code" required maxLength={32} dir="ltr" /></Field>
      <Field label={t.address} htmlFor="delivery-address"><Textarea name="line1" autoComplete="street-address" required maxLength={200} rows={3} /></Field>
      <Field label={t.details} htmlFor="delivery-details"><Input name="line2" maxLength={200} /></Field>
    </div>
    <p className="checkout-country">{t.country}</p>
    <p className="checkout-disclaimer">{t.noPayment}</p>
    {mockDemo && <p className="checkout-demo-notice">{t.demo}</p>}
    {error && <p className="checkout-error" role="alert">{error}</p>}
    <Button type="submit" size="lg" disabled={pending || !cart.ready || cart.lines.length === 0}>{pending ? t.sending : t.submit}</Button>
    </div>
  </form>;
}
