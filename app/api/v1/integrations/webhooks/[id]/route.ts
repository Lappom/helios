import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getIntegrationResourceIdFromPath } from "@/lib/api/integration-route";
import { problem } from "@/lib/api/response";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import {
  deleteWebhook,
  getWebhook,
  updateWebhook,
} from "@/lib/integrations/webhooks";
import { parseJsonBody } from "@/lib/validators/clients";
import { updateWebhookSchema } from "@/lib/validators/integrations";

export const GET = withApiHandler(
  { requireOrg: true, requireFeature: "api_access" },
  async ({ request }) => {
    const org = await requireCoachRead();
    const webhookId = getIntegrationResourceIdFromPath(request, "webhooks");

    if (!webhookId) {
      throw problem({
        type: "validation-error",
        title: "Invalid webhook id",
        status: 400,
        detail: "Webhook id is required.",
      });
    }

    const webhook = await getWebhook(org.organizationId, webhookId);
    const { secret, ...item } = webhook;
    return jsonOk({ ...item, secretPreview: `${secret.slice(0, 12)}...` });
  },
);

export const PATCH = withApiHandler(
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

    const body = await parseJsonBody(updateWebhookSchema, request);
    const updated = await updateWebhook(org.organizationId, webhookId, body);
    return jsonOk(updated);
  },
);

export const DELETE = withApiHandler(
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

    await deleteWebhook(org.organizationId, webhookId);
    return jsonOk({ ok: true });
  },
);
