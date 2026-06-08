import { withApiHandler } from "@/lib/api/handler";
import { getVideoIdFromPath } from "@/lib/api/videos-route";
import { getClientIdForUser } from "@/lib/api/require-client";
import { requireCoachRead } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { getOrgContext } from "@/lib/auth/org-context";
import {
  assertVideoAccess,
  getVideoForPlayback,
  getVodVideoBlobStream,
} from "@/lib/videos/service";
import { verifyVideoStreamToken } from "@/lib/videos/stream-token";
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

  const searchParams = new URL(request.url).searchParams;
  const token = searchParams.get("token");
  const expParam = searchParams.get("exp");

  let authorized = false;

  if (token && expParam) {
    const expiresAt = Number(expParam);
    if (
      Number.isFinite(expiresAt) &&
      verifyVideoStreamToken(videoId, expiresAt, token)
    ) {
      authorized = true;
    }
  }

  if (!authorized) {
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

    await assertVideoAccess(org.organizationId, videoId, actor);
  }

  const playback = await getVideoForPlayback(org.organizationId, videoId);
  const blob = await getVodVideoBlobStream(playback.blobPathname);

  if (!blob) {
    throw problem({
      type: "not-found",
      title: "Video not found",
      status: 404,
      detail: "The video file could not be retrieved.",
    });
  }

  const headers = new Headers();
  headers.set("Content-Type", playback.mimeType);
  headers.set(
    "Content-Disposition",
    `inline; filename="${playback.title.replace(/"/g, "")}"`,
  );

  headers.set("Accept-Ranges", "bytes");
  return new Response(blob.stream, { headers });
});
