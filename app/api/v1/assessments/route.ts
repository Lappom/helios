import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireClient } from "@/lib/api/require-client";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import {
  createAssessment,
  listAssessments,
  listClientPendingAssessments,
} from "@/lib/assessments/service";
import { parseJsonBody } from "@/lib/validators/clients";
import {
  createAssessmentSchema,
  parseListAssessmentsQuery,
} from "@/lib/validators/assessments";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const searchParams = new URL(request.url).searchParams;
  const pagination = parsePagination(searchParams);
  const mine = searchParams.get("mine") === "true";

  if (mine) {
    const client = await requireClient();
    const items = await listClientPendingAssessments(
      client.organizationId,
      client.clientId,
    );
    return jsonOk({ items });
  }

  const org = await requireCoachRead();
  const query = parseListAssessmentsQuery(searchParams, pagination);
  const { items, total } = await listAssessments(org.organizationId, query);

  return jsonOk(
    { items, page: pagination.page, limit: pagination.limit },
    { headers: withTotalCountHeaders(undefined, total) },
  );
});

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const body = await parseJsonBody(createAssessmentSchema, request);
  const assessment = await createAssessment(
    org.organizationId,
    org.clerkUserId,
    body,
  );

  return jsonOk(assessment, { status: 201 });
});
