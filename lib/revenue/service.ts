import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { problem } from "@/lib/api/response";
import { db } from "@/lib/db";
import {
  bookings,
  clientStatusEvents,
  clients,
  coachServices,
  organizations,
  payments,
  revenueSnapshots,
} from "@/lib/db/schema";
import { emitHeliosEvent } from "@/lib/events/emit";
import type {
  PaymentListItem,
  RevenueByClientReport,
  RevenueDashboard,
  RevenueMonthPoint,
} from "@/lib/revenue/types";
import type {
  CreateManualPaymentInput,
  ListPaymentsQuery,
  PaymentType,
  RevenueByClientQuery,
  RevenueExportQuery,
} from "@/lib/validators/payments";

function formatClientName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string | null {
  if (!firstName && !lastName) {
    return null;
  }
  return [firstName, lastName].filter(Boolean).join(" ").trim() || null;
}

function mapPaymentRow(row: {
  payment: typeof payments.$inferSelect;
  clientFirstName: string | null;
  clientLastName: string | null;
  serviceName: string | null;
}): PaymentListItem {
  return {
    id: row.payment.id,
    organizationId: row.payment.organizationId,
    coachClerkUserId: row.payment.coachClerkUserId,
    clientId: row.payment.clientId,
    clientName: formatClientName(row.clientFirstName, row.clientLastName),
    serviceId: row.payment.serviceId,
    serviceName: row.serviceName,
    bookingId: row.payment.bookingId,
    amountCents: row.payment.amountCents,
    currency: row.payment.currency,
    type: row.payment.type,
    source: row.payment.source,
    externalReference: row.payment.externalReference,
    description: row.payment.description,
    paidAt: row.payment.paidAt.toISOString(),
    status: row.payment.status,
    createdAt: row.payment.createdAt.toISOString(),
  };
}

function buildPaymentFilters(
  organizationId: string,
  query: ListPaymentsQuery,
): SQL {
  const conditions: SQL[] = [eq(payments.organizationId, organizationId)];

  if (query.clientId) {
    conditions.push(eq(payments.clientId, query.clientId));
  }
  if (query.type) {
    conditions.push(eq(payments.type, query.type));
  }
  if (query.status) {
    conditions.push(eq(payments.status, query.status));
  }
  if (query.from) {
    conditions.push(
      gte(payments.paidAt, new Date(`${query.from}T00:00:00.000Z`)),
    );
  }
  if (query.to) {
    conditions.push(
      lte(payments.paidAt, new Date(`${query.to}T23:59:59.999Z`)),
    );
  }

  return and(...conditions)!;
}

function monthStart(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function monthRange(months: number): { start: Date; end: Date } {
  const end = new Date();
  end.setUTCDate(1);
  end.setUTCHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - (months - 1));

  return { start, end };
}

function parseMonthKey(value: string | Date): string {
  if (value instanceof Date) {
    return monthStart(value);
  }
  return value.slice(0, 10);
}

async function aggregatePaymentsForMonth(
  organizationId: string,
  monthKey: string,
): Promise<RevenueMonthPoint> {
  const start = new Date(`${monthKey}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);

  const [row] = await db
    .select({
      totalRevenueCents: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int`,
      mrrCents: sql<number>`coalesce(sum(case when ${payments.type} = 'subscription' then ${payments.amountCents} else 0 end), 0)::int`,
      oneTimeRevenueCents: sql<number>`coalesce(sum(case when ${payments.type} in ('one_time', 'external') then ${payments.amountCents} else 0 end), 0)::int`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.status, "completed"),
        gte(payments.paidAt, start),
        lte(payments.paidAt, end),
      ),
    );

  return {
    month: monthKey,
    totalRevenueCents: row?.totalRevenueCents ?? 0,
    mrrCents: row?.mrrCents ?? 0,
    oneTimeRevenueCents: row?.oneTimeRevenueCents ?? 0,
  };
}

function emitPaymentReceived(
  payment: typeof payments.$inferSelect,
): void {
  emitHeliosEvent("payment.received", {
    organizationId: payment.organizationId,
    paymentId: payment.id,
    clientId: payment.clientId ?? undefined,
    amountCents: payment.amountCents,
    type: payment.type,
    source: payment.source,
  });
}

