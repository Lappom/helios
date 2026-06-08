import { z } from "zod";
import type { PaginationParams } from "@/lib/api/pagination";
import { createClientSchema } from "@/lib/validators/clients";

export const WEBHOOK_EVENTS = [
  "client.created",
  "payment.received",
  "session.completed",
  "assessment.submitted",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const webhookEventSchema = z.enum(WEBHOOK_EVENTS);

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const createWebhookSchema = z.object({
  url: z.string().trim().url().max(2048),
  description: z.string().trim().max(500).optional(),
  events: z.array(webhookEventSchema).min(1).max(WEBHOOK_EVENTS.length),
  isActive: z.boolean().optional().default(true),
});

export const updateWebhookSchema = z
  .object({
    url: z.string().trim().url().max(2048).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    events: z
      .array(webhookEventSchema)
      .min(1)
      .max(WEBHOOK_EVENTS.length)
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const createClientViaIntegrationSchema = createClientSchema;

export const assignProgramViaIntegrationSchema = z.object({
  clientId: z.string().min(1),
  startDate: z.coerce.date().optional(),
});

export const SESSION_LOG_STATUSES = [
  "in_progress",
  "completed",
  "abandoned",
] as const;

export const sessionLogStatusSchema = z.enum(SESSION_LOG_STATUSES);

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export type CreateClientViaIntegrationInput = z.infer<
  typeof createClientViaIntegrationSchema
>;
export type AssignProgramViaIntegrationInput = z.infer<
  typeof assignProgramViaIntegrationSchema
>;

export type ListSessionLogsQuery = PaginationParams & {
  clientId?: string;
  status?: (typeof SESSION_LOG_STATUSES)[number];
  from?: Date;
  to?: Date;
};

export function parseListSessionLogsQuery(
  searchParams: URLSearchParams,
  pagination: PaginationParams,
): ListSessionLogsQuery {
  const statusParam = searchParams.get("status");
  const statusResult = statusParam
    ? sessionLogStatusSchema.safeParse(statusParam)
    : null;

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  return {
    ...pagination,
    clientId: searchParams.get("clientId") ?? undefined,
    status: statusResult?.success ? statusResult.data : undefined,
    from: fromParam ? new Date(fromParam) : undefined,
    to: toParam ? new Date(toParam) : undefined,
  };
}

export function parseListWebhookDeliveriesQuery(
  searchParams: URLSearchParams,
  pagination: PaginationParams,
) {
  return {
    ...pagination,
    status: searchParams.get("status") ?? undefined,
  };
}
