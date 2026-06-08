import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireClient } from "@/lib/api/require-client";
import { listClientOwnDrive } from "@/lib/drive/service";

export const GET = withApiHandler({ requireOrg: true }, async () => {
  const client = await requireClient();
  const items = await listClientOwnDrive(
    client.organizationId,
    client.clientId,
  );

  return jsonOk({ items });
});
