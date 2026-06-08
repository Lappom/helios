import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireCoachRead } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { listSharesForItem } from "@/lib/drive/service";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const searchParams = new URL(request.url).searchParams;
  const fileId = searchParams.get("fileId");
  const folderId = searchParams.get("folderId");

  if (!fileId && !folderId) {
    throw problem({
      type: "validation-error",
      title: "Missing target",
      status: 400,
      detail: "Either fileId or folderId is required.",
    });
  }

  if (fileId && folderId) {
    throw problem({
      type: "validation-error",
      title: "Invalid target",
      status: 400,
      detail: "Provide only one of fileId or folderId.",
    });
  }

  const items = await listSharesForItem(org.organizationId, {
    fileId: fileId ?? undefined,
    folderId: folderId ?? undefined,
  });

  return jsonOk({ items });
});
