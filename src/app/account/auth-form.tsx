'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button, Field, Input } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { loginAction, registerAction } from './actions';
import './account.css';

const copy = {
  fa: { loginTitle: 'ورود به حساب', registerTitle: 'ساخت حساب کاربری', name: 'نام و نام خانوادگی', email: 'ایمیل', phone: 'شمارهٔ تلفن', password: 'گذرواژه', login: 'ورود', register: 'ساخت حساب', pending: 'در حال انجام…', toRegister: 'حساب ندارید؟ ثبت‌نام کنید', toLogin: 'حساب دارید؟ وارد شوید', passwordHint: 'حداقل ۱۲ نویسه' },
  ckb: { loginTitle: 'چوونەژوورەوە بۆ هەژمار', registerTitle: 'دروستکردنی هەژمار', name: 'ناوی تەواو', email: 'ئیمەیڵ', phone: 'ژمارەی تەلەفۆن', password: 'وشەی نهێنی', login: 'چوونەژوورەوە', register: 'دروستکردنی هەژمار', pending: 'لە پڕۆسەدایە…', toRegister: 'هەژمارت نییە؟ خۆت تۆمار بکە', toLogin: 'هەژمارت هەیە؟ بچۆرە ژوورەوە', passwordHint: 'لانیکەم ١٢ پیت' },
};

export function AccountAuthForm({ locale, mode }: { locale: Locale; mode: 'login' | 'register' }) {
  const t = copy[locale];
  const action = mode === 'login' ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, { error: '' });
  return <section className="account-card account-auth">
    <h1>{mode === 'login' ? t.loginTitle : t.registerTitle}</h1>
    <form action={formAction} className="account-form">
      <input type="hidden" name="locale" value={locale} />
      {mode === 'register' && <>
        <Field label={t.name} htmlFor="account-name"><Input name="name" autoComplete="name" required maxLength={160} /></Field>
        <Field label={t.phone} htmlFor="account-phone"><Input name="phone" type="tel" autoComplete="tel" required maxLength={40} dir="ltr" /></Field>
      </>}
      <Field label={t.email} htmlFor="account-email"><Input name="email" type="email" autoComplete="email" required maxLength={254} dir="ltr" /></Field>
      <Field label={t.password} htmlFor="account-password" hint={mode === 'register' ? t.passwordHint : undefined}><Input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 12 : 1} maxLength={256} dir="ltr" /></Field>
      {state.error && <p className="account-error" role="alert">{state.error}</p>}
      <Button type="submit" size="lg" disabled={pending}>{pending ? t.pending : mode === 'login' ? t.login : t.register}</Button>
    </form>
    <p className="account-auth__switch"><Link href={mode === 'login' ? '/account/register' : '/account/login'}>{mode === 'login' ? t.toRegister : t.toLogin}</Link></p>
  </section>;
}
