import { getLocale } from '@/lib/locale-server';
import { configuredCheckoutPolicy } from '@/modules/orders';
import { getCustomerSession } from '@/modules/customer-account';
import { isMockPaymentsEnabled } from '@/modules/mock-payments';
import { StorefrontFooter, StorefrontHeader } from '@/components/storefront/site-shell';
import { CheckoutForm } from './checkout-form';
import './checkout.css';

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: locale === 'fa' ? 'ثبت سفارش' : 'تۆمارکردنی داواکاری' };
}

export default async function CheckoutPage() {
  const locale = await getLocale();
  const mockPaymentsEnabled = isMockPaymentsEnabled(process.env);
  const mockDemo = mockPaymentsEnabled && !configuredCheckoutPolicy(process.env);
  const enabled = Boolean(configuredCheckoutPolicy(process.env)) || mockPaymentsEnabled;
  const customer = await getCustomerSession();
  return <div className="checkout-shell">
    <StorefrontHeader />
    <main className="checkout-page" dir="rtl" lang={locale}>
      <header className="checkout-heading">
        <p>{locale === 'fa' ? 'صرفه · ثبت سفارش' : 'صرفه · تۆمارکردنی داواکاری'}</p>
        <h1>{locale === 'fa' ? 'اطلاعات تحویل' : 'زانیاریی گەیاندن'}</h1>
        <span>{locale === 'fa' ? 'پرداخت آنلاین در این مرحله انجام نمی‌شود.' : 'لەو قۆناغەدا پارەدانی ئۆنلاین ناکرێت.'}</span>
      </header>
      {enabled
        ? <CheckoutForm locale={locale} customer={customer ? { name: customer.name, email: customer.email, phone: customer.phone } : null} mockDemo={mockDemo} mockPaymentsEnabled={mockPaymentsEnabled} />
        : <section className="checkout-unavailable" role="status"><h2>{locale === 'fa' ? 'ثبت سفارش فعلاً در دسترس نیست' : 'تۆمارکردنی داواکاری ئێستا بەردەست نییە'}</h2><p>{locale === 'fa' ? 'سفارش‌گیری برای این فروشگاه هنوز فعال نشده است.' : 'وەرگرتنی داواکاری بۆ ئەم فرۆشگایە هێشتا چالاک نەکراوە.'}</p></section>}
    </main>
    <StorefrontFooter />
  </div>;
}
