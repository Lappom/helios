import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getDriveFileIdFromPath } from "@/lib/api/drive-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { deleteDriveFile } from "@/lib/drive/service";

export const DELETE = withApiHandler(
  { requireOrg: true },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const fileId = getDriveFileIdFromPath(request);

    if (!fileId) {
      throw problem({
        type: "validation-error",
        title: "Invalid file id",
        status: 400,
        detail: "File id is required.",
      });
    }

    await deleteDriveFile(org.organizationId, fileId);
    return jsonOk({ deleted: true });
  },
);
