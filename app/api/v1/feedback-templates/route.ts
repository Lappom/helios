import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import {
  createFeedbackTemplate,
  getDefaultFeedbackTemplateTree,
  listFeedbackTemplates,
  seedDefaultFeedbackTemplateIfMissing,
} from "@/lib/session-feedback/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { createFeedbackTemplateSchema } from "@/lib/validators/session-feedback";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  await seedDefaultFeedbackTemplateIfMissing(
    org.organizationId,
    org.clerkUserId,
  );

  const searchParams = new URL(request.url).searchParams;
  const pagination = parsePagination(searchParams);

  const { items, total } = await listFeedbackTemplates(org.organizationId, {
    page: pagination.page,
    limit: pagination.limit,
    offset: pagination.offset,
  });

  const defaultTemplate = await getDefaultFeedbackTemplateTree(
    org.organizationId,
  );

  return jsonOk(
    {
      items,
      defaultTemplate,
      page: pagination.page,
      limit: pagination.limit,
    },
    { headers: withTotalCountHeaders(undefined, total) },
  );
});

export const POST = withApiHandler(
  { requireOrg: true, requireFeature: "custom_session_feedback" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const body = await parseJsonBody(createFeedbackTemplateSchema, request);
    const template = await createFeedbackTemplate(
      org.organizationId,
      org.clerkUserId,
      body,
    );

    return jsonOk(template, { status: 201 });
  },
);
