import {
  and,
  asc,
  count,
  eq,
  gte,
  inArray,
  lte,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";
import { problem } from "@/lib/api/response";
import { db } from "@/lib/db";
import {
  availabilityRules,
  blockedDates,
  bookings,
  clients,
  coachProfiles,
  coachServices,
} from "@/lib/db/schema";
import { createPaymentFromBooking } from "@/lib/revenue/service";
import type {
  CancelBookingInput,
  CreateBlockedDateInput,
  CreateBookingInput,
  ListBookingsQuery,
  ListSlotsQuery,
  PatchBookingStatusInput,
  PutAvailabilityInput,
} from "@/lib/validators/bookings";
import { generateAvailableSlots, isSlotWithinAvailability } from "./slots";
import type {
  AvailabilityRuleDto,
  BlockedDateDto,
  BookingDetail,
  BookingListItem,
  BookingSlotDto,
} from "./types";

function mapAvailabilityRule(
  row: typeof availabilityRules.$inferSelect,
): AvailabilityRuleDto {
  return {
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    slotDurationMinutes: row.slotDurationMinutes,
    serviceTypes: row.serviceTypes ?? [],
  };
}

function mapBlockedDate(row: typeof blockedDates.$inferSelect): BlockedDateDto {
  return {
    id: row.id,
    date: row.date,
    reason: row.reason,
  };
}

function mapBookingListItem(
  row: typeof bookings.$inferSelect & {
    service?: { name: string } | null;
    client?: { firstName: string; lastName: string } | null;
  },
): BookingListItem {
  const clientName = row.client
    ? `${row.client.firstName} ${row.client.lastName}`.trim()
    : row.prospectName;

  return {
    id: row.id,
    coachClerkUserId: row.coachClerkUserId,
    serviceId: row.serviceId,
    serviceName: row.service?.name ?? "Service",
    clientId: row.clientId,
    clientName: clientName ?? null,
    prospectEmail: row.prospectEmail,
    prospectName: row.prospectName,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    timezone: row.timezone,
    status: row.status,
    paymentStatus: row.paymentStatus,
    notes: row.notes,
    remindersSent: row.remindersSent ?? { d1: false, h1: false },
  };
}

async function getServiceForBooking(serviceId: string) {
  const service = await db.query.coachServices.findFirst({
    where: eq(coachServices.id, serviceId),
    with: {
      profile: true,
    },
  });

  if (!service) {
    throw problem({
      type: "not-found",
      title: "Service not found",
      status: 404,
      detail: "The requested service does not exist.",
    });
  }

  if (!service.bookingEnabled) {
    throw problem({
      type: "forbidden",
      title: "Booking disabled",
      status: 403,
      detail: "Online booking is not enabled for this service.",
    });
  }

  if (!service.profile.isPublished) {
    throw problem({
      type: "forbidden",
      title: "Coach unavailable",
      status: 403,
      detail: "This coach profile is not published.",
    });
  }

  return service;
}

export async function getAvailability(
  organizationId: string,
  coachClerkUserId: string,
): Promise<AvailabilityRuleDto[]> {
  const rows = await db.query.availabilityRules.findMany({
    where: and(
      eq(availabilityRules.organizationId, organizationId),
      eq(availabilityRules.coachClerkUserId, coachClerkUserId),
    ),
    orderBy: [asc(availabilityRules.dayOfWeek), asc(availabilityRules.startTime)],
  });

  return rows.map(mapAvailabilityRule);
}

export async function replaceAvailability(
  organizationId: string,
  coachClerkUserId: string,
  input: PutAvailabilityInput,
): Promise<AvailabilityRuleDto[]> {
  await db.transaction(async (tx) => {
    await tx
      .delete(availabilityRules)
      .where(
        and(
          eq(availabilityRules.organizationId, organizationId),
          eq(availabilityRules.coachClerkUserId, coachClerkUserId),
        ),
      );

    if (input.rules.length > 0) {
      await tx.insert(availabilityRules).values(
        input.rules.map((rule) => ({
          organizationId,
          coachClerkUserId,
          dayOfWeek: rule.dayOfWeek,
          startTime: rule.startTime,
          endTime: rule.endTime,
          slotDurationMinutes: rule.slotDurationMinutes,
          serviceTypes: rule.serviceTypes,
        })),
      );
    }
  });

  return getAvailability(organizationId, coachClerkUserId);
}

export async function listBlockedDates(
  organizationId: string,
  coachClerkUserId: string,
): Promise<BlockedDateDto[]> {
  const rows = await db.query.blockedDates.findMany({
    where: and(
      eq(blockedDates.organizationId, organizationId),
      eq(blockedDates.coachClerkUserId, coachClerkUserId),
    ),
    orderBy: [asc(blockedDates.date)],
  });

  return rows.map(mapBlockedDate);
}

export async function addBlockedDate(
  organizationId: string,
  coachClerkUserId: string,
  input: CreateBlockedDateInput,
): Promise<BlockedDateDto> {
  const [created] = await db
    .insert(blockedDates)
    .values({
      organizationId,
      coachClerkUserId,
      date: input.date,
      reason: input.reason ?? null,
    })
    .onConflictDoNothing()
    .returning();

  if (!created) {
    const existing = await db.query.blockedDates.findFirst({
      where: and(
        eq(blockedDates.organizationId, organizationId),
        eq(blockedDates.coachClerkUserId, coachClerkUserId),
        eq(blockedDates.date, input.date),
      ),
    });

    if (existing) {
      return mapBlockedDate(existing);
    }

    throw problem({
      type: "validation-error",
      title: "Blocked date failed",
      status: 400,
      detail: "Could not block the requested date.",
    });
  }

  return mapBlockedDate(created);
}

export async function removeBlockedDate(
  organizationId: string,
  coachClerkUserId: string,
  blockedDateId: string,
): Promise<void> {
  const deleted = await db
    .delete(blockedDates)
    .where(
      and(
        eq(blockedDates.id, blockedDateId),
        eq(blockedDates.organizationId, organizationId),
        eq(blockedDates.coachClerkUserId, coachClerkUserId),
      ),
    )
    .returning({ id: blockedDates.id });

  if (deleted.length === 0) {
    throw problem({
      type: "not-found",
      title: "Blocked date not found",
      status: 404,
      detail: "The blocked date does not exist.",
    });
  }
}

function buildBookingFilters(
  organizationId: string,
  coachClerkUserId: string | undefined,
  query: ListBookingsQuery,
): SQL {
  const conditions: SQL[] = [eq(bookings.organizationId, organizationId)];

  if (coachClerkUserId) {
    conditions.push(eq(bookings.coachClerkUserId, coachClerkUserId));
  }

  if (query.status) {
    conditions.push(eq(bookings.status, query.status));
  }

  if (query.from) {
    conditions.push(gte(bookings.startAt, new Date(query.from)));
  }

  if (query.to) {
    const toDate = new Date(query.to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(bookings.startAt, toDate));
  }

  return and(...conditions)!;
}

export async function listBookings(
  organizationId: string,
  coachClerkUserId: string,
  query: ListBookingsQuery,
): Promise<{ items: BookingListItem[]; total: number }> {
  const where = buildBookingFilters(organizationId, coachClerkUserId, query);

  const [rows, totalRow] = await Promise.all([
    db.query.bookings.findMany({
      where,
      with: {
        service: { columns: { name: true } },
        client: { columns: { firstName: true, lastName: true } },
      },
      orderBy: [asc(bookings.startAt)],
      limit: query.limit,
      offset: query.offset,
    }),
    db.select({ total: count() }).from(bookings).where(where),
  ]);

  return {
    items: rows.map(mapBookingListItem),
    total: totalRow[0]?.total ?? 0,
  };
}

export async function listClientBookings(
  organizationId: string,
  clientId: string,
): Promise<BookingListItem[]> {
  const rows = await db.query.bookings.findMany({
    where: and(
      eq(bookings.organizationId, organizationId),
      eq(bookings.clientId, clientId),
      inArray(bookings.status, ["pending", "confirmed"]),
      gte(bookings.startAt, new Date()),
    ),
    with: {
      service: { columns: { name: true } },
      client: { columns: { firstName: true, lastName: true } },
    },
    orderBy: [asc(bookings.startAt)],
  });

  return rows.map(mapBookingListItem);
}

export async function getBookingById(
  organizationId: string,
  bookingId: string,
): Promise<BookingDetail> {
  const row = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.id, bookingId),
      eq(bookings.organizationId, organizationId),
    ),
    with: {
      service: true,
      client: { columns: { firstName: true, lastName: true } },
    },
  });

  if (!row) {
    throw problem({
      type: "not-found",
      title: "Booking not found",
      status: 404,
      detail: "The booking does not exist.",
    });
  }

  const base = mapBookingListItem(row);

  return {
    ...base,
    cancellationReason: row.cancellationReason,
    serviceDurationMinutes: row.service.durationMinutes,
    servicePriceCents: row.service.priceCents,
    serviceCurrency: row.service.currency,
  };
}

