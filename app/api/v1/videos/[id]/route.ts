import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getVideoIdFromPath } from "@/lib/api/videos-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { deleteVideo, updateVideo } from "@/lib/videos/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { updateVideoSchema } from "@/lib/validators/videos";

export const PATCH = withApiHandler(
  { requireOrg: true },
  async ({ request }) => {
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

    const body = await parseJsonBody(updateVideoSchema, request);
    const video = await updateVideo(org.organizationId, videoId, body);
    return jsonOk(video);
  },
);

export const DELETE = withApiHandler(
  { requireOrg: true },
  async ({ request }) => {
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

    await deleteVideo(org.organizationId, videoId);
    return jsonOk({ deleted: true });
  },
);
