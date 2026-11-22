import { redirect } from 'next/navigation';
import { StorefrontFooter, StorefrontHeader } from '@/components/storefront/site-shell';
import { getLocale } from '@/lib/locale-server';
import { getCustomerSession } from '@/modules/customer-account';
import { AccountAuthForm } from '../auth-form';
import '../account.css';

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: locale === 'fa' ? 'ساخت حساب کاربری' : 'دروستکردنی هەژمار' };
}

export default async function AccountRegisterPage() {
  const locale = await getLocale();
  if (await getCustomerSession()) redirect('/account');
  return <div className="account-shell"><StorefrontHeader /><main className="account-page account-page--narrow" dir="rtl" lang={locale}><AccountAuthForm locale={locale} mode="register" /></main><StorefrontFooter /></div>;
}