export async function listPayments(
  organizationId: string,
  query: ListPaymentsQuery,
): Promise<{ items: PaymentListItem[]; total: number }> {
  const where = buildPaymentFilters(organizationId, query);
  const offset = (query.page - 1) * query.limit;

  const [totalRow] = await db
    .select({ total: count() })
    .from(payments)
    .where(where);

  const rows = await db
    .select({
      payment: payments,
      clientFirstName: clients.firstName,
      clientLastName: clients.lastName,
      serviceName: coachServices.name,
    })
    .from(payments)
    .leftJoin(clients, eq(payments.clientId, clients.id))
    .leftJoin(coachServices, eq(payments.serviceId, coachServices.id))
    .where(where)
    .orderBy(desc(payments.paidAt))
    .limit(query.limit)
    .offset(offset);

  return {
    items: rows.map(mapPaymentRow),
    total: totalRow?.total ?? 0,
  };
}

export async function createManualPayment(
  organizationId: string,
  coachClerkUserId: string,
  input: CreateManualPaymentInput,
): Promise<PaymentListItem> {
  if (input.clientId) {
    const client = await db.query.clients.findFirst({
      where: and(
        eq(clients.id, input.clientId),
        eq(clients.organizationId, organizationId),
      ),
    });

    if (!client) {
      throw problem({
        type: "not-found",
        title: "Client not found",
        status: 404,
        detail: "The client does not exist in this organization.",
      });
    }
  }

  if (input.serviceId) {
    const service = await db.query.coachServices.findFirst({
      where: and(
        eq(coachServices.id, input.serviceId),
        eq(coachServices.organizationId, organizationId),
      ),
    });

    if (!service) {
      throw problem({
        type: "not-found",
        title: "Service not found",
        status: 404,
        detail: "The service does not exist in this organization.",
      });
    }
  }

  const [created] = await db
    .insert(payments)
    .values({
      organizationId,
      coachClerkUserId,
      clientId: input.clientId ?? null,
      serviceId: input.serviceId ?? null,
      amountCents: input.amountCents,
      currency: "EUR",
      type: input.type,
      source: "manual",
      externalReference: input.externalReference ?? null,
      description: input.description ?? null,
      paidAt: new Date(input.paidAt),
      status: "completed",
    })
    .returning();

  if (!created) {
    throw problem({
      type: "internal-error",
      title: "Payment creation failed",
      status: 500,
      detail: "Unable to create payment.",
    });
  }

  emitPaymentReceived(created);

  const client = input.clientId
    ? await db.query.clients.findFirst({
        where: eq(clients.id, input.clientId),
      })
    : null;
  const service = input.serviceId
    ? await db.query.coachServices.findFirst({
        where: eq(coachServices.id, input.serviceId),
      })
    : null;

  return mapPaymentRow({
    payment: created,
    clientFirstName: client?.firstName ?? null,
    clientLastName: client?.lastName ?? null,
    serviceName: service?.name ?? null,
  });
}

export async function createPaymentFromBooking(
  organizationId: string,
  bookingId: string,
): Promise<PaymentListItem | null> {
  const existing = await db.query.payments.findFirst({
    where: and(
      eq(payments.organizationId, organizationId),
      eq(payments.bookingId, bookingId),
    ),
  });

  if (existing) {
    return null;
  }

  const booking = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.id, bookingId),
      eq(bookings.organizationId, organizationId),
    ),
    with: { service: true },
  });

  if (!booking) {
    throw problem({
      type: "not-found",
      title: "Booking not found",
      status: 404,
      detail: "The booking does not exist.",
    });
  }

  if (!["paid", "external"].includes(booking.paymentStatus)) {
    return null;
  }

  const amountCents =
    booking.finalPriceCents ?? booking.service?.priceCents ?? 0;

  if (amountCents <= 0) {
    return null;
  }

  const paymentType: PaymentType =
    booking.paymentStatus === "external" ? "external" : "one_time";

  const [created] = await db
    .insert(payments)
    .values({
      organizationId,
      coachClerkUserId: booking.coachClerkUserId,
      clientId: booking.clientId,
      serviceId: booking.serviceId,
      bookingId: booking.id,
      amountCents,
      currency: booking.service?.currency ?? "EUR",
      type: paymentType,
      source: "booking",
      description: booking.service?.name
        ? `Réservation — ${booking.service.name}`
        : "Réservation boutique",
      paidAt: new Date(),
      status: "completed",
    })
    .returning();

  if (!created) {
    return null;
  }

  emitPaymentReceived(created);

  const client = booking.clientId
    ? await db.query.clients.findFirst({
        where: eq(clients.id, booking.clientId),
      })
    : null;

  return mapPaymentRow({
    payment: created,
    clientFirstName: client?.firstName ?? null,
    clientLastName: client?.lastName ?? null,
    serviceName: booking.service?.name ?? null,
  });
}

