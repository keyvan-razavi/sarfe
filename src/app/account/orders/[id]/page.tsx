import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { StorefrontFooter, StorefrontHeader } from '@/components/storefront/site-shell';
import { getLocale } from '@/lib/locale-server';
import { getCustomerSession } from '@/modules/customer-account';
import { getCustomerOrder } from '@/modules/orders';
import { formatStoreMoney } from '@/lib/store-money';
import { isMockPaymentsEnabled, listOrderPaymentAttempts } from '@/modules/mock-payments';
import { PaymentSimulator } from '@/modules/mock-payments/client';
import '../../account.css';

const copy = {
  fa: { title: 'جزئیات درخواست سفارش', back: 'بازگشت به حساب', date: 'تاریخ ثبت', status: 'وضعیت', reserved: 'رزروشده؛ پرداختی انجام نشده است', expired: 'رزرو منقضی شده است', canceled: 'رزرو لغو شده است', items: 'اقلام سفارش', quantity: 'تعداد', unit: 'قیمت واحد', line: 'جمع ردیف', subtotal: 'جمع کالاها', shipping: 'هزینهٔ ارسال طبق تنظیمات ثبت‌شده', tax: 'مالیات طبق تنظیمات ثبت‌شده', total: 'مبلغ کل ثبت‌شده', address: 'نشانی تحویل', postal: 'کد پستی' },
  ckb: { title: 'وردەکاریی داواکاری', back: 'گەڕانەوە بۆ هەژمار', date: 'بەرواری تۆمار', status: 'دۆخ', reserved: 'ڕاگیراوە؛ هیچ پارەدانێک نەکراوە', expired: 'ڕاگرتنەکە بەسەرچووە', canceled: 'ڕاگرتنەکە هەڵوەشێنراوەتەوە', items: 'کاڵاکانی داواکاری', quantity: 'ژمارە', unit: 'نرخی تاک', line: 'کۆی ڕیز', subtotal: 'کۆی کاڵاکان', shipping: 'تێچووی گەیاندن بەپێی ڕێکخستنە تۆمارکراوەکان', tax: 'باج بەپێی ڕێکخستنە تۆمارکراوەکان', total: 'کۆی گشتیی تۆمارکراو', address: 'ناونیشانی گەیاندن', postal: 'کۆدی پۆستی' },
};

export default async function CustomerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = await getLocale();
  const customer = await getCustomerSession();
  if (!customer) redirect('/account/login');
  const { id } = await params;
  const order = await getCustomerOrder(customer.id, id);
  if (!order) notFound();
  const mockEnabled = isMockPaymentsEnabled(process.env);
  const attempts = mockEnabled ? await listOrderPaymentAttempts(customer.id, id) : [];
  const t = copy[locale];
  const intlLocale = locale === 'fa' ? 'fa-IR' : 'ckb-IQ';
  const number = new Intl.NumberFormat(intlLocale);
  const statusText = order.status === 'RESERVED' ? t.reserved : order.status === 'EXPIRED' ? t.expired : t.canceled;
  return <div className="account-shell">
    <StorefrontHeader />
    <main className="account-page" dir="rtl" lang={locale}>
      <Link className="account-back" href="/account">{t.back}</Link>
      <div className="account-detail-grid">
        <div className="account-detail-main">
          <section className="account-card account-order-summary">
            <header className="account-order-heading"><div><p>صرفه · <bdi dir="ltr">#{order.id}</bdi></p><h1>{t.title}</h1></div><span className={`account-status account-status--${order.status.toLowerCase()}`}><i aria-hidden="true" />{statusText}</span></header>
            <p className="account-detail-date">{t.date}: {new Intl.DateTimeFormat(intlLocale, { dateStyle: 'long', timeStyle: 'short' }).format(order.createdAt)}</p>
          </section>
          <section className="account-card account-order-items" aria-labelledby="account-items-title">
            <h2 id="account-items-title">{t.items}</h2>
            <div className="account-table-wrap" role="region" aria-label={t.items} tabIndex={0}><table className="account-table"><thead><tr><th scope="col">{locale === 'fa' ? 'کالا' : 'کاڵا'}</th><th scope="col">{t.quantity}</th><th scope="col">{t.unit}</th><th scope="col">{t.line}</th></tr></thead><tbody>{order.lines.map((line) => <tr key={line.id}><td><strong>{line.productName}</strong><span className="account-order-meta">{line.variantName} · <bdi dir="ltr">{line.sku}</bdi></span></td><td>{number.format(line.quantity)}</td><td>{formatStoreMoney(line.unitPriceMinor, line.currency, intlLocale)}</td><td>{formatStoreMoney(line.lineTotalMinor, line.currency, intlLocale)}</td></tr>)}</tbody></table></div>
            <dl className="account-totals"><div><dt>{t.subtotal}</dt><dd>{formatStoreMoney(order.subtotalMinor, order.currency, intlLocale)}</dd></div><div><dt>{t.shipping}</dt><dd>{formatStoreMoney(order.shippingMinor, order.currency, intlLocale)}</dd></div><div><dt>{t.tax}</dt><dd>{formatStoreMoney(order.taxMinor, order.currency, intlLocale)}</dd></div><div className="account-totals__grand"><dt>{t.total}</dt><dd>{formatStoreMoney(order.totalMinor, order.currency, intlLocale)}</dd></div></dl>
          </section>
        </div>
        <aside className="account-detail-aside">
          <section className="account-card account-address"><h2>{t.address}</h2><p>{order.customer.name} · <bdi dir="ltr">{order.customer.phone}</bdi></p><p>{order.address.region}، {order.address.locality}</p><p>{order.address.line1}{order.address.line2 ? `، ${order.address.line2}` : ''}</p><p>{t.postal}: <bdi dir="ltr">{order.address.postalCode}</bdi></p></section>
          {mockEnabled && order.status === 'RESERVED' && order.expiresAt > new Date() && <section className="account-card"><PaymentSimulator locale={locale} orderId={order.id} initialAttempts={attempts} /></section>}
        </aside>
      </div>
    </main>
    <StorefrontFooter />
  </div>;
}
