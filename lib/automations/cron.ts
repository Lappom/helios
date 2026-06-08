import { and, eq } from "drizzle-orm";
import { addDays, format } from "date-fns";
import { getDb } from "@/lib/db";
import { automations, payments } from "@/lib/db/schema";
import { dispatchAutomationTrigger } from "./dispatcher";

function cronMatchesNow(cron: string, date: Date): boolean {
  const [minute, hour] = cron.trim().split(/\s+/);
  if (!minute || !hour) return false;
  if (minute.startsWith("*/")) {
    const step = Number(minute.slice(2));
    if (!Number.isFinite(step) || step <= 0) return false;
    return date.getMinutes() % step === 0;
  }
  if (minute !== "*" && Number(minute) !== date.getMinutes()) return false;
  if (hour !== "*" && Number(hour) !== date.getHours()) return false;
  return true;
}

export async function processAutomationSchedules(
  now = new Date(),
): Promise<{ triggered: number }> {
  const rows = await getDb().query.automations.findMany({
    where: and(
      eq(automations.isActive, true),
      eq(automations.triggerType, "schedule_cron"),
    ),
    columns: {
      id: true,
      organizationId: true,
      triggerConfig: true,
    },
  });

  let triggered = 0;
  const dateKey = format(now, "yyyy-MM-dd-HH-mm");

  for (const row of rows) {
    const config = (row.triggerConfig ?? {}) as { cron?: string };
    if (!config.cron || !cronMatchesNow(config.cron, now)) continue;

    const result = await dispatchAutomationTrigger("schedule_cron", {
      organizationId: row.organizationId,
      triggerEventId: `cron:${dateKey}:${row.id}`,
      metadata: { cronKey: `cron:${dateKey}:${row.id}`, automationId: row.id },
    });
    triggered += result.started;
  }

  return { triggered };
}

export async function processSubscriptionRenewals(
  now = new Date(),
): Promise<{ triggered: number }> {
  const renewalWindowStart = addDays(now, 7);
  const dayKey = format(now, "yyyy-MM-dd");

  const subscriptionPayments = await getDb().query.payments.findMany({
    where: eq(payments.type, "subscription"),
    columns: {
      id: true,
      organizationId: true,
      clientId: true,
      paidAt: true,
    },
  });

  let triggered = 0;

  for (const payment of subscriptionPayments) {
    if (!payment.clientId) continue;
    const renewalDue = addDays(payment.paidAt, 30);
    if (renewalDue > renewalWindowStart || renewalDue < now) continue;

    const result = await dispatchAutomationTrigger("subscription_renewal_due", {
      organizationId: payment.organizationId,
      clientId: payment.clientId,
      triggerEventId: `renewal:${payment.clientId}:${dayKey}`,
      metadata: {
        renewalKey: `renewal:${payment.clientId}:${dayKey}`,
        paymentId: payment.id,
      },
    });
    triggered += result.started;
  }

  return { triggered };
}
