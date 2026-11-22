'use client';

import { useActionState } from 'react';
import { Button, Field, Input } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import type { CustomerProfile } from '@/modules/customer-account';
import { updateProfileAction } from './actions';
import './account.css';

const copy = {
  fa: { title: 'اطلاعات حساب', name: 'نام و نام خانوادگی', email: 'ایمیل', phone: 'شمارهٔ تلفن', save: 'ذخیرهٔ تغییرات', pending: 'در حال ذخیره…' },
  ckb: { title: 'زانیاریی هەژمار', name: 'ناوی تەواو', email: 'ئیمەیڵ', phone: 'ژمارەی تەلەفۆن', save: 'پاشەکەوتکردنی گۆڕانکارییەکان', pending: 'لە پاشەکەوتکردندایە…' },
};

export function ProfileForm({ locale, customer }: { locale: Locale; customer: CustomerProfile }) {
  const t = copy[locale];
  const [state, formAction, pending] = useActionState(updateProfileAction, { error: '' });
  return <section className="account-card">
    <h2>{t.title}</h2>
    <form action={formAction} className="account-form">
      <input type="hidden" name="locale" value={locale} />
      <Field label={t.name} htmlFor="profile-name"><Input name="name" autoComplete="name" required maxLength={160} defaultValue={customer.name} /></Field>
      <Field label={t.email} htmlFor="profile-email"><Input type="email" value={customer.email} readOnly dir="ltr" /></Field>
      <Field label={t.phone} htmlFor="profile-phone"><Input name="phone" type="tel" autoComplete="tel" required maxLength={40} dir="ltr" defaultValue={customer.phone} /></Field>
      {state.error && <p className="account-error" role="alert">{state.error}</p>}
      {state.success && <p className="account-success" role="status">{state.success}</p>}
      <Button type="submit" disabled={pending}>{pending ? t.pending : t.save}</Button>
    </form>
  </section>;
}
