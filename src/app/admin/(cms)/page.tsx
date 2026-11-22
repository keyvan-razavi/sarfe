import Link from 'next/link';
import { Button, JalaliDateRange } from '@/components/ui';
import { getLocale } from '@/lib/locale-server';
import { formatJalaliDate } from '@/lib/format';
import { catalogMessage } from '@/modules/catalog/messages';
import { listManageableCatalog } from '@/modules/catalog/admin';
import { adminOrderMessage, getAdminOrderCounts, getAdminOrderReport } from '@/modules/orders';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function validDateParam(value: string | string[] | undefined): string | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : undefined;
}

export default async function AdminOverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const fromParam = validDateParam(params.from);
  const toParam = validDateParam(params.to);
  const validRange = (!fromParam || !toParam || fromParam <= toParam)
    && (!fromParam || !toParam || Date.parse(`${toParam}T00:00:00Z`) - Date.parse(`${fromParam}T00:00:00Z`) <= 365 * 86_400_000);

  const [catalog, orderCounts, report, locale] = await Promise.all([
    listManageableCatalog(),
    getAdminOrderCounts(),
    getAdminOrderReport(validRange ? { from: fromParam, to: toParam } : {}),
    getLocale(),
  ]);
  const catalogText = (key: Parameters<typeof catalogMessage>[1]) => catalogMessage(locale, key);
  const orderText = (key: Parameters<typeof adminOrderMessage>[1]) => adminOrderMessage(locale, key);
  const localeTag = locale === 'fa' ? 'fa-IR' : 'ckb-IQ';
  const number = (value: number) => new Intl.NumberFormat(localeTag).format(value);
  const reportDate = (value: string) => formatJalaliDate(value, localeTag);
  const maxDaily = Math.max(1, ...report.daily.map((day) => day.total));
  const barWidth = 900 / report.daily.length;

  const chartBars = report.daily.map((day, index) => {
    const x = index * barWidth + barWidth * 0.15;
    const width = Math.max(1, barWidth * 0.7);
    const heights = {
      RESERVED: day.RESERVED / maxDaily * 145,
      EXPIRED: day.EXPIRED / maxDaily * 145,
      CANCELED: day.CANCELED / maxDaily * 145,
    };
    const reservedY = 165 - heights.RESERVED;
    const expiredY = reservedY - heights.EXPIRED;
    const canceledY = expiredY - heights.CANCELED;

    return (
      <g key={day.date}>
        <rect x={x} y={reservedY} width={width} height={heights.RESERVED} rx="2" className="admin-chart-reserved">
          <title>{reportDate(day.date)}: {orderText('reserved')} {number(day.RESERVED)}</title>
        </rect>
        <rect x={x} y={expiredY} width={width} height={heights.EXPIRED} rx="2" className="admin-chart-expired">
          <title>{reportDate(day.date)}: {orderText('expired')} {number(day.EXPIRED)}</title>
        </rect>
        <rect x={x} y={canceledY} width={width} height={heights.CANCELED} rx="2" className="admin-chart-canceled">
          <title>{reportDate(day.date)}: {orderText('canceled')} {number(day.CANCELED)}</title>
        </rect>
      </g>
    );
  });

  return (
    <div className="admin-overview">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">{catalogText('owner')}</p>
          <h1>{catalogText('morning')}</h1>
          <p>{catalogText('manageCollection')}</p>
        </div>
        <Link href="/admin/products/new"><Button>{catalogText('addProduct')}</Button></Link>
      </div>

      {catalog.mode === 'preview' ? <p className="admin-notice">{catalogText('readOnly')}</p> : null}

      <section className="admin-grid" aria-label={catalogText('catalog')}>
        <article className="admin-panel">
          <p className="eyebrow">{catalogText('catalog')}</p>
          <h2>{number(catalog.products.length)} {catalogText('productCount')}</h2>
          <p className="admin-help">
            {number(catalog.products.filter((product) => product.status === 'PUBLISHED').length)} {catalogText('published')}
            {' · '}{number(catalog.categories.length)} {catalogText('categoryCount')}
          </p>
          <Link href="/admin/products">{catalogText('manageProducts')} ←</Link>
        </article>
        <article className="admin-panel">
          <p className="eyebrow">{catalogText('configuration')}</p>
          <h2>{number(catalog.categories.length)} {catalogText('categoryCount')}</h2>
          <p className="admin-help">{catalogText('manageCategories')}</p>
          <Link href="/admin/categories">{catalogText('categories')} ←</Link>
        </article>
      </section>

      <section className="admin-orders-dashboard" aria-labelledby="admin-orders-title">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">{orderText('dashboardOrders')}</p>
            <h2 id="admin-orders-title">{orderText('orders')}</h2>
            <p>{orderText('ordersCardHelp')}</p>
          </div>
          <Link href="/admin/orders">{orderText('orders')} ←</Link>
        </div>

        <div className="admin-order-counts" aria-label={orderText('orders')}>
          <article className="admin-panel"><h3>{orderText('active')}</h3><p>{number(orderCounts.reserved)}</p></article>
          <article className="admin-panel"><h3>{orderText('due')}</h3><p>{number(orderCounts.due)}</p></article>
          <article className="admin-panel"><h3>{orderText('expiredCount')}</h3><p>{number(orderCounts.expired)}</p></article>
          <article className="admin-panel"><h3>{orderText('canceledCount')}</h3><p>{number(orderCounts.canceled)}</p></article>
          <article className="admin-panel"><h3>{orderText('totalCount')}</h3><p>{number(orderCounts.total)}</p></article>
        </div>

        <form method="get" className="admin-report-filter">
          <strong>{orderText('reportRange')}</strong>
          <JalaliDateRange className="admin-date-range" key={`${report.from}:${report.to}`} from={report.from} to={report.to} locale={locale} fromLabel={orderText('fromDate')} toLabel={orderText('toDate')} clearLabel={locale === 'fa' ? 'پاک‌کردن بازه' : 'پاککردنەوەی ماوە'} />
          <Button type="submit" variant="secondary">{orderText('filter')}</Button>
        </form>

        {!validRange ? <p className="admin-notice admin-notice--error" role="alert">{orderText('invalidFilters')}</p> : null}

        <div className="admin-order-counts admin-order-counts--range">
          <article className="admin-panel"><h3>{orderText('totalCount')}</h3><p>{number(report.total)}</p></article>
          <article className="admin-panel"><h3>{orderText('active')}</h3><p>{number(report.reserved)}</p></article>
          <article className="admin-panel"><h3>{orderText('expiredCount')}</h3><p>{number(report.expired)}</p></article>
          <article className="admin-panel"><h3>{orderText('canceledCount')}</h3><p>{number(report.canceled)}</p></article>
        </div>

        <p className="admin-help">{orderText('operationsOnly')}</p>

        <figure className="admin-order-chart">
          <figcaption>
            <h3>{orderText('dailyVolume')}</h3>
            <p>{orderText('dailyVolumeDescription')} · {orderText('reportFrom')} {reportDate(report.from)} {orderText('reportTo')} {reportDate(report.to)}</p>
          </figcaption>
          <div className="admin-order-chart__scroll">
            <svg viewBox="0 0 900 205" role="img" aria-labelledby="order-chart-title order-chart-desc" preserveAspectRatio="none">
              <title id="order-chart-title">{orderText('dailyVolume')}</title>
              <desc id="order-chart-desc">{orderText('dailyVolumeDescription')}</desc>
              <line x1="0" y1="165" x2="900" y2="165" className="admin-chart-axis" />
              {chartBars}
            </svg>
          </div>
          <div className="admin-chart-legend">
            <span><i className="admin-chart-key admin-chart-key--reserved" />{orderText('reserved')}</span>
            <span><i className="admin-chart-key admin-chart-key--expired" />{orderText('expired')}</span>
            <span><i className="admin-chart-key admin-chart-key--canceled" />{orderText('canceled')}</span>
          </div>
        </figure>

        <details className="admin-report-data">
          <summary>{orderText('dailyDataTable')}</summary>
          <div className="admin-table-wrap" tabIndex={0} aria-label={orderText('dailyDataTable')}>
            <table className="admin-table">
              <thead><tr><th>{orderText('day')}</th><th>{orderText('totalCount')}</th><th>{orderText('reserved')}</th><th>{orderText('expired')}</th><th>{orderText('canceled')}</th></tr></thead>
              <tbody>{report.daily.map((day) => (
                <tr key={day.date}><td>{reportDate(day.date)}</td><td>{number(day.total)}</td><td>{number(day.RESERVED)}</td><td>{number(day.EXPIRED)}</td><td>{number(day.CANCELED)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </details>
      </section>
    </div>
  );
}
