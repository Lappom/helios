import { logAuditEvent } from "@/lib/audit/service";
import { withApiHandler } from "@/lib/api/handler";
import { requireClient } from "@/lib/api/require-client";
import {
  exportClientData,
  serializeClientExport,
} from "@/lib/privacy/service";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const client = await requireClient();
  const data = await exportClientData(
    client.organizationId,
    client.clientId,
  );

  await logAuditEvent({
    organizationId: client.organizationId,
    actor: { type: "client", clerkUserId: client.clerkUserId },
    action: "data.export_requested",
    resourceType: "client",
    resourceId: client.clientId,
    request,
  });

  const body = serializeClientExport(data);
  const filename = `my-data-export.json`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
