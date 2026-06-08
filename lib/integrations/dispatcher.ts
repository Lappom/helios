import "server-only";

import type { HeliosEventName, HeliosEventPayload } from "@/lib/events/types";
import type { WebhookEvent } from "@/lib/validators/integrations";
import { deliverWebhook } from "./deliver";
import {
  createWebhookDelivery,
  listActiveWebhooksForEvent,
} from "./webhooks";

const WEBHOOK_EVENTS = new Set<WebhookEvent>([
  "client.created",
  "payment.received",
  "session.completed",
  "assessment.submitted",
]);

function isWebhookEvent(name: HeliosEventName): name is WebhookEvent {
  return WEBHOOK_EVENTS.has(name as WebhookEvent);
}

export async function handleWebhookEvent<T extends HeliosEventName>(
  name: T,
  payload: HeliosEventPayload[T],
): Promise<void> {
  if (!isWebhookEvent(name)) {
    return;
  }

  const organizationId = (payload as { organizationId: string }).organizationId;
  const endpoints = await listActiveWebhooksForEvent(organizationId, name);

  if (endpoints.length === 0) {
    return;
  }

  await Promise.all(
    endpoints.map(async (endpoint) => {
      const deliveryId = await createWebhookDelivery(
        organizationId,
        endpoint.id,
        name,
        payload as Record<string, unknown>,
      );

      void deliverWebhook(deliveryId).catch((error) => {
        console.error(
          `[helios:webhook] delivery failed for ${name}`,
          error,
        );
      });
    }),
  );
}
