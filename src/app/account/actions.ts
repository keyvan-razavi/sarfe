'use server';

import { redirect } from 'next/navigation';
import { loginCustomer, registerCustomer, signOutCustomer, updateCustomerProfile } from '@/modules/customer-account';

export type AccountActionState = { error: string; success?: string };
function isSorani(formData: FormData): boolean { return formData.get('locale') === 'ckb'; }

export async function loginAction(_state: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const locale = isSorani(formData);
  const okay = await loginCustomer(formData.get('email'), formData.get('password'));
  if (okay) redirect('/account');
  return { error: locale ? 'ئیمەیڵ یان وشەی نهێنی دروست نییە.' : 'ایمیل یا گذرواژه درست نیست.' };
}

export async function registerAction(_state: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const locale = isSorani(formData);
  const result = await registerCustomer({ name: formData.get('name'), email: formData.get('email'), phone: formData.get('phone'), password: formData.get('password') });
  if (result.success) redirect('/account');
  if (result.reason === 'exists') return { error: locale ? 'ئەم ئیمەیڵە پێشتر تۆمار کراوە.' : 'این ایمیل قبلاً ثبت شده است.' };
  return { error: locale ? 'زانیارییەکان بپشکنە؛ وشەی نهێنی دەبێت لانیکەم ١٢ پیت بێت.' : 'اطلاعات را بررسی کنید؛ گذرواژه باید دست‌کم ۱۲ نویسه باشد.' };
}

export async function updateProfileAction(_state: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const locale = isSorani(formData);
  const updated = await updateCustomerProfile({ name: formData.get('name'), phone: formData.get('phone') });
  if (!updated) return { error: locale ? 'ناو یان ژمارەی تەلەفۆن دروست نییە.' : 'نام یا شمارهٔ تلفن معتبر نیست.' };
  return { error: '', success: locale ? 'زانیارییەکان نوێ کرانەوە.' : 'اطلاعات حساب به‌روز شد.' };
}

export async function signOutAction(): Promise<void> {
  await signOutCustomer();
  redirect('/account/login');
}
