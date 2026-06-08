import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { createAutomation, listAutomations } from "@/lib/automations/service";
import { seedSystemAutomations } from "@/lib/automations/seed";
import { parseJsonBody } from "@/lib/validators/clients";
import {
  createAutomationSchema,
  parseListAutomationsQuery,
} from "@/lib/validators/automations";

export const GET = withApiHandler(
  { requireOrg: true, requireFeature: "automations" },
  async ({ request }) => {
    const org = await requireCoachRead();
    await seedSystemAutomations(org.organizationId, org.clerkUserId);

    const searchParams = new URL(request.url).searchParams;
    const pagination = parsePagination(searchParams);
    const query = parseListAutomationsQuery(searchParams, pagination);
    const { items, total } = await listAutomations(org.organizationId, query);

    return jsonOk(
      { items, page: pagination.page, limit: pagination.limit },
      { headers: withTotalCountHeaders(undefined, total) },
    );
  },
);

export const POST = withApiHandler(
  { requireOrg: true, requireFeature: "automations" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const body = await parseJsonBody(createAutomationSchema, request);
    const automation = await createAutomation(
      org.organizationId,
      org.clerkUserId,
      body,
    );
    return jsonOk(automation, { status: 201 });
  },
);
