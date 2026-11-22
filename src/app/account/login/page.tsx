import { redirect } from 'next/navigation';
import { StorefrontFooter, StorefrontHeader } from '@/components/storefront/site-shell';
import { getLocale } from '@/lib/locale-server';
import { getCustomerSession } from '@/modules/customer-account';
import { AccountAuthForm } from '../auth-form';
import '../account.css';

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: locale === 'fa' ? 'ورود به حساب' : 'چوونەژوورەوە بۆ هەژمار' };
}

export default async function AccountLoginPage() {
  const locale = await getLocale();
  if (await getCustomerSession()) redirect('/account');
  return <div className="account-shell"><StorefrontHeader /><main className="account-page account-page--narrow" dir="rtl" lang={locale}><AccountAuthForm locale={locale} mode="login" /></main><StorefrontFooter /></div>;
}
