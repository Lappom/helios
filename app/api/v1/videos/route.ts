import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { createYoutubeVideo, listVideos } from "@/lib/videos/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { createYoutubeVideoSchema } from "@/lib/validators/videos";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const searchParams = new URL(request.url).searchParams;
  const pagination = parsePagination(searchParams);
  const categoryIdParam = searchParams.get("categoryId");

  let categoryId: string | null | undefined;
  if (categoryIdParam === "null") {
    categoryId = null;
  } else if (categoryIdParam) {
    categoryId = categoryIdParam;
  }

  const result = await listVideos(org.organizationId, {
    categoryId,
    page: pagination.page,
    limit: pagination.limit,
    offset: pagination.offset,
  });

  return jsonOk(
    {
      items: result.items,
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
    },
    { headers: withTotalCountHeaders(undefined, result.total) },
  );
});

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const body = await parseJsonBody(createYoutubeVideoSchema, request);
  const video = await createYoutubeVideo(
    org.organizationId,
    org.clerkUserId,
    body,
  );

  return jsonOk(video, { status: 201 });
});
