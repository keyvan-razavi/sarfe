import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui";
import { formatJalaliDate } from "@/lib/format";
import { formatStoreMoney } from "@/lib/store-money";
import { getLocale } from "@/lib/locale-server";
import { adminOrderMessage, type AdminOrderMessageKey } from "@/modules/orders";
import { getAdminOrder } from "@/modules/orders";
import { cancelOrderAction } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
function objectSnapshot(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function textValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "—";
}

export default async function AdminOrderDetailPage({ params, searchParams }: Props) {
  const [{ id }, query, locale] = await Promise.all([params, searchParams, getLocale()]);
  const order = await getAdminOrder(id);
  if (!order) notFound();
  const m = (key: AdminOrderMessageKey) => adminOrderMessage(locale, key);
  const localeTag = locale === "fa" ? "fa-IR" : "ckb-IQ";
  const customer = objectSnapshot(order.customerSnapshot);
  const address = objectSnapshot(order.addressSnapshot);
  const statusKey = order.status === "RESERVED" ? "reserved" : order.status === "EXPIRED" ? "expired" : "canceled";
  const result = typeof query.result === "string" ? query.result : "";
  return <>
    <p><Link href="/admin/orders">← {m("backToOrders")}</Link></p>
    <div className="admin-heading"><div><p className="eyebrow">{m("order")} <bdi dir="ltr">{order.id}</bdi></p><h1>{textValue(customer.name)}</h1><p>{m("reservationHelp")}</p></div><span className={`admin-order-status admin-order-status--${order.status.toLowerCase()}`}>{m(statusKey)}</span></div>
    {result === "canceled" ? <p className="admin-notice" role="status">{m("cancelSuccess")}</p> : null}
    {result === "ended" ? <p className="admin-notice" role="status">{m("cancelAlreadyEnded")}</p> : null}
    {result === "failed" ? <p className="admin-notice admin-notice--error" role="alert">{m("cancelFailed")}</p> : null}
    <div className="admin-order-detail-grid">
      <section className="admin-panel"><h2>{m("customer")}</h2><dl className="admin-order-definition"><div><dt>{m("email")}</dt><dd dir="ltr">{textValue(customer.email)}</dd></div><div><dt>{m("phone")}</dt><dd dir="auto">{textValue(customer.phone)}</dd></div><div><dt>{m("created")}</dt><dd>{formatJalaliDate(order.createdAt, localeTag)}</dd></div><div><dt>{m("expires")}</dt><dd>{formatJalaliDate(order.expiresAt, localeTag)}</dd></div>{order.releasedAt ? <div><dt>{m("released")}</dt><dd>{formatJalaliDate(order.releasedAt, localeTag)}</dd></div> : null}</dl></section>
      <section className="admin-panel"><h2>{m("address")}</h2><dl className="admin-order-definition">{(["line1", "line2", "locality", "region", "postalCode", "countryCode"] as const).filter((key) => typeof address[key] === "string" && address[key]).map((key) => <div key={key}><dt>{m(key === "line1" || key === "line2" ? "address" : key === "countryCode" ? "country" : key)}</dt><dd dir="auto">{textValue(address[key])}</dd></div>)}</dl></section>
    </div>
    <section className="admin-panel admin-order-lines"><h2>{m("lines")}</h2><div className="admin-table-wrap" tabIndex={0} aria-label={m("lines")}><table className="admin-table"><thead><tr><th>{m("item")}</th><th>{m("sku")}</th><th>{m("quantity")}</th><th>{m("unitPrice")}</th><th>{m("lineTotal")}</th></tr></thead><tbody>{order.lines.map((line) => <tr key={line.id}><td>{line.productNameSnapshot} · {line.variantNameSnapshot}</td><td><bdi dir="ltr">{line.skuSnapshot}</bdi></td><td className="admin-table__numeric">{new Intl.NumberFormat(localeTag).format(line.quantity)}</td><td>{formatStoreMoney(line.unitPriceMinor, line.currency, localeTag)}</td><td>{formatStoreMoney(line.lineTotalMinor, line.currency, localeTag)}</td></tr>)}</tbody></table></div>
      <dl className="admin-order-totals"><div><dt>{m("subtotal")}</dt><dd>{formatStoreMoney(order.subtotalMinor, order.currency, localeTag)}</dd></div><div><dt>{m("shippingSnapshot")}</dt><dd>{formatStoreMoney(order.shippingMinor, order.currency, localeTag)}</dd></div><div><dt>{m("taxSnapshot")}</dt><dd>{formatStoreMoney(order.taxMinor, order.currency, localeTag)}</dd></div><div><dt>{m("total")}</dt><dd>{formatStoreMoney(order.totalMinor, order.currency, localeTag)}</dd></div></dl>
    </section>
    {order.status === "RESERVED" ? <form action={cancelOrderAction.bind(null, order.id)} className="admin-order-cancel"><p>{m("noPayment")}</p><Button type="submit" variant="danger">{m("cancelReservation")}</Button></form> : null}
  </>;
}
