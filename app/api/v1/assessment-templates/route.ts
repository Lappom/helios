import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import {
  createAssessmentTemplate,
  listAssessmentTemplates,
} from "@/lib/assessments/service";
import { parseJsonBody } from "@/lib/validators/clients";
import {
  createAssessmentTemplateSchema,
  parseListAssessmentTemplatesQuery,
} from "@/lib/validators/assessments";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const searchParams = new URL(request.url).searchParams;
  const pagination = parsePagination(searchParams);
  const query = parseListAssessmentTemplatesQuery(searchParams, pagination);

  const { items, total } = await listAssessmentTemplates(
    org.organizationId,
    query,
  );

  return jsonOk(
    { items, page: pagination.page, limit: pagination.limit },
    { headers: withTotalCountHeaders(undefined, total) },
  );
});

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const body = await parseJsonBody(createAssessmentTemplateSchema, request);
  const template = await createAssessmentTemplate(
    org.organizationId,
    org.clerkUserId,
    body,
  );

  return jsonOk(template, { status: 201 });
});
