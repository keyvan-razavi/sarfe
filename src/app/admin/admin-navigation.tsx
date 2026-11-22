'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type AdminNavigationItem = { href: string; label: string };

export function AdminNavigation({ items, label }: { items: AdminNavigationItem[]; label: string }) {
  const pathname = usePathname();

  return (
    <nav className="admin-nav" aria-label={label}>
      {items.map(({ href, label: itemLabel }) => {
        const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined}>
            {itemLabel}
          </Link>
        );
      })}
    </nav>
  );
}
