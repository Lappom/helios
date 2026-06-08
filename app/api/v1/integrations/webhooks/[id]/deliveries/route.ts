import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getIntegrationResourceIdFromPath } from "@/lib/api/integration-route";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { problem } from "@/lib/api/response";
import { requireCoachRead } from "@/lib/api/require-coach";
import { listWebhookDeliveries } from "@/lib/integrations/webhooks";

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

    const pagination = parsePagination(new URL(request.url).searchParams);
    const { items, total } = await listWebhookDeliveries(
      org.organizationId,
      webhookId,
      pagination,
    );

    return jsonOk(
      { items, page: pagination.page, limit: pagination.limit },
      { headers: withTotalCountHeaders(undefined, total) },
    );
  },
);
