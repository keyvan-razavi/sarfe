import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/modules/identity";
import { releaseOrder } from "./service";

const statusSchema = z.enum(["RESERVED", "EXPIRED", "CANCELED"]);
const listSchema = z.object({
  status: statusSchema.optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  customer: z.string().trim().max(160).optional(),
  orderId: z.string().trim().max(128).optional(),
  sku: z.string().trim().max(64).optional(),
  page: z.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
}).superRefine((input, ctx) => {
  if (input.from && input.to && input.from > input.to) {
    ctx.addIssue({ code: "custom", path: ["from"], message: "Start date must be before end date." });
  }
});

const reportSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
}).superRefine((input, ctx) => {
  if (input.from && input.to && input.from > input.to) {
    ctx.addIssue({ code: "custom", path: ["from"], message: "Start date must be before end date." });
  }
  if (input.from && input.to && Date.parse(`${input.to}T00:00:00Z`) - Date.parse(`${input.from}T00:00:00Z`) > 365 * 86400_000) {
    ctx.addIssue({ code: "custom", path: ["to"], message: "Date range must not exceed 366 days." });
  }
});

export type AdminOrderStatus = z.infer<typeof statusSchema>;
export type AdminOrderListInput = z.input<typeof listSchema>;
export type AdminOrderReportInput = z.input<typeof reportSchema>;
export type AdminOrderList = Awaited<ReturnType<typeof listAdminOrders>>;

function assertDatabaseAvailable() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Order management requires configured PostgreSQL.");
  }
}

