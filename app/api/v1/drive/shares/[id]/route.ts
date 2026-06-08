import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getDriveShareIdFromPath } from "@/lib/api/drive-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { revokeShare } from "@/lib/drive/service";

export const DELETE = withApiHandler(
  { requireOrg: true },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const shareId = getDriveShareIdFromPath(request);

    if (!shareId) {
      throw problem({
        type: "validation-error",
        title: "Invalid share id",
        status: 400,
        detail: "Share id is required.",
      });
    }

    await revokeShare(org.organizationId, shareId);
    return jsonOk({ revoked: true });
  },
);
