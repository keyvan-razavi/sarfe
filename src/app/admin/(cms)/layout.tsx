import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui';
import { hasOwnerSession } from '@/modules/identity';
import { logoutAction } from '../actions';
import { getLocale } from '@/lib/locale-server';
import { catalogMessage } from '@/modules/catalog/messages';
import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { BrandLogo } from '@/components/brand-logo';
import { homeContentMessage } from '@/modules/home-content/messages';
import { adminOrderMessage } from '@/modules/orders';
import { AdminNavigation } from '../admin-navigation';
export default async function CmsLayout({ children }: Readonly<{children: React.ReactNode}>) {
  if (!(await hasOwnerSession())) redirect('/admin/login');
  const locale=await getLocale(); const m=(key:Parameters<typeof catalogMessage>[1])=>catalogMessage(locale,key);
  return (
    <div className="admin-shell" dir="rtl">
      <header className="admin-topbar">
        <div className="admin-topbar__identity">
          <Link className="admin-brand" href="/admin">
            <BrandLogo />
            <span className="admin-brand__studio">{m('studio')}</span>
          </Link>
          <p className="admin-topbar__caption">{m('owner')}</p>
        </div>
        <div className="admin-topbar__tools">
          <ThemeToggle />
          <LanguageToggle />
          <form action={logoutAction}>
            <Button variant="secondary" size="sm">{m('signOut')}</Button>
          </form>
        </div>
        <AdminNavigation
          label={m('owner')}
          items={[
            { href: '/admin', label: m('overview') },
            { href: '/admin/products', label: m('products') },
            { href: '/admin/brands', label: m('brands') },
            { href: '/admin/categories', label: m('categories') },
            { href: '/admin/content', label: homeContentMessage(locale, 'title') },
            { href: '/admin/blog', label: locale === 'fa' ? 'بلاگ' : 'بڵاگ' },
            { href: '/admin/orders', label: adminOrderMessage(locale, 'orders') },
          ]}
        />
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
