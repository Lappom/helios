import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { uploadDriveFile } from "@/lib/drive/service";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const formData = await request.formData();
  const file = formData.get("file");
  const folderId = formData.get("folderId");

  if (!(file instanceof File)) {
    throw problem({
      type: "validation-error",
      title: "Missing file",
      status: 400,
      detail: "Multipart field 'file' is required.",
    });
  }

  const parsedFolderId =
    typeof folderId === "string" && folderId.trim().length > 0
      ? folderId.trim()
      : null;

  const uploaded = await uploadDriveFile(
    org.organizationId,
    org.clerkUserId,
    org.planTier,
    file,
    parsedFolderId,
  );

  return jsonOk(uploaded, { status: 201 });
});
