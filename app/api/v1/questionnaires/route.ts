import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import {
  createQuestionnaire,
  listQuestionnaires,
} from "@/lib/questionnaires/service";
import { parseJsonBody } from "@/lib/validators/clients";
import {
  createQuestionnaireSchema,
  parseListQuestionnairesQuery,
} from "@/lib/validators/questionnaires";

export const GET = withApiHandler(
  { requireOrg: true, requireFeature: "recurring_questionnaires" },
  async ({ request }) => {
    const org = await requireCoachRead();
    const searchParams = new URL(request.url).searchParams;
    const pagination = parsePagination(searchParams);
    const query = parseListQuestionnairesQuery(searchParams, pagination);

    const { items, total } = await listQuestionnaires(
      org.organizationId,
      query,
    );

    return jsonOk(
      { items, page: pagination.page, limit: pagination.limit },
      { headers: withTotalCountHeaders(undefined, total) },
    );
  },
);

export const POST = withApiHandler(
  { requireOrg: true, requireFeature: "recurring_questionnaires" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const body = await parseJsonBody(createQuestionnaireSchema, request);
    const questionnaire = await createQuestionnaire(
      org.organizationId,
      org.clerkUserId,
      body,
    );

    return jsonOk(questionnaire, { status: 201 });
  },
);
