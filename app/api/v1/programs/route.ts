import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { createProgram, listPrograms } from "@/lib/programs/service";
import { parseJsonBody } from "@/lib/validators/clients";
import {
  createProgramSchema,
  parseListProgramsQuery,
} from "@/lib/validators/programs";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const searchParams = new URL(request.url).searchParams;
  const pagination = parsePagination(searchParams);
  const query = parseListProgramsQuery(searchParams, pagination);

  const { items, total } = await listPrograms(org.organizationId, query);

  return jsonOk(
    { items, page: pagination.page, limit: pagination.limit },
    { headers: withTotalCountHeaders(undefined, total) },
  );
});

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const body = await parseJsonBody(createProgramSchema, request);
  const program = await createProgram(
    org.organizationId,
    org.clerkUserId,
    body,
  );

  return jsonOk(program, { status: 201 });
});
