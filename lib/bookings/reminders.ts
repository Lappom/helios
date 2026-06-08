import { and, eq, gte, inArray } from "drizzle-orm";
import { TZDate } from "@date-fns/tz";
import { addHours, addMinutes, endOfDay, startOfDay } from "date-fns";
import { getDb } from "@/lib/db";
import { bookings, clients } from "@/lib/db/schema";
import { getOrganizationPlanTier } from "@/lib/notifications/cron";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { getActiveEventTemplate } from "@/lib/notifications/service";

export type BookingReminderPayload = {
  eventType: "booking_reminder";
  variant: "d1" | "h1";
  organizationId: string;
  bookingId: string;
  coachClerkUserId: string;
  clientId: string | null;
  prospectEmail: string | null;
  serviceId: string;
  startAt: string;
};

export async function enqueueNotification(
  payload: BookingReminderPayload,
): Promise<void> {
  const template = await getActiveEventTemplate(
    payload.organizationId,
    "booking_reminder",
    "email",
  );

  if (!template) {
    return;
  }

  const recipients: { clientId?: string; email?: string }[] = [];

  if (payload.clientId) {
    const client = await getDb().query.clients.findFirst({
      where: and(
        eq(clients.organizationId, payload.organizationId),
        eq(clients.id, payload.clientId),
      ),
      columns: { id: true, email: true },
    });
    if (client) {
      recipients.push({ clientId: client.id, email: client.email });
    }
  } else if (payload.prospectEmail) {
    recipients.push({ email: payload.prospectEmail });
  }

  if (recipients.length === 0) {
    return;
  }

  const planTier = await getOrganizationPlanTier(payload.organizationId);
  const startAt = new Date(payload.startAt);

  await dispatchNotification({
    organizationId: payload.organizationId,
    planTier,
    channel: template.channel,
    subject: template.subject ?? undefined,
    content: template.content,
    templateId: template.id,
    eventType: "booking_reminder",
    recipients,
    metadata: {
      bookingTime: startAt.toLocaleString("fr-FR", {
        timeZone: "Europe/Paris",
      }),
      url: "/client/bookings",
      variant: payload.variant,
      bookingId: payload.bookingId,
    },
    idempotencyKey: `booking_reminder:${payload.variant}:${payload.bookingId}`,
  });
}

export async function processBookingReminders(now: Date = new Date()): Promise<{
  d1Processed: number;
  h1Processed: number;
  skipped: number;
}> {
  const timezone = "Europe/Paris";
  const nowTz = new TZDate(now, timezone);

  const tomorrow = addHours(nowTz, 24);
  const tomorrowStart = startOfDay(tomorrow);
  const tomorrowEnd = endOfDay(tomorrow);

  const h1WindowStart = addMinutes(nowTz, 55);
  const h1WindowEnd = addMinutes(nowTz, 65);

  const activeBookings = await getDb().query.bookings.findMany({
    where: and(
      inArray(bookings.status, ["pending", "confirmed"]),
      gte(bookings.startAt, now),
    ),
    columns: {
      id: true,
      organizationId: true,
      coachClerkUserId: true,
      clientId: true,
      prospectEmail: true,
      serviceId: true,
      startAt: true,
      remindersSent: true,
    },
  });

  let d1Processed = 0;
  let h1Processed = 0;
  let skipped = 0;

  for (const booking of activeBookings) {
    const startTz = new TZDate(booking.startAt, timezone);
    const reminders = booking.remindersSent ?? { d1: false, h1: false };

    if (
      !reminders.d1 &&
      startTz >= tomorrowStart &&
      startTz <= tomorrowEnd
    ) {
      await enqueueNotification({
        eventType: "booking_reminder",
        variant: "d1",
        organizationId: booking.organizationId,
        bookingId: booking.id,
        coachClerkUserId: booking.coachClerkUserId,
        clientId: booking.clientId,
        prospectEmail: booking.prospectEmail,
        serviceId: booking.serviceId,
        startAt: booking.startAt.toISOString(),
      });

      await getDb()
        .update(bookings)
        .set({
          remindersSent: { ...reminders, d1: true },
        })
        .where(eq(bookings.id, booking.id));

      d1Processed += 1;
      continue;
    }

    if (
      !reminders.h1 &&
      startTz >= h1WindowStart &&
      startTz <= h1WindowEnd
    ) {
      await enqueueNotification({
        eventType: "booking_reminder",
        variant: "h1",
        organizationId: booking.organizationId,
        bookingId: booking.id,
        coachClerkUserId: booking.coachClerkUserId,
        clientId: booking.clientId,
        prospectEmail: booking.prospectEmail,
        serviceId: booking.serviceId,
        startAt: booking.startAt.toISOString(),
      });

      await getDb()
        .update(bookings)
        .set({
          remindersSent: { ...reminders, h1: true },
        })
        .where(eq(bookings.id, booking.id));

      h1Processed += 1;
      continue;
    }

    skipped += 1;
  }

  return { d1Processed, h1Processed, skipped };
}