export async function getRevenueDashboard(
  organizationId: string,
  months: number,
): Promise<RevenueDashboard> {
  const { start, end } = monthRange(months);
  const monthKeys: string[] = [];

  const cursor = new Date(start);
  while (cursor <= end) {
    monthKeys.push(monthStart(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const snapshotRows = await db
    .select()
    .from(revenueSnapshots)
    .where(
      and(
        eq(revenueSnapshots.organizationId, organizationId),
        gte(revenueSnapshots.month, monthStart(start)),
        lte(revenueSnapshots.month, monthStart(end)),
      ),
    );

  const snapshotMap = new Map(
    snapshotRows.map((row) => [parseMonthKey(row.month), row]),
  );

  const series: RevenueMonthPoint[] = [];
  for (const monthKey of monthKeys) {
    const snapshot = snapshotMap.get(monthKey);
    if (snapshot) {
      series.push({
        month: monthKey,
        totalRevenueCents: snapshot.totalRevenueCents,
        mrrCents: snapshot.mrrCents,
        oneTimeRevenueCents: snapshot.oneTimeRevenueCents,
      });
    } else {
      series.push(await aggregatePaymentsForMonth(organizationId, monthKey));
    }
  }

  const currentMonthKey = monthStart(new Date());
  const currentFromLive = await aggregatePaymentsForMonth(
    organizationId,
    currentMonthKey,
  );

  const [paymentCountRow] = await db
    .select({ total: count() })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.status, "completed"),
        gte(
          payments.paidAt,
          new Date(`${currentMonthKey}T00:00:00.000Z`),
        ),
      ),
    );

  return {
    currentMonth: {
      totalRevenueCents: currentFromLive.totalRevenueCents,
      mrrCents: currentFromLive.mrrCents,
      oneTimeRevenueCents: currentFromLive.oneTimeRevenueCents,
      paymentCount: paymentCountRow?.total ?? 0,
    },
    series,
  };
}

function buildDateRangeFilter(
  organizationId: string,
  from?: string,
  to?: string,
): SQL {
  const conditions: SQL[] = [
    eq(payments.organizationId, organizationId),
    eq(payments.status, "completed"),
  ];

  if (from) {
    conditions.push(
      gte(payments.paidAt, new Date(`${from}T00:00:00.000Z`)),
    );
  }
  if (to) {
    conditions.push(lte(payments.paidAt, new Date(`${to}T23:59:59.999Z`)));
  }

  return and(...conditions)!;
}

export async function getRevenueByClient(
  organizationId: string,
  query: RevenueByClientQuery,
): Promise<RevenueByClientReport> {
  const where = buildDateRangeFilter(organizationId, query.from, query.to);

  const clientRows = await db
    .select({
      clientId: payments.clientId,
      clientFirstName: clients.firstName,
      clientLastName: clients.lastName,
      totalRevenueCents: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int`,
      paymentCount: count(),
    })
    .from(payments)
    .leftJoin(clients, eq(payments.clientId, clients.id))
    .where(where)
    .groupBy(payments.clientId, clients.firstName, clients.lastName)
    .orderBy(desc(sql`sum(${payments.amountCents})`))
    .limit(10);

  const serviceRows = await db
    .select({
      serviceId: payments.serviceId,
      serviceName: coachServices.name,
      totalRevenueCents: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int`,
      paymentCount: count(),
    })
    .from(payments)
    .leftJoin(coachServices, eq(payments.serviceId, coachServices.id))
    .where(where)
    .groupBy(payments.serviceId, coachServices.name)
    .orderBy(desc(sql`sum(${payments.amountCents})`))
    .limit(10);

  return {
    clients: clientRows.map((row) => ({
      clientId: row.clientId,
      clientName:
        formatClientName(row.clientFirstName, row.clientLastName) ??
        "Sans client",
      totalRevenueCents: row.totalRevenueCents,
      paymentCount: row.paymentCount,
    })),
    services: serviceRows.map((row) => ({
      serviceId: row.serviceId,
      serviceName: row.serviceName ?? "Sans prestation",
      totalRevenueCents: row.totalRevenueCents,
      paymentCount: row.paymentCount,
    })),
  };
}

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  subscription: "Abonnement",
  one_time: "Ponctuel",
  external: "Externe",
};