async function loadSlotContext(
  organizationId: string,
  coachClerkUserId: string,
  from: string,
  to: string,
) {
  const [rules, blocked, existing] = await Promise.all([
    db.query.availabilityRules.findMany({
      where: and(
        eq(availabilityRules.organizationId, organizationId),
        eq(availabilityRules.coachClerkUserId, coachClerkUserId),
      ),
    }),
    db.query.blockedDates.findMany({
      where: and(
        eq(blockedDates.organizationId, organizationId),
        eq(blockedDates.coachClerkUserId, coachClerkUserId),
        gte(blockedDates.date, from),
        lte(blockedDates.date, to),
      ),
    }),
    db.query.bookings.findMany({
      where: and(
        eq(bookings.organizationId, organizationId),
        eq(bookings.coachClerkUserId, coachClerkUserId),
        ne(bookings.status, "cancelled"),
        gte(bookings.startAt, new Date(`${from}T00:00:00Z`)),
        lte(bookings.startAt, new Date(`${to}T23:59:59Z`)),
      ),
    }),
  ]);

  return {
    rules: rules.map(mapAvailabilityRule),
    blockedDates: blocked.map((b) => b.date),
    existingBookings: existing.map((b) => ({
      startAt: b.startAt,
      endAt: b.endAt,
    })),
  };
}

