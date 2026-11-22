import Link from 'next/link';
import { redirect } from 'next/navigation';
import { StorefrontFooter, StorefrontHeader } from '@/components/storefront/site-shell';
import { getLocale } from '@/lib/locale-server';
import { getCustomerSession } from '@/modules/customer-account';
import { listCustomerOrders } from '@/modules/orders';
import { formatStoreMoney } from '@/lib/store-money';
import { ProfileForm } from './profile-form';
import { signOutAction } from './actions';
import './account.css';

const copy = {
  fa: {
    title: 'حساب کاربری', welcome: 'خوش آمدید', intro: 'سفارش‌ها و اطلاعات حساب خود را از اینجا مدیریت کنید.',
    orders: 'سفارش‌های من', empty: 'هنوز سفارشی ثبت نکرده‌اید.', detail: 'مشاهدهٔ جزئیات', signOut: 'خروج از حساب',
    reserved: 'در انتظار', expired: 'منقضی‌شده', canceled: 'لغوشده', created: 'تاریخ ثبت',
    orderCount: 'همهٔ سفارش‌ها', activeCount: 'رزروهای فعال', closedCount: 'رزروهای پایان‌یافته',
    profile: 'اطلاعات حساب', shopLink: 'ادامهٔ خرید', cartLink: 'سبد خرید',
    emptyHelp: 'بعد از ثبت سفارش، وضعیت و جزئیات آن را همین‌جا پیگیری کنید.',
  },
  ckb: {
    title: 'هەژماری بەکارهێنەر', welcome: 'بەخێربێیت', intro: 'لێرەوە داواکارییەکان و زانیاریی هەژمارەکەت بەڕێوەببە.',
    orders: 'داواکارییەکانم', empty: 'هێشتا هیچ داواکارییەکت تۆمار نەکردووە.', detail: 'بینینی وردەکاری', signOut: 'چوونەدەرەوە لە هەژمار',
    reserved: 'چاوەڕوانە', expired: 'بەسەرچوو', canceled: 'هەڵوەشێنراوەتەوە', created: 'بەرواری تۆمار',
    orderCount: 'هەموو داواکارییەکان', activeCount: 'ڕاگرتنە چالاکەکان', closedCount: 'ڕاگرتنە کۆتاییهاتۆوەکان',
    profile: 'زانیاریی هەژمار', shopLink: 'بەردەوامبوون لە کڕین', cartLink: 'سەبەتە',
    emptyHelp: 'دوای تۆمارکردنی داواکاری، دۆخ و وردەکارییەکانی لێرەوە بەدواداچوون بکە.',
  },
};

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: locale === 'fa' ? 'حساب کاربری' : 'هەژماری بەکارهێنەر' };
}

export default async function AccountPage() {
  const locale = await getLocale();
  const customer = await getCustomerSession();
  if (!customer) redirect('/account/login');
  const [orders] = await Promise.all([listCustomerOrders(customer.id)]);
  const t = copy[locale];
  const intlLocale = locale === 'fa' ? 'fa-IR' : 'ckb-IQ';
  const statusLabel = (status: string) => status === 'RESERVED' ? t.reserved : status === 'EXPIRED' ? t.expired : t.canceled;
  const number = new Intl.NumberFormat(intlLocale);
  const activeCount = orders.filter((order) => order.status === 'RESERVED' && order.expiresAt > new Date()).length;
  const closedCount = orders.length - activeCount;
  return <div className="account-shell">
    <StorefrontHeader />
    <main className="account-page" dir="rtl" lang={locale}>
      <header className="account-heading">
        <div className="account-heading__copy">
          <p className="account-eyebrow">صرفه <span aria-hidden="true">/</span> {t.title}</p>
          <h1>{t.welcome}، {customer.name}</h1>
          <span>{t.intro}</span>
        </div>
        <form action={signOutAction}><button className="account-link-button" type="submit">{t.signOut}</button></form>
      </header>
      <div className="account-quick-links"><Link href="/products">{t.shopLink}<span aria-hidden="true">←</span></Link><Link href="/cart">{t.cartLink}<span aria-hidden="true">←</span></Link></div>
      <section className="account-stat-grid" aria-label={t.orders}>
        <article className="account-stat account-stat--featured"><span>{t.orderCount}</span><strong>{number.format(orders.length)}</strong></article>
        <article className="account-stat"><span>{t.activeCount}</span><strong>{number.format(activeCount)}</strong></article>
        <article className="account-stat"><span>{t.closedCount}</span><strong>{number.format(closedCount)}</strong></article>
      </section>
      <div className="account-dashboard-grid">
        <div className="account-dashboard-profile"><ProfileForm locale={locale} customer={customer} /></div>
        <section className="account-card account-orders" aria-labelledby="account-orders-title">
          <div className="account-section-heading"><div><p className="account-eyebrow">صرفه</p><h2 id="account-orders-title">{t.orders}</h2></div><span className="account-section-count">{number.format(orders.length)}</span></div>
          {orders.length === 0 ? <div className="account-empty"><span className="account-empty__mark" aria-hidden="true">↗</span><h3>{t.empty}</h3><p>{t.emptyHelp}</p><Link className="account-primary-link" href="/products">{t.shopLink}<span aria-hidden="true">←</span></Link></div> : <ul>{orders.map((order) => <li key={order.id}>
            <div className="account-order-main"><span className="account-order-ref"><bdi dir="ltr">#{order.id}</bdi></span><span className="account-order-meta">{t.created}: {new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium' }).format(order.createdAt)}</span></div>
            <div className="account-order-end"><span className={`account-status account-status--${order.status.toLowerCase()}`}><i aria-hidden="true" />{statusLabel(order.status)}</span><strong>{formatStoreMoney(order.totalMinor, order.currency, intlLocale)}</strong><Link href={`/account/orders/${encodeURIComponent(order.id)}`}>{t.detail}<span aria-hidden="true">←</span></Link></div>
          </li>)}</ul>}
        </section>
      </div>
    </main>
    <StorefrontFooter />
  </div>;
}
