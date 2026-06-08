import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getIntegrationResourceIdFromPath } from "@/lib/api/integration-route";
import { problem } from "@/lib/api/response";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { deliverWebhook } from "@/lib/integrations/deliver";
import {
  createWebhookDelivery,
  getWebhook,
} from "@/lib/integrations/webhooks";

export const POST = withApiHandler(
  { requireOrg: true, requireFeature: "api_access" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const webhookId = getIntegrationResourceIdFromPath(request, "webhooks");

    if (!webhookId) {
      throw problem({
        type: "validation-error",
        title: "Invalid webhook id",
        status: 400,
        detail: "Webhook id is required.",
      });
    }

    await getWebhook(org.organizationId, webhookId);

    const deliveryId = await createWebhookDelivery(
      org.organizationId,
      webhookId,
      "client.created",
      {
        organizationId: org.organizationId,
        clientId: "test_client_id",
        source: "manual",
        test: true,
      },
    );

    await deliverWebhook(deliveryId);

    return jsonOk({ deliveryId, event: "client.created", test: true });
  },
);
