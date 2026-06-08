import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireClient } from "@/lib/api/require-client";
import { listClientVideoFeed } from "@/lib/videos/service";

export const GET = withApiHandler({ requireOrg: true }, async () => {
  const client = await requireClient();
  const categories = await listClientVideoFeed(
    client.organizationId,
    client.clientId,
  );

  return jsonOk({ categories });
});