export async function getAvailableSlots(
  query: ListSlotsQuery,
): Promise<BookingSlotDto[]> {
  const service = await getServiceForBooking(query.serviceId);
  const profile = service.profile;
  const timezone = profile.timezone ?? "Europe/Paris";

  const context = await loadSlotContext(
    service.organizationId,
    profile.clerkUserId,
    query.from,
    query.to,
  );

  return generateAvailableSlots({
    rules: context.rules,
    blockedDates: context.blockedDates,
    existingBookings: context.existingBookings,
    serviceType: service.type,
    serviceDurationMinutes: service.durationMinutes,
    from: query.from,
    to: query.to,
    timezone,
  });
}

export async function createBooking(
  input: CreateBookingInput,
  options?: { clientId?: string; organizationId?: string },
): Promise<BookingDetail> {
  const service = await getServiceForBooking(input.serviceId);
  const profile = service.profile;
  const timezone = profile.timezone ?? "Europe/Paris";
  const startAt = new Date(input.startAt);
  const endAt = new Date(
    startAt.getTime() + service.durationMinutes * 60 * 1000,
  );

  if (!options?.clientId && !input.prospectEmail) {
    throw problem({
      type: "validation-error",
      title: "Contact required",
      status: 400,
      detail: "An email address is required for guest bookings.",
    });
  }

  const context = await loadSlotContext(
    service.organizationId,
    profile.clerkUserId,
    input.startAt.slice(0, 10),
    input.startAt.slice(0, 10),
  );

  const slotValid = isSlotWithinAvailability(
    context.rules,
    context.blockedDates,
    service.type,
    service.durationMinutes,
    startAt,
    timezone,
  );

  if (!slotValid) {
    throw problem({
      type: "validation-error",
      title: "Slot unavailable",
      status: 400,
      detail: "The selected time slot is not available.",
    });
  }

  const slots = generateAvailableSlots({
    rules: context.rules,
    blockedDates: context.blockedDates,
    existingBookings: context.existingBookings,
    serviceType: service.type,
    serviceDurationMinutes: service.durationMinutes,
    from: input.startAt.slice(0, 10),
    to: input.startAt.slice(0, 10),
    timezone,
  });

  const matchingSlot = slots.find((s) => s.startAt === startAt.toISOString());
  if (!matchingSlot) {
    throw problem({
      type: "validation-error",
      title: "Slot unavailable",
      status: 409,
      detail: "This slot has just been booked. Please choose another time.",
    });
  }

  let clientId: string | null = options?.clientId ?? null;

  if (clientId && options?.organizationId) {
    if (options.organizationId !== service.organizationId) {
      throw problem({
        type: "forbidden",
        title: "Organization mismatch",
        status: 403,
        detail: "You cannot book with this organization.",
      });
    }
  }

  try {
    const [created] = await db
      .insert(bookings)
      .values({
        organizationId: service.organizationId,
        coachClerkUserId: profile.clerkUserId,
        serviceId: service.id,
        clientId,
        prospectEmail: input.prospectEmail ?? null,
        prospectName: input.prospectName ?? null,
        startAt,
        endAt,
        timezone,
        status: "confirmed",
        paymentStatus: "unpaid",
        notes: input.notes ?? null,
      })
      .returning();

    return getBookingById(service.organizationId, created!.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("bookings_coach_start_active_unique_idx")) {
      throw problem({
        type: "validation-error",
        title: "Slot already booked",
        status: 409,
        detail: "This slot has just been booked. Please choose another time.",
      });
    }
    throw error;
  }
}

