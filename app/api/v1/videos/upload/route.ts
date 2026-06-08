import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { uploadVideo } from "@/lib/videos/service";
import { createUploadVideoMetadataSchema } from "@/lib/validators/videos";

function parseClientIds(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const formData = await request.formData();
  const file = formData.get("file");
  const thumbnail = formData.get("thumbnail");

  if (!(file instanceof File)) {
    throw problem({
      type: "validation-error",
      title: "Missing file",
      status: 400,
      detail: "Multipart field 'file' is required.",
    });
  }

  const metadata = createUploadVideoMetadataSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    visibility: formData.get("visibility") || "all_clients",
    clientIds: parseClientIds(formData.get("clientIds")),
    durationSeconds: formData.get("durationSeconds")
      ? Number(formData.get("durationSeconds"))
      : undefined,
  });

  const video = await uploadVideo(
    org.organizationId,
    org.clerkUserId,
    org.planTier,
    file,
    thumbnail instanceof File ? thumbnail : null,
    metadata,
  );

  return jsonOk(video, { status: 201 });
});
