import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { problem } from "@/lib/api/response";
import { getDb } from "@/lib/db";
import { webhookDeliveries, webhookEndpoints } from "@/lib/db/schema";
import type {
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookEvent,
} from "@/lib/validators/integrations";

export type WebhookEndpointItem = {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type WebhookDeliveryItem = {
  id: string;
  event: string;
  status: string;
  httpStatus: number | null;
  attemptCount: number;
  deliveredAt: Date | null;
  createdAt: Date;
};

function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

function mapEndpoint(row: typeof webhookEndpoints.$inferSelect): WebhookEndpointItem {
  return {
    id: row.id,
    url: row.url,
    description: row.description,
    events: row.events,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function signWebhookPayload(
  secret: string,
  payload: string,
  timestamp: number,
): string {
  const signedContent = `${timestamp}.${payload}`;
  const signature = createHmac("sha256", secret)
    .update(signedContent)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

export function verifyWebhookSignature(
  secret: string,
  payload: string,
  signatureHeader: string,
  toleranceSeconds = 300,
): boolean {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );

  const timestamp = Number(parts.t);
  const signature = parts.v1;

  if (!timestamp || !signature) {
    return false;
  }

  const age = Math.abs(Date.now() / 1000 - timestamp);
  if (age > toleranceSeconds) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

export async function listWebhooks(
  organizationId: string,
): Promise<WebhookEndpointItem[]> {
  const rows = await getDb().query.webhookEndpoints.findMany({
    where: eq(webhookEndpoints.organizationId, organizationId),
    orderBy: [desc(webhookEndpoints.createdAt)],
  });

  return rows.map(mapEndpoint);
}

export async function getWebhook(
  organizationId: string,
  webhookId: string,
): Promise<WebhookEndpointItem & { secret: string }> {
  const row = await getDb().query.webhookEndpoints.findFirst({
    where: and(
      eq(webhookEndpoints.id, webhookId),
      eq(webhookEndpoints.organizationId, organizationId),
    ),
  });

  if (!row) {
    throw problem({
      type: "not-found",
      title: "Webhook not found",
      status: 404,
      detail: "Webhook endpoint was not found.",
    });
  }

  return {
    ...mapEndpoint(row),
    secret: row.secret,
  };
}

export async function createWebhook(
  organizationId: string,
  input: CreateWebhookInput,
): Promise<WebhookEndpointItem & { secret: string }> {
  const secret = generateWebhookSecret();

  const [row] = await getDb()
    .insert(webhookEndpoints)
    .values({
      organizationId,
      url: input.url,
      description: input.description ?? null,
      events: input.events,
      isActive: input.isActive,
      secret,
    })
    .returning();

  if (!row) {
    throw problem({
      type: "internal-error",
      title: "Failed to create webhook",
      status: 500,
      detail: "Could not persist webhook endpoint.",
    });
  }

  return {
    ...mapEndpoint(row),
    secret: row.secret,
  };
}

export async function updateWebhook(
  organizationId: string,
  webhookId: string,
  input: UpdateWebhookInput,
): Promise<WebhookEndpointItem> {
  const existing = await getDb().query.webhookEndpoints.findFirst({
    where: and(
      eq(webhookEndpoints.id, webhookId),
      eq(webhookEndpoints.organizationId, organizationId),
    ),
  });

  if (!existing) {
    throw problem({
      type: "not-found",
      title: "Webhook not found",
      status: 404,
      detail: "Webhook endpoint was not found.",
    });
  }

  const [row] = await getDb()
    .update(webhookEndpoints)
    .set({
      url: input.url ?? existing.url,
      description:
        input.description !== undefined
          ? input.description
          : existing.description,
      events: input.events ?? existing.events,
      isActive: input.isActive ?? existing.isActive,
      updatedAt: new Date(),
    })
    .where(eq(webhookEndpoints.id, webhookId))
    .returning();

  if (!row) {
    throw problem({
      type: "internal-error",
      title: "Failed to update webhook",
      status: 500,
      detail: "Could not update webhook endpoint.",
    });
  }

  return mapEndpoint(row);
}

export async function deleteWebhook(
  organizationId: string,
  webhookId: string,
): Promise<void> {
  const existing = await getDb().query.webhookEndpoints.findFirst({
    where: and(
      eq(webhookEndpoints.id, webhookId),
      eq(webhookEndpoints.organizationId, organizationId),
    ),
    columns: { id: true },
  });

  if (!existing) {
    throw problem({
      type: "not-found",
      title: "Webhook not found",
      status: 404,
      detail: "Webhook endpoint was not found.",
    });
  }

  await getDb()
    .delete(webhookEndpoints)
    .where(eq(webhookEndpoints.id, webhookId));
}

export async function listWebhookDeliveries(
  organizationId: string,
  webhookId: string,
  options: { page: number; limit: number; offset: number },
): Promise<{ items: WebhookDeliveryItem[]; total: number }> {
  const endpoint = await getDb().query.webhookEndpoints.findFirst({
    where: and(
      eq(webhookEndpoints.id, webhookId),
      eq(webhookEndpoints.organizationId, organizationId),
    ),
    columns: { id: true },
  });

  if (!endpoint) {
    throw problem({
      type: "not-found",
      title: "Webhook not found",
      status: 404,
      detail: "Webhook endpoint was not found.",
    });
  }

  const where = eq(webhookDeliveries.webhookEndpointId, webhookId);

  const rows = await getDb().query.webhookDeliveries.findMany({
    where,
    orderBy: [desc(webhookDeliveries.createdAt)],
    limit: options.limit,
    offset: options.offset,
  });

  const allRows = await getDb().query.webhookDeliveries.findMany({
    where,
    columns: { id: true },
  });

  return {
    items: rows.map((row) => ({
      id: row.id,
      event: row.event,
      status: row.status,
      httpStatus: row.httpStatus,
      attemptCount: row.attemptCount,
      deliveredAt: row.deliveredAt,
      createdAt: row.createdAt,
    })),
    total: allRows.length,
  };
}

export async function listActiveWebhooksForEvent(
  organizationId: string,
  event: WebhookEvent,
): Promise<Array<{ id: string; url: string; secret: string }>> {
  const rows = await getDb().query.webhookEndpoints.findMany({
    where: and(
      eq(webhookEndpoints.organizationId, organizationId),
      eq(webhookEndpoints.isActive, true),
    ),
  });

  return rows
    .filter((row) => row.events.includes(event))
    .map((row) => ({
      id: row.id,
      url: row.url,
      secret: row.secret,
    }));
}

export async function createWebhookDelivery(
  organizationId: string,
  webhookEndpointId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<string> {
  const [row] = await getDb()
    .insert(webhookDeliveries)
    .values({
      organizationId,
      webhookEndpointId,
      event,
      payload,
      status: "pending",
    })
    .returning({ id: webhookDeliveries.id });

  if (!row) {
    throw new Error("Failed to create webhook delivery.");
  }

  return row.id;
}

export async function getWebhookDeliveryById(deliveryId: string) {
  return getDb().query.webhookDeliveries.findFirst({
    where: eq(webhookDeliveries.id, deliveryId),
  });
}
