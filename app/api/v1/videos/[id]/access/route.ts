import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getVideoIdFromPath } from "@/lib/api/videos-route";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { listVideoAccess, setVideoAccess } from "@/lib/videos/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { setVideoAccessSchema } from "@/lib/validators/videos";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const videoId = getVideoIdFromPath(request);

  if (!videoId) {
    throw problem({
      type: "validation-error",
      title: "Invalid video id",
      status: 400,
      detail: "Video id is required.",
    });
  }

  const items = await listVideoAccess(org.organizationId, videoId);
  return jsonOk({ items });
});

export const PUT = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const videoId = getVideoIdFromPath(request);

  if (!videoId) {
    throw problem({
      type: "validation-error",
      title: "Invalid video id",
      status: 400,
      detail: "Video id is required.",
    });
  }

  const body = await parseJsonBody(setVideoAccessSchema, request);
  const items = await setVideoAccess(org.organizationId, videoId, body);
  return jsonOk({ items });
});
