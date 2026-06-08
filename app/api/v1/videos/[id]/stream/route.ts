import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getVideoIdFromPath } from "@/lib/api/videos-route";
import { getClientIdForUser } from "@/lib/api/require-client";
import { requireCoachRead } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { getOrgContext } from "@/lib/auth/org-context";
import { getVideoStreamInfo } from "@/lib/videos/service";
import type { VideoActor } from "@/lib/videos/types";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const videoId = getVideoIdFromPath(request);

  if (!videoId) {
    throw problem({
      type: "validation-error",
      title: "Invalid video id",
      status: 400,
      detail: "Video id is required.",
    });
  }

  const org = await getOrgContext();
  if (!org) {
    throw problem({
      type: "unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: "Authentication required.",
    });
  }

  let actor: VideoActor;

  if (org.role === "client") {
    const clientId = await getClientIdForUser(
      org.organizationId,
      org.clerkUserId,
    );
    if (!clientId) {
      throw problem({
        type: "forbidden",
        title: "Forbidden",
        status: 403,
        detail: "No client profile is linked to this account.",
      });
    }
    actor = { role: "client", clientId };
  } else {
    await requireCoachRead();
    actor = { role: "coach" };
  }

  const stream = await getVideoStreamInfo(
    org.organizationId,
    videoId,
    actor,
  );

  return jsonOk(stream);
});
