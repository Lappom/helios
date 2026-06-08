import { withApiHandler } from "@/lib/api/handler";
import { getDriveFileIdFromPath } from "@/lib/api/drive-route";
import { getClientIdForUser } from "@/lib/api/require-client";
import { requireCoachRead } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { getOrgContext } from "@/lib/auth/org-context";
import {
  getDriveFileBlobStream,
  getDriveFileForDownload,
} from "@/lib/drive/service";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const fileId = getDriveFileIdFromPath(request);

  if (!fileId) {
    throw problem({
      type: "validation-error",
      title: "Invalid file id",
      status: 400,
      detail: "File id is required.",
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

  let actor: { role: "coach" } | { role: "client"; clientId: string };

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

  const file = await getDriveFileForDownload(
    org.organizationId,
    fileId,
    actor,
  );

  const blob = await getDriveFileBlobStream(file.blobPathname);
  if (!blob) {
    throw problem({
      type: "not-found",
      title: "File not found",
      status: 404,
      detail: "The file could not be retrieved.",
    });
  }

  const headers = new Headers();
  headers.set("Content-Type", file.mimeType);
  headers.set(
    "Content-Disposition",
    `attachment; filename="${file.name.replace(/"/g, "")}"`,
  );

  return new Response(blob.stream, { headers });
});
