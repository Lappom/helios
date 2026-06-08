import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  lte,
  type SQL,
} from "drizzle-orm";
import { problem } from "@/lib/api/response";
import { checkQuota } from "@/lib/billing/access";
import type { PlanTier } from "@/lib/auth/types";
import { getDb } from "@/lib/db";
import {
  clients,
  notificationLogs,
  notificationTemplates,
  pushSubscriptions,
  teamMembers,
} from "@/lib/db/schema";
import { dispatchNotification } from "./dispatch";
import { SYSTEM_NOTIFICATION_TEMPLATES } from "./defaults";
import type {
  NotificationAnalytics,
  NotificationTemplateItem,
} from "./types";
import type {
  AnalyticsQueryInput,
  CreateNotificationTemplateInput,
  NotificationChannel,
  NotificationEventType,
  NotificationTrigger,
  PushSubscriptionInput,
  SendNotificationInput,
  UpdateNotificationTemplateInput,
} from "@/lib/validators/notifications";

export type ListNotificationTemplatesOptions = {
  page: number;
  limit: number;
  offset: number;
  search?: string;
  trigger?: string;
  channel?: string;
  isActive?: boolean;
};

function mapTemplate(
  row: typeof notificationTemplates.$inferSelect,
): NotificationTemplateItem {
  return {
    id: row.id,
    name: row.name,
    channel: row.channel,
    subject: row.subject,
    content: row.content,
    trigger: row.trigger,
    schedule: row.schedule,
    eventType: row.eventType,
    isActive: row.isActive,
    isSystem: row.isSystem,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function seedSystemNotificationTemplatesIfMissing(
  organizationId: string,
  coachClerkUserId: string,
): Promise<void> {
  const existing = await getDb().query.notificationTemplates.findFirst({
    where: and(
      eq(notificationTemplates.organizationId, organizationId),
      eq(notificationTemplates.isSystem, true),
    ),
    columns: { id: true },
  });

  if (existing) {
    return;
  }

  await getDb().insert(notificationTemplates).values(
    SYSTEM_NOTIFICATION_TEMPLATES.map((template) => ({
      organizationId,
      name: template.name,
      channel: template.channel,
      subject: template.subject,
      content: template.content,
      trigger: template.trigger,
      schedule: template.schedule,
      eventType: template.eventType,
      isActive: template.isActive,
      isSystem: true,
      createdByClerkUserId: coachClerkUserId,
    })),
  );
}

async function getTemplateOrThrow(
  organizationId: string,
  templateId: string,
) {
  const template = await getDb().query.notificationTemplates.findFirst({
    where: and(
      eq(notificationTemplates.organizationId, organizationId),
      eq(notificationTemplates.id, templateId),
    ),
  });

  if (!template) {
    throw problem({
      type: "not-found",
      title: "Template not found",
      status: 404,
      detail: `No notification template found for id "${templateId}".`,
    });
  }

  return template;
}

export async function listNotificationTemplates(
  organizationId: string,
  options: ListNotificationTemplatesOptions,
): Promise<{ items: NotificationTemplateItem[]; total: number }> {
  const filters: SQL[] = [
    eq(notificationTemplates.organizationId, organizationId),
  ];

  if (options.search) {
    filters.push(ilike(notificationTemplates.name, `%${options.search}%`));
  }
  if (options.trigger) {
    filters.push(
      eq(notificationTemplates.trigger, options.trigger as NotificationTrigger),
    );
  }
  if (options.channel) {
    filters.push(
      eq(notificationTemplates.channel, options.channel as NotificationChannel),
    );
  }
  if (options.isActive !== undefined) {
    filters.push(eq(notificationTemplates.isActive, options.isActive));
  }

  const whereClause = and(...filters);

  const [rows, totalRow] = await Promise.all([
    getDb().query.notificationTemplates.findMany({
      where: whereClause,
      orderBy: [desc(notificationTemplates.updatedAt)],
      limit: options.limit,
      offset: options.offset,
    }),
    getDb()
      .select({ total: count() })
      .from(notificationTemplates)
      .where(whereClause),
  ]);

  return {
    items: rows.map(mapTemplate),
    total: Number(totalRow[0]?.total ?? 0),
  };
}

export async function getNotificationTemplate(
  organizationId: string,
  templateId: string,
): Promise<NotificationTemplateItem> {
  const template = await getTemplateOrThrow(organizationId, templateId);
  return mapTemplate(template);
}

export async function createNotificationTemplate(
  organizationId: string,
  coachClerkUserId: string,
  input: CreateNotificationTemplateInput,
): Promise<NotificationTemplateItem> {
  const [created] = await getDb()
    .insert(notificationTemplates)
    .values({
      organizationId,
      name: input.name,
      channel: input.channel,
      subject: input.subject,
      content: input.content,
      trigger: input.trigger,
      schedule: input.schedule,
      eventType: input.eventType,
      isActive: input.isActive,
      createdByClerkUserId: coachClerkUserId,
    })
    .returning();

  return mapTemplate(created);
}

export async function updateNotificationTemplate(
  organizationId: string,
  templateId: string,
  input: UpdateNotificationTemplateInput,
): Promise<NotificationTemplateItem> {
  const existing = await getTemplateOrThrow(organizationId, templateId);

  if (existing.isSystem && input.trigger !== undefined) {
    throw problem({
      type: "forbidden",
      title: "System template locked",
      status: 403,
      detail: "System templates cannot change trigger configuration.",
    });
  }

  const [updated] = await getDb()
    .update(notificationTemplates)
    .set({
      name: input.name,
      channel: input.channel,
      subject: input.subject,
      content: input.content,
      trigger: input.trigger,
      schedule: input.schedule,
      eventType: input.eventType,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(notificationTemplates.organizationId, organizationId),
        eq(notificationTemplates.id, templateId),
      ),
    )
    .returning();

  return mapTemplate(updated);
}

export async function deleteNotificationTemplate(
  organizationId: string,
  templateId: string,
): Promise<void> {
  const existing = await getTemplateOrThrow(organizationId, templateId);

  if (existing.isSystem) {
    throw problem({
      type: "forbidden",
      title: "System template locked",
      status: 403,
      detail: "System templates cannot be deleted.",
    });
  }

  await getDb()
    .delete(notificationTemplates)
    .where(
      and(
        eq(notificationTemplates.organizationId, organizationId),
        eq(notificationTemplates.id, templateId),
      ),
    );
}

export async function sendManualNotification(
  organizationId: string,
  planTier: PlanTier,
  input: SendNotificationInput,
): Promise<{ sent: number; failed: number; logIds: string[] }> {
  let channel = input.channel;
  let subject = input.subject;
  let content = input.content;
  let templateId: string | undefined;

  if (input.templateId) {
    const template = await getTemplateOrThrow(organizationId, input.templateId);
    channel = template.channel;
    subject = template.subject ?? subject;
    content = template.content;
    templateId = template.id;
  }

  const clientRows = await getDb().query.clients.findMany({
    where: and(
      eq(clients.organizationId, organizationId),
      inArray(clients.id, input.clientIds),
    ),
    columns: {
      id: true,
      email: true,
    },
  });

  if (clientRows.length === 0) {
    throw problem({
      type: "not-found",
      title: "No recipients found",
      status: 404,
      detail: "None of the provided client ids belong to this organization.",
    });
  }

  return dispatchNotification({
    organizationId,
    planTier,
    channel,
    subject: subject ?? undefined,
    content,
    templateId,
    recipients: clientRows.map((client) => ({
      clientId: client.id,
      email: client.email,
    })),
  });
}

export async function getNotificationAnalytics(
  organizationId: string,
  query: AnalyticsQueryInput,
): Promise<NotificationAnalytics> {
  const filters: SQL[] = [
    eq(notificationLogs.organizationId, organizationId),
    inArray(notificationLogs.status, ["sent", "opened", "clicked"]),
  ];

  if (query.from) {
    filters.push(
      gte(notificationLogs.sentAt, new Date(`${query.from}T00:00:00.000Z`)),
    );
  }
  if (query.to) {
    filters.push(
      lte(notificationLogs.sentAt, new Date(`${query.to}T23:59:59.999Z`)),
    );
  }
  if (query.channel) {
    filters.push(
      eq(notificationLogs.channel, query.channel as NotificationChannel),
    );
  }
  if (query.eventType) {
    filters.push(
      eq(notificationLogs.eventType, query.eventType as NotificationEventType),
    );
  }

  const whereClause = and(...filters);

  const rows = await getDb().query.notificationLogs.findMany({
    where: whereClause,
    columns: {
      channel: true,
      eventType: true,
      status: true,
      openedAt: true,
      clickedAt: true,
    },
  });

  let sent = 0;
  let opened = 0;
  let clicked = 0;
  let failed = 0;

  const byChannel = new Map<
    string,
    { sent: number; opened: number; clicked: number }
  >();
  const byEventType = new Map<
    string,
    { sent: number; opened: number; clicked: number }
  >();

  for (const row of rows) {
    if (row.status === "failed") {
      failed += 1;
      continue;
    }

    sent += 1;
    if (row.openedAt || row.status === "opened" || row.status === "clicked") {
      opened += 1;
    }
    if (row.clickedAt || row.status === "clicked") {
      clicked += 1;
    }

    const channelKey = row.channel;
    const channelStats = byChannel.get(channelKey) ?? {
      sent: 0,
      opened: 0,
      clicked: 0,
    };
    channelStats.sent += 1;
    if (row.openedAt || row.status === "opened" || row.status === "clicked") {
      channelStats.opened += 1;
    }
    if (row.clickedAt || row.status === "clicked") {
      channelStats.clicked += 1;
    }
    byChannel.set(channelKey, channelStats);

    const eventKey = row.eventType ?? "manual";
    const eventStats = byEventType.get(eventKey) ?? {
      sent: 0,
      opened: 0,
      clicked: 0,
    };
    eventStats.sent += 1;
    if (row.openedAt || row.status === "opened" || row.status === "clicked") {
      eventStats.opened += 1;
    }
    if (row.clickedAt || row.status === "clicked") {
      eventStats.clicked += 1;
    }
    byEventType.set(eventKey, eventStats);
  }

  return {
    sent,
    opened,
    clicked,
    failed,
    openRate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
    clickRate: sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0,
    byChannel: [...byChannel.entries()].map(([channel, stats]) => ({
      channel: channel as NotificationAnalytics["byChannel"][number]["channel"],
      ...stats,
    })),
    byEventType: [...byEventType.entries()].map(([eventType, stats]) => ({
      eventType:
        eventType === "manual"
          ? null
          : (eventType as NotificationAnalytics["byEventType"][number]["eventType"]),
      ...stats,
    })),
  };
}

export async function getNotificationQuota() {
  return checkQuota("notifications");
}

export async function registerPushSubscription(
  organizationId: string,
  clientId: string,
  input: PushSubscriptionInput,
  userAgent?: string,
): Promise<void> {
  const client = await getDb().query.clients.findFirst({
    where: and(
      eq(clients.organizationId, organizationId),
      eq(clients.id, clientId),
    ),
    columns: { id: true },
  });

  if (!client) {
    throw problem({
      type: "not-found",
      title: "Client not found",
      status: 404,
      detail: "Client does not belong to this organization.",
    });
  }

  await getDb()
    .insert(pushSubscriptions)
    .values({
      organizationId,
      clientId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        organizationId,
        clientId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent,
      },
    });
}

export async function removePushSubscription(
  organizationId: string,
  clientId: string,
  endpoint: string,
): Promise<void> {
  await getDb()
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.organizationId, organizationId),
        eq(pushSubscriptions.clientId, clientId),
        eq(pushSubscriptions.endpoint, endpoint),
      ),
    );
}

