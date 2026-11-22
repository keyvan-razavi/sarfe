import Link from 'next/link';
import { Badge, Button, EmptyState, Input, Select } from '@/components/ui';
import { getLocale } from '@/lib/locale-server';
import { listManageableBlogPosts } from '@/modules/blog/admin';
import { blogMessage } from '@/modules/blog/messages';
import { BlogDeleteForm } from '@/modules/blog/editor';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const statuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export default async function AdminBlogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const locale = await getLocale();
  const m = (key: Parameters<typeof blogMessage>[1]) => blogMessage(locale, key);
  const search = typeof params.search === 'string' && params.search.length <= 120 ? params.search.trim() : '';
  const status = typeof params.status === 'string' && statuses.includes(params.status as (typeof statuses)[number]) ? params.status as (typeof statuses)[number] : undefined;
  const requestedPage = typeof params.page === 'string' ? Number(params.page) : 1;
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100_000 ? requestedPage : 1;
  const result = await listManageableBlogPosts({ search, status, page });
  const statusLabel = (value: (typeof statuses)[number]) => m(value === 'DRAFT' ? 'draft' : value === 'PUBLISHED' ? 'published' : 'archived');
  const query = new URLSearchParams(); if (search) query.set('search', search); if (status) query.set('status', status);
  const pageHref = (next: number) => `/admin/blog?${new URLSearchParams([...query.entries(), ['page', String(next)]]).toString()}`;
  return <>
    <div className="admin-heading"><div><p className="eyebrow">{m('title')}</p><h1>{m('title')}</h1></div><Link href="/admin/blog/new" className="ui-button ui-button--primary ui-button--md">{m('newPost')}</Link></div>
    {result.mode === 'preview' ? <div className="admin-notice" role="status">{m('readOnly')}</div> : null}
    {params.saved ? <div className="admin-notice" role="status">{m('saved')}</div> : null}
    {params.deleted ? <div className="admin-notice" role="status">{m('deleted')}</div> : null}
    <form method="get" className="admin-panel admin-grid" aria-label={m('title')}>
      <label htmlFor="blog-search">{m('search')}<Input id="blog-search" name="search" type="search" defaultValue={search} maxLength={120} /></label>
      <label htmlFor="blog-status">{m('status')}<Select id="blog-status" name="status" defaultValue={status ?? ''}><option value="">{m('all')}</option>{statuses.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</Select></label>
      <div className="admin-form__actions"><Button type="submit" variant="secondary">{m('search')}</Button></div>
    </form>
    {result.posts.length ? <section className="admin-panel" aria-label={m('title')}>
      <div className="admin-repeater">{result.posts.map((post) => {
        const title = post.translations[locale]?.title || post.translations.fa.title;
        return <article className="admin-form-card" key={post.id}>
          <div className="admin-heading"><div><h2>{title}</h2><p><bdi dir="ltr">/{post.slug}</bdi> · {new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'ckb-IQ', { dateStyle: 'medium' }).format(new Date(post.updatedAt))}</p></div><Badge>{statusLabel(post.status)}</Badge></div>
          <div className="admin-form__actions"><Link className="ui-button ui-button--secondary ui-button--sm" href={`/admin/blog/${encodeURIComponent(post.id)}/edit`}>{m('open')}</Link><BlogDeleteForm locale={locale} id={post.id} editable={result.mode === 'database'} /></div>
        </article>;
      })}</div>
      <nav className="admin-form__actions" aria-label={m('title')}>
        {result.page > 1 ? <Link className="ui-button ui-button--secondary ui-button--sm" href={pageHref(result.page - 1)}>{m('previous')}</Link> : null}
        <span>{m('page')} {result.page}</span>
        {result.page * result.pageSize < result.total ? <Link className="ui-button ui-button--secondary ui-button--sm" href={pageHref(result.page + 1)}>{m('next')}</Link> : null}
      </nav>
    </section> : <EmptyState title={m('noPosts')}><p>{search ? m('emptySearch') : m('noPosts')}</p></EmptyState>}
  </>;
}
