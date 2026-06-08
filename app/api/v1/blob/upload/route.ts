import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { problem } from "@/lib/api/response";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { getDriveStorageUsed } from "@/lib/billing/drive-quota";
import { getPlanLimit } from "@/lib/billing/plans";
import {
  assertDriveUploadAllowed,
  assertVodVideoUploadAllowed,
} from "@/lib/storage/blob";
import {
  isAllowedDriveMimeType,
  isAllowedVodMimeType,
  parseDriveUploadPathname,
  parseVodUploadPathname,
} from "@/lib/storage/client-upload";
import { blobUploadClientPayloadSchema } from "@/lib/validators/blob-upload";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const org = await requireCoachWrite();

        let payload: ReturnType<typeof blobUploadClientPayloadSchema.parse>;
        try {
          payload = blobUploadClientPayloadSchema.parse(
            JSON.parse(clientPayload ?? "{}"),
          );
        } catch {
          throw problem({
            type: "validation-error",
            title: "Invalid upload payload",
            status: 400,
            detail: "Client payload is missing or invalid.",
          });
        }

        if (payload.uploadType === "drive") {
          const parsed = parseDriveUploadPathname(pathname);
          if (!parsed || parsed.organizationId !== org.organizationId) {
            throw problem({
              type: "forbidden",
              title: "Invalid drive pathname",
              status: 403,
              detail: "Drive uploads must use your organization pathname prefix.",
            });
          }

          if (!isAllowedDriveMimeType(payload.mimeType)) {
            throw problem({
              type: "validation-error",
              title: "Unsupported file format",
              status: 400,
              detail: "Drive upload MIME type is not allowed.",
            });
          }

          const storageUsed = await getDriveStorageUsed(org.organizationId);
          const pseudoFile = {
            type: payload.mimeType,
            size: payload.sizeBytes,
          } as File;
          assertDriveUploadAllowed(org.planTier, pseudoFile, storageUsed);

          return {
            allowedContentTypes: [payload.mimeType],
            maximumSizeInBytes: getPlanLimit(org.planTier, "driveFile"),
            addRandomSuffix: false,
            tokenPayload: JSON.stringify({
              organizationId: org.organizationId,
              uploadType: payload.uploadType,
            }),
          };
        }

        const parsedVod = parseVodUploadPathname(pathname);
        if (!parsedVod || parsedVod.organizationId !== org.organizationId) {
          throw problem({
            type: "forbidden",
            title: "Invalid VOD pathname",
            status: 403,
            detail: "VOD uploads must use your organization pathname prefix.",
          });
        }

        if (payload.uploadType === "vod_thumbnail") {
          if (!parsedVod.isThumbnail) {
            throw problem({
              type: "validation-error",
              title: "Invalid thumbnail pathname",
              status: 400,
              detail: "Thumbnail pathnames must end with -thumb.jpg.",
            });
          }

          return {
            allowedContentTypes: ["image/jpeg"],
            maximumSizeInBytes: 10 * 1024 * 1024,
            addRandomSuffix: false,
            tokenPayload: JSON.stringify({
              organizationId: org.organizationId,
              uploadType: payload.uploadType,
            }),
          };
        }

        if (!isAllowedVodMimeType(payload.mimeType)) {
          throw problem({
            type: "validation-error",
            title: "Unsupported video format",
            status: 400,
            detail: "VOD upload MIME type is not allowed.",
          });
        }

        const pseudoVideo = {
          type: payload.mimeType,
          size: payload.sizeBytes,
        } as File;
        assertVodVideoUploadAllowed(org.planTier, pseudoVideo);

        return {
          allowedContentTypes: [payload.mimeType],
          maximumSizeInBytes: getPlanLimit(org.planTier, "vodVideo"),
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({
            organizationId: org.organizationId,
            uploadType: payload.uploadType,
          }),
        };
      },
      onUploadCompleted: async () => {
        // DB records are created by the finalize API routes after client upload.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      typeof error.status === "number"
    ) {
      throw error;
    }

    throw problem({
      type: "internal-error",
      title: "Blob upload failed",
      status: 500,
      detail: error instanceof Error ? error.message : "Upload token failed.",
    });
  }
}
