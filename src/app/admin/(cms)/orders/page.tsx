import Link from "next/link";
import { Button, EmptyState, Input, JalaliDateRange, Select } from "@/components/ui";
import { getLocale } from "@/lib/locale-server";
import { formatJalaliDate } from "@/lib/format";
import { adminOrderMessage, type AdminOrderMessageKey } from "@/modules/orders";
import { listAdminOrders, type AdminOrderStatus } from "@/modules/orders";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const allowedStatuses: AdminOrderStatus[] = ["RESERVED", "EXPIRED", "CANCELED"];
function message(locale: Awaited<ReturnType<typeof getLocale>>, key: AdminOrderMessageKey) {
  return adminOrderMessage(locale, key);
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const statusParam = typeof params.status === "string" ? params.status : undefined;
  const validStatus = statusParam && allowedStatuses.includes(statusParam as AdminOrderStatus);
  const invalidStatus = params.status !== undefined && !validStatus;
  const status = validStatus ? statusParam as AdminOrderStatus : undefined;
  const stringParam = (key: string, max: number) => typeof params[key] === "string" && (params[key] as string).length <= max ? (params[key] as string).trim() : "";
  const from = stringParam("from", 10);
  const to = stringParam("to", 10);
  const customer = stringParam("customer", 160);
  const orderId = stringParam("orderId", 128);
  const sku = stringParam("sku", 64);
  const validDate = (value: string) => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  const invalidFilters = !validDate(from) || !validDate(to) || Boolean(from && to && from > to);
  const rawPage = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const [locale, result] = await Promise.all([
    getLocale(),
    listAdminOrders(invalidFilters ? { status, page } : { status, page, from: from || undefined, to: to || undefined, customer: customer || undefined, orderId: orderId || undefined, sku: sku || undefined }),
  ]);
  const m = (key: AdminOrderMessageKey) => message(locale, key);
  const localeTag = locale === "fa" ? "fa-IR" : "ckb-IQ";
  const statusText = (value: AdminOrderStatus) => m(value === "RESERVED" ? "reserved" : value === "EXPIRED" ? "expired" : "canceled");
  const queryParams = new URLSearchParams();
  if (status) queryParams.set("status", status);
  if (from) queryParams.set("from", from);
  if (to) queryParams.set("to", to);
  if (customer) queryParams.set("customer", customer);
  if (orderId) queryParams.set("orderId", orderId);
  if (sku) queryParams.set("sku", sku);
  const query = queryParams.toString();
  return <>
    <div className="admin-heading"><div><p className="eyebrow">{m("dashboardOrders")}</p><h1>{m("orders")}</h1><p>{m("ordersIntro")}</p></div></div>
    <form method="get" className="admin-order-filter" aria-label={m("orders")}>
      <label htmlFor="order-search">{m("search")}<Input id="order-search" name="customer" type="search" placeholder={m("searchHint")} defaultValue={customer} /></label>
      <label htmlFor="order-id">{m("orderIdSearch")}<Input id="order-id" name="orderId" type="search" defaultValue={orderId} dir="ltr" /></label>
      <label htmlFor="order-sku">{m("skuSearch")}<Input id="order-sku" name="sku" type="search" defaultValue={sku} dir="ltr" /></label>
      <JalaliDateRange className="admin-date-range" key={`${from}:${to}`} from={from} to={to} locale={locale} fromLabel={m("fromDate")} toLabel={m("toDate")} clearLabel={locale === "fa" ? "پاک‌کردن بازه" : "پاککردنەوەی ماوە"} />
      <label htmlFor="order-status">{m("status")}
      <Select id="order-status" name="status" defaultValue={status ?? ""}>
        <option value="">{m("allStatuses")}</option>
        {allowedStatuses.map((value) => <option key={value} value={value}>{statusText(value)}</option>)}
      </Select></label>
      <Button type="submit" variant="secondary">{m("filter")}</Button>
    </form>
    {invalidStatus ? <p className="admin-notice" role="status">{m("invalidStatusFilter")}</p> : null}
    {invalidFilters ? <p className="admin-notice admin-notice--error" role="alert">{m("invalidFilters")}</p> : null}
    {result.orders.length === 0 ? <EmptyState title={m("noOrders")} /> : <div className="admin-order-list">
      {result.orders.map((order) => {
        const customer = order.customerSnapshot && typeof order.customerSnapshot === "object" && !Array.isArray(order.customerSnapshot) ? order.customerSnapshot as Record<string, unknown> : {};
        return <article className="admin-panel admin-order-card" key={order.id}>
          <div className="admin-order-card__top"><div><p className="eyebrow">{m("order")} <bdi dir="ltr">{order.id}</bdi></p><h2>{typeof customer.name === "string" ? customer.name : m("customer")}</h2></div><span className={`admin-order-status admin-order-status--${order.status.toLowerCase()}`}>{statusText(order.status)}</span></div>
          <dl className="admin-order-meta"><div><dt>{m("created")}</dt><dd>{formatJalaliDate(order.createdAt, localeTag)}</dd></div><div><dt>{m("expires")}</dt><dd>{formatJalaliDate(order.expiresAt, localeTag)}</dd></div><div><dt>{m("lines")}</dt><dd>{new Intl.NumberFormat(localeTag).format(order.lines.length)}</dd></div></dl>
          <Link className="admin-order-open" href={`/admin/orders/${encodeURIComponent(order.id)}`}>{m("open")} ←</Link>
        </article>;
      })}
    </div>}
    {result.total > 0 ? <nav className="admin-order-pagination" aria-label={m("orders")}>
      <span>{m("page")} {new Intl.NumberFormat(localeTag).format(result.page)} {m("of")} {new Intl.NumberFormat(localeTag).format(result.pageCount)}</span>
      <div>{result.page > 1 ? <Link href={`/admin/orders?page=${result.page - 1}${query ? `&${query}` : ""}`}>{m("previous")}</Link> : <span aria-disabled="true">{m("previous")}</span>}{result.page < result.pageCount ? <Link href={`/admin/orders?page=${result.page + 1}${query ? `&${query}` : ""}`}>{m("next")}</Link> : <span aria-disabled="true">{m("next")}</span>}</div>
    </nav> : null}
  </>;
}
