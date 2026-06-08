import { logAuditEvent } from "@/lib/audit/service";
import { getClientIdFromPath } from "@/lib/api/client-route";
import { withApiHandler } from "@/lib/api/handler";
import { requireCoachRead } from "@/lib/api/require-coach";
import {
  exportClientData,
  serializeClientExport,
} from "@/lib/privacy/service";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const clientId = getClientIdFromPath(request);
  const data = await exportClientData(org.organizationId, clientId);

  await logAuditEvent({
    organizationId: org.organizationId,
    actor: { type: "coach", clerkUserId: org.clerkUserId },
    action: "client.export",
    resourceType: "client",
    resourceId: clientId,
    request,
  });

  const body = serializeClientExport(data);
  const filename = `client-${clientId}-export.json`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
