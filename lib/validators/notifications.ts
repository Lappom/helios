import { z } from "zod";

export const NOTIFICATION_CHANNELS = ["email", "in_app", "push"] as const;
export const NOTIFICATION_TRIGGERS = ["manual", "scheduled", "event"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export type NotificationTrigger = (typeof NOTIFICATION_TRIGGERS)[number];
export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export const NOTIFICATION_EVENT_TYPES = [
  "session_due",
  "assessment_due",
  "habit_reminder",
  "booking_reminder",
  "payment_received",
  "message_new",
  "program_published",
  "drive_file_shared",
  "questionnaire_due",
  "questionnaire_reminder",
] as const;

const cronExpressionSchema = z
  .string()
  .trim()
  .regex(
    /^(\S+\s+){4}\S+$/,
    "Schedule must be a valid 5-field cron expression.",
  );

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD.");

export const createNotificationTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    channel: z.enum(NOTIFICATION_CHANNELS),
    subject: z.string().trim().max(200).optional(),
    content: z.string().trim().min(1).max(5000),
    trigger: z.enum(NOTIFICATION_TRIGGERS).optional().default("manual"),
    schedule: cronExpressionSchema.optional(),
    eventType: z.enum(NOTIFICATION_EVENT_TYPES).optional(),
    isActive: z.boolean().optional().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.channel === "email" && !value.subject?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Subject is required for email templates.",
        path: ["subject"],
      });
    }
    if (value.trigger === "scheduled" && !value.schedule) {
      ctx.addIssue({
        code: "custom",
        message: "Schedule is required for scheduled templates.",
        path: ["schedule"],
      });
    }
    if (value.trigger === "event" && !value.eventType) {
      ctx.addIssue({
        code: "custom",
        message: "Event type is required for event templates.",
        path: ["eventType"],
      });
    }
  });

export const updateNotificationTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    channel: z.enum(NOTIFICATION_CHANNELS).optional(),
    subject: z.string().trim().max(200).nullable().optional(),
    content: z.string().trim().min(1).max(5000).optional(),
    trigger: z.enum(NOTIFICATION_TRIGGERS).optional(),
    schedule: cronExpressionSchema.nullable().optional(),
    eventType: z.enum(NOTIFICATION_EVENT_TYPES).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const sendNotificationSchema = z.object({
  templateId: z.string().min(1).optional(),
  channel: z.enum(NOTIFICATION_CHANNELS),
  subject: z.string().trim().max(200).optional(),
  content: z.string().trim().min(1).max(5000),
  clientIds: z.array(z.string().min(1)).min(1).max(500),
  scheduledAt: z.string().datetime().optional(),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const analyticsQuerySchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
  eventType: z.enum(NOTIFICATION_EVENT_TYPES).optional(),
});

export type CreateNotificationTemplateInput = z.infer<
  typeof createNotificationTemplateSchema
>;
export type UpdateNotificationTemplateInput = z.infer<
  typeof updateNotificationTemplateSchema
>;
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;

export function parseAnalyticsQuery(
  searchParams: URLSearchParams,
): AnalyticsQueryInput {
  return analyticsQuerySchema.parse({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    channel: searchParams.get("channel") ?? undefined,
    eventType: searchParams.get("eventType") ?? undefined,
  });
}

export function parseListNotificationTemplatesQuery(
  searchParams: URLSearchParams,
) {
  return {
    search: searchParams.get("search")?.trim() || undefined,
    trigger: searchParams.get("trigger") ?? undefined,
    channel: searchParams.get("channel") ?? undefined,
    isActive:
      searchParams.get("isActive") === "true"
        ? true
        : searchParams.get("isActive") === "false"
          ? false
          : undefined,
  };
}