export async function buildRevenueCsv(
  organizationId: string,
  query: RevenueExportQuery,
): Promise<string> {
  const where = buildDateRangeFilter(
    organizationId,
    query.from,
    query.to,
  );

  const rows = await db
    .select({
      paidAt: payments.paidAt,
      amountCents: payments.amountCents,
      currency: payments.currency,
      type: payments.type,
      clientFirstName: clients.firstName,
      clientLastName: clients.lastName,
    })
    .from(payments)
    .leftJoin(clients, eq(payments.clientId, clients.id))
    .where(where)
    .orderBy(desc(payments.paidAt));

  const header = "date,montant,devise,client,type";
  const lines = rows.map((row) => {
    const date = row.paidAt.toISOString().slice(0, 10);
    const amount = (row.amountCents / 100).toFixed(2);
    const clientName =
      formatClientName(row.clientFirstName, row.clientLastName) ?? "";
    const type = PAYMENT_TYPE_LABELS[row.type] ?? row.type;

    return [
      escapeCsvValue(date),
      escapeCsvValue(amount),
      escapeCsvValue(row.currency),
      escapeCsvValue(clientName),
      escapeCsvValue(type),
    ].join(",");
  });

  return [header, ...lines].join("\n");
}

async function countActiveClients(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(clients)
    .where(
      and(
        eq(clients.organizationId, organizationId),
        inArray(clients.status, ["ACTIVE", "TRIAL"]),
      ),
    );

  return row?.total ?? 0;
}

async function countClientStatusChanges(
  organizationId: string,
  monthKey: string,
  direction: "new" | "churned",
): Promise<number> {
  const start = new Date(`${monthKey}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  const targetStatus = direction === "new" ? "ACTIVE" : "CHURNED";

  const [row] = await db
    .select({ total: count() })
    .from(clientStatusEvents)
    .where(
      and(
        eq(clientStatusEvents.organizationId, organizationId),
        eq(clientStatusEvents.toStatus, targetStatus),
        gte(clientStatusEvents.createdAt, start),
        lte(clientStatusEvents.createdAt, end),
      ),
    );

  return row?.total ?? 0;
}

export async function computeMonthlySnapshots(): Promise<{ upserted: number }> {
  const now = new Date();
  const previousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const monthKey = monthStart(previousMonth);

  const orgRows = await db.select({ id: organizations.id }).from(organizations);

  let upserted = 0;

  for (const org of orgRows) {
    const aggregates = await aggregatePaymentsForMonth(org.id, monthKey);
    const clientCount = await countActiveClients(org.id);
    const newClients = await countClientStatusChanges(org.id, monthKey, "new");
    const churnedClients = await countClientStatusChanges(
      org.id,
      monthKey,
      "churned",
    );

    await db
      .insert(revenueSnapshots)
      .values({
        organizationId: org.id,
        month: monthKey,
        totalRevenueCents: aggregates.totalRevenueCents,
        mrrCents: aggregates.mrrCents,
        oneTimeRevenueCents: aggregates.oneTimeRevenueCents,
        clientCount,
        newClients,
        churnedClients,
      })
      .onConflictDoUpdate({
        target: [revenueSnapshots.organizationId, revenueSnapshots.month],
        set: {
          totalRevenueCents: aggregates.totalRevenueCents,
          mrrCents: aggregates.mrrCents,
          oneTimeRevenueCents: aggregates.oneTimeRevenueCents,
          clientCount,
          newClients,
          churnedClients,
        },
      });

    upserted += 1;
  }

  return { upserted };
}
