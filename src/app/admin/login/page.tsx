import { redirect } from 'next/navigation';
import { Button, Field, Input } from '@/components/ui';
import { hasOwnerSession } from '@/modules/identity';
import { loginAction } from '../actions';
import { getLocale } from '@/lib/locale-server';
import { catalogMessage } from '@/modules/catalog/messages';
import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { BrandLogo } from '@/components/brand-logo';
export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{error?: string}> }) {
  if (await hasOwnerSession()) redirect('/admin');
  const [{ error },locale] = await Promise.all([searchParams,getLocale()]); const m=(key:Parameters<typeof catalogMessage>[1])=>catalogMessage(locale,key);
  return <main className="admin-login admin-panel" dir="rtl">
    <ThemeToggle/><LanguageToggle/><p className="eyebrow"><BrandLogo /> <span>/ {m('owner')}</span></p><h1>{m('studio')}</h1><p className="admin-help">{m('signInHelp')}</p>
    {error ? <p className="admin-notice admin-notice--error" role="alert">{error}</p> : null}
    <form action={loginAction} className="admin-form" style={{ marginTop: '1.5rem' }}>
      <Field label={m('email')} htmlFor="email"><Input id="email" name="email" type="email" autoComplete="username" required /></Field>
      <Field label={m('password')} htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      <Button type="submit">{m('signIn')}</Button>
    </form>
  </main>;
}
