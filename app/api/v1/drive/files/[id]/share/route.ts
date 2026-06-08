import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getDriveFileIdFromPath } from "@/lib/api/drive-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { shareDriveFile } from "@/lib/drive/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { shareDriveSchema } from "@/lib/validators/drive";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
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

  const body = await parseJsonBody(shareDriveSchema, request);
  const share = await shareDriveFile(
    org.organizationId,
    fileId,
    org.clerkUserId,
    body,
  );

  return jsonOk(share, { status: 201 });
});
