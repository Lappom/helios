import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getDriveFolderIdFromPath } from "@/lib/api/drive-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { shareDriveFolder } from "@/lib/drive/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { shareDriveSchema } from "@/lib/validators/drive";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const folderId = getDriveFolderIdFromPath(request);

  if (!folderId) {
    throw problem({
      type: "validation-error",
      title: "Invalid folder id",
      status: 400,
      detail: "Folder id is required.",
    });
  }

  const body = await parseJsonBody(shareDriveSchema, request);
  const share = await shareDriveFolder(
    org.organizationId,
    folderId,
    org.clerkUserId,
    body,
  );

  return jsonOk(share, { status: 201 });
});