async function ensureSystemTemplatesForOrganization(
  organizationId: string,
): Promise<void> {
  const existing = await getDb().query.notificationTemplates.findFirst({
    where: and(
      eq(notificationTemplates.organizationId, organizationId),
      eq(notificationTemplates.isSystem, true),
    ),
    columns: { id: true },
  });

  if (existing) {
    return;
  }

  const member = await getDb().query.teamMembers.findFirst({
    where: eq(teamMembers.organizationId, organizationId),
    columns: { clerkUserId: true },
    orderBy: [asc(teamMembers.createdAt)],
  });

  await seedSystemNotificationTemplatesIfMissing(
    organizationId,
    member?.clerkUserId ?? "system",
  );
}

export async function getActiveEventTemplate(
  organizationId: string,
  eventType: NotificationEventType,
  preferredChannel?: NotificationChannel,
) {
  await ensureSystemTemplatesForOrganization(organizationId);

  const templates = await getDb().query.notificationTemplates.findMany({
    where: and(
      eq(notificationTemplates.organizationId, organizationId),
      eq(notificationTemplates.trigger, "event"),
      eq(notificationTemplates.eventType, eventType),
      eq(notificationTemplates.isActive, true),
    ),
  });

  if (templates.length === 0) {
    return null;
  }

  if (preferredChannel) {
    return (
      templates.find((template) => template.channel === preferredChannel) ??
      templates[0]
    );
  }

  return templates[0];
}

export async function handleResendWebhookEvent(payload: {
  type: string;
  data: {
    email_id?: string;
    created_at?: string;
  };
}): Promise<void> {
  const emailId = payload.data.email_id;
  if (!emailId) {
    return;
  }

  const log = await getDb().query.notificationLogs.findFirst({
    where: and(
      eq(notificationLogs.externalId, emailId),
      isNotNull(notificationLogs.externalId),
    ),
  });

  if (!log) {
    return;
  }

  const timestamp = payload.data.created_at
    ? new Date(payload.data.created_at)
    : new Date();

  if (payload.type === "email.opened") {
    await getDb()
      .update(notificationLogs)
      .set({
        status: "opened",
        openedAt: timestamp,
      })
      .where(eq(notificationLogs.id, log.id));
    return;
  }

  if (payload.type === "email.clicked") {
    await getDb()
      .update(notificationLogs)
      .set({
        status: "clicked",
        openedAt: log.openedAt ?? timestamp,
        clickedAt: timestamp,
      })
      .where(eq(notificationLogs.id, log.id));
  }
}