function safeInteger(value: bigint, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Stored ${label} exceeds the supported amount.`);
  }
  return parsed;
}

const orderSelect = {
  id: true,
  status: true,
  customerSnapshot: true,
  addressSnapshot: true,
  currency: true,
  subtotalMinor: true,
  shippingMinor: true,
  taxMinor: true,
  totalMinor: true,
  expiresAt: true,
  releasedAt: true,
  createdAt: true,
  lines: {
    select: {
      id: true,
      productNameSnapshot: true,
      variantNameSnapshot: true,
      skuSnapshot: true,
      quantity: true,
      reservedRemaining: true,
      unitPriceMinor: true,
      lineTotalMinor: true,
      currency: true,
    },
    orderBy: { id: "asc" as const },
  },
} as const;

type AdminOrderRecord = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

function presentOrder(order: AdminOrderRecord) {
  return {
    ...order,
    subtotalMinor: safeInteger(order.subtotalMinor, "subtotal"),
    shippingMinor: safeInteger(order.shippingMinor, "shipping amount"),
    taxMinor: safeInteger(order.taxMinor, "tax amount"),
    totalMinor: safeInteger(order.totalMinor, "order total"),
    lines: order.lines.map((line) => ({
      ...line,
      lineTotalMinor: safeInteger(line.lineTotalMinor, "line total"),
    })),
  };
}

/** Owner-only order list. Filters are restricted to the persisted reservation lifecycle. */
export async function listAdminOrders(raw: AdminOrderListInput = {}) {
  await requireOwner();
  assertDatabaseAvailable();
  const input = listSchema.parse(raw);
  const from = input.from ? new Date(`${input.from}T00:00:00.000Z`) : undefined;
  const to = input.to ? new Date(`${input.to}T00:00:00.000Z`) : undefined;
  if (to) to.setUTCDate(to.getUTCDate() + 1);
  const q = input.customer?.trim();
  const where = {
    ...(input.status ? { status: input.status } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}),
    ...(input.orderId?.trim() ? { id: { contains: input.orderId.trim(), mode: "insensitive" as const } } : {}),
    ...(input.sku?.trim() ? { lines: { some: { skuSnapshot: { contains: input.sku.trim(), mode: "insensitive" as const } } } } : {}),
    ...(q ? { OR: (["name", "email", "phone"] as const).map((path) => ({ customerSnapshot: { path: [path], string_contains: q, mode: "insensitive" as const } })) } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      select: orderSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.order.count({ where }),
  ]);
  return {
    orders: rows.map(presentOrder),
    page: input.page,
    pageSize: input.pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
    status: input.status ?? null,
    filters: { from: input.from ?? "", to: input.to ?? "", customer: input.customer ?? "", orderId: input.orderId ?? "", sku: input.sku ?? "" },
  };
}

/** Owner-only snapshot detail, including the original customer, address, and line data. */
export async function getAdminOrder(id: string) {
  await requireOwner();
  assertDatabaseAvailable();
  const parsedId = z.string().trim().min(1).max(128).parse(id);
  const order = await prisma.order.findUnique({ where: { id: parsedId }, select: orderSelect });
  return order ? presentOrder(order) : null;
}

/** Cancel a live stock reservation; repeated requests safely report no new release. */
export async function cancelAdminOrder(id: string): Promise<{ released: boolean }> {
  await requireOwner();
  assertDatabaseAvailable();
  const parsedId = z.string().trim().min(1).max(128).parse(id);
  const changed = await releaseOrder(parsedId, "CANCELED");
  return { released: changed };
}

/** Owner-only operational counts. No monetary totals are returned. */
export async function getAdminOrderCounts() {
  await requireOwner();
  assertDatabaseAvailable();
  const [total, reserved, expired, canceled, due] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "RESERVED" } }),
    prisma.order.count({ where: { status: "EXPIRED" } }),
    prisma.order.count({ where: { status: "CANCELED" } }),
    prisma.order.count({ where: { status: "RESERVED", expiresAt: { lte: new Date() } } }),
  ]);
  return { total, reserved, expired, canceled, due };
}

/** Owner-only daily order-operation report; it returns counts and dates only. */
export async function getAdminOrderReport(raw: AdminOrderReportInput = {}) {
  await requireOwner();
  assertDatabaseAvailable();
  const input = reportSchema.parse(raw);
  const now = new Date();
  const defaultTo = now.toISOString().slice(0, 10);
  const defaultFromDate = new Date(`${defaultTo}T00:00:00.000Z`);
  defaultFromDate.setUTCDate(defaultFromDate.getUTCDate() - 13);
  const fromDay = input.from ?? defaultFromDate.toISOString().slice(0, 10);
  const toDay = input.to ?? defaultTo;
  const from = new Date(`${fromDay}T00:00:00.000Z`);
  const toExclusive = new Date(`${toDay}T00:00:00.000Z`);
  if (toExclusive.getTime() - from.getTime() > 365 * 86400_000) {
    throw new Error("Report date range must not exceed 366 days.");
  }
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const buckets = await prisma.$queryRaw<Array<{ day: string; status: AdminOrderStatus; count: bigint }>>`
    SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day, status::text AS status, count(*)::bigint AS count
    FROM "Order"
    WHERE "createdAt" >= ${from} AND "createdAt" < ${toExclusive}
    GROUP BY 1, status
    ORDER BY 1 ASC
  `;
  const byDay = new Map<string, { RESERVED: number; EXPIRED: number; CANCELED: number }>();
  for (let day = new Date(from); day < toExclusive; day.setUTCDate(day.getUTCDate() + 1)) {
    byDay.set(day.toISOString().slice(0, 10), { RESERVED: 0, EXPIRED: 0, CANCELED: 0 });
  }
  for (const bucket of buckets) {
    const row = byDay.get(bucket.day);
    if (row) row[bucket.status] = Number(bucket.count);
  }
  const daily = [...byDay].map(([date, statuses]) => ({ date, ...statuses, total: statuses.RESERVED + statuses.EXPIRED + statuses.CANCELED }));
  const [total, reserved, expired, canceled] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: from, lt: toExclusive } } }),
    prisma.order.count({ where: { status: "RESERVED", createdAt: { gte: from, lt: toExclusive } } }),
    prisma.order.count({ where: { status: "EXPIRED", createdAt: { gte: from, lt: toExclusive } } }),
    prisma.order.count({ where: { status: "CANCELED", createdAt: { gte: from, lt: toExclusive } } }),
  ]);
  return { from: fromDay, to: toDay, total, reserved, expired, canceled, daily };
}