export async function cancelBooking(
  organizationId: string,
  bookingId: string,
  actor: {
    role: "coach" | "client";
    clerkUserId?: string;
    clientId?: string;
  },
  input: CancelBookingInput,
): Promise<BookingDetail> {
  const booking = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.id, bookingId),
      eq(bookings.organizationId, organizationId),
    ),
    with: { service: { with: { profile: true } } },
  });

  if (!booking) {
    throw problem({
      type: "not-found",
      title: "Booking not found",
      status: 404,
      detail: "The booking does not exist.",
    });
  }

  if (booking.status === "cancelled") {
    throw problem({
      type: "validation-error",
      title: "Already cancelled",
      status: 400,
      detail: "This booking is already cancelled.",
    });
  }

  if (actor.role === "client") {
    if (booking.clientId !== actor.clientId) {
      throw problem({
        type: "forbidden",
        title: "Not your booking",
        status: 403,
        detail: "You can only cancel your own bookings.",
      });
    }

    const profile = booking.service.profile;
    const hoursBefore = profile.cancellationHoursBefore ?? 24;
    const msBefore = hoursBefore * 60 * 60 * 1000;
    const cutoff = new Date(booking.startAt.getTime() - msBefore);

    if (new Date() > cutoff) {
      throw problem({
        type: "forbidden",
        title: "Cancellation window closed",
        status: 403,
        detail: `Cancellations must be made at least ${hoursBefore} hours before the appointment.`,
      });
    }
  }

  await db
    .update(bookings)
    .set({
      status: "cancelled",
      cancellationReason: input.reason ?? null,
    })
    .where(eq(bookings.id, bookingId));

  return getBookingById(organizationId, bookingId);
}

export async function patchBookingStatus(
  organizationId: string,
  coachClerkUserId: string,
  bookingId: string,
  input: PatchBookingStatusInput,
): Promise<BookingDetail> {
  const updated = await db
    .update(bookings)
    .set({
      status: input.status,
      ...(input.paymentStatus ? { paymentStatus: input.paymentStatus } : {}),
    })
    .where(
      and(
        eq(bookings.id, bookingId),
        eq(bookings.organizationId, organizationId),
        eq(bookings.coachClerkUserId, coachClerkUserId),
      ),
    )
    .returning({ id: bookings.id });

  if (updated.length === 0) {
    throw problem({
      type: "not-found",
      title: "Booking not found",
      status: 404,
      detail: "The booking does not exist.",
    });
  }

  if (
    input.paymentStatus === "paid" ||
    input.paymentStatus === "external"
  ) {
    await createPaymentFromBooking(organizationId, bookingId);
  }

  return getBookingById(organizationId, bookingId);
}
