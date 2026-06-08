import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireCoachRead } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { listClientVideoFeed } from "@/lib/videos/service";

export const GET = withApiHandler(
  { requireOrg: true },
  async ({ request }) => {
    const org = await requireCoachRead();
    const segments = new URL(request.url).pathname.split("/").filter(Boolean);
    const clientsIndex = segments.indexOf("clients");
    const clientId = clientsIndex >= 0 ? segments[clientsIndex + 1] : "";

    if (!clientId) {
      throw problem({
        type: "validation-error",
        title: "Invalid client id",
        status: 400,
        detail: "Client id is required.",
      });
    }

    const categories = await listClientVideoFeed(org.organizationId, clientId);
    return jsonOk({ categories });
  },
);
