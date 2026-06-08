import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getClientIdFromPath } from "@/lib/api/client-route";
import { requireCoachRead } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { listClientDrive } from "@/lib/drive/service";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const clientId = getClientIdFromPath(request);

  if (!clientId) {
    throw problem({
      type: "validation-error",
      title: "Invalid client id",
      status: 400,
      detail: "Client id is required.",
    });
  }

  const items = await listClientDrive(org.organizationId, clientId);
  return jsonOk({ items });
});
