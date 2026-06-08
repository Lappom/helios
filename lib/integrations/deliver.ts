import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhookDeliveries, webhookEndpoints } from "@/lib/db/schema";
import { logger } from "@/lib/api/logger";
import { signWebhookPayload } from "./webhooks";

const RETRY_DELAYS_MS = [60_000, 300_000, 1_800_000];

export async function deliverWebhook(deliveryId: string): Promise<void> {
  const delivery = await db.query.webhookDeliveries.findFirst({
    where: eq(webhookDeliveries.id, deliveryId),
  });

  if (!delivery) {
    return;
  }

  const endpoint = await db.query.webhookEndpoints.findFirst({
    where: eq(webhookEndpoints.id, delivery.webhookEndpointId),
  });

  if (!endpoint || !endpoint.isActive) {
    await db
      .update(webhookDeliveries)
      .set({
        status: "failed",
        attemptCount: delivery.attemptCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(webhookDeliveries.id, deliveryId));
    return;
  }

  const payloadString = JSON.stringify({
    id: delivery.id,
    event: delivery.event,
    createdAt: delivery.createdAt.toISOString(),
    data: delivery.payload,
  });

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signWebhookPayload(
    endpoint.secret,
    payloadString,
    timestamp,
  );

  let httpStatus: number | null = null;
  let responseBody: string | null = null;
  let success = false;

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Helios-Webhooks/1.0",
        "Helios-Signature": signature,
        "Helios-Event": delivery.event,
      },
      body: payloadString,
      signal: AbortSignal.timeout(15_000),
    });

    httpStatus = response.status;
    responseBody = (await response.text()).slice(0, 2000);
    success = response.ok;
  } catch (error) {
    logger.captureException(error, {
      deliveryId,
      webhookEndpointId: endpoint.id,
    });
  }

  const attemptCount = delivery.attemptCount + 1;

  if (success) {
    await db
      .update(webhookDeliveries)
      .set({
        status: "success",
        httpStatus,
        responseBody,
        attemptCount,
        deliveredAt: new Date(),
        nextRetryAt: null,
        updatedAt: new Date(),
      })
      .where(eq(webhookDeliveries.id, deliveryId));
    return;
  }

  const retryDelay = RETRY_DELAYS_MS[attemptCount - 1];

  if (retryDelay !== undefined) {
    const nextRetryAt = new Date(Date.now() + retryDelay);
    await db
      .update(webhookDeliveries)
      .set({
        status: "pending",
        httpStatus,
        responseBody,
        attemptCount,
        nextRetryAt,
        updatedAt: new Date(),
      })
      .where(eq(webhookDeliveries.id, deliveryId));
    return;
  }

  await db
    .update(webhookDeliveries)
    .set({
      status: "failed",
      httpStatus,
      responseBody,
      attemptCount,
      nextRetryAt: null,
      updatedAt: new Date(),
    })
    .where(eq(webhookDeliveries.id, deliveryId));
}

export async function processPendingWebhookRetries(): Promise<number> {
  const now = new Date();
  const pending = await db.query.webhookDeliveries.findMany({
    where: eq(webhookDeliveries.status, "pending"),
    limit: 50,
  });

  let processed = 0;

  for (const delivery of pending) {
    if (delivery.nextRetryAt && delivery.nextRetryAt > now) {
      continue;
    }
    await deliverWebhook(delivery.id);
    processed += 1;
  }

  return processed;
}
