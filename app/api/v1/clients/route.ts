import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { createClient, listClients } from "@/lib/clients/service";
import { emitHeliosEvent } from "@/lib/events/emit-event";
import {
  clientStatusSchema,
  createClientSchema,
  parseJsonBody,
} from "@/lib/validators/clients";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const searchParams = new URL(request.url).searchParams;
  const pagination = parsePagination(searchParams);
  const statusParam = searchParams.get("status");
  const statusResult = statusParam
    ? clientStatusSchema.safeParse(statusParam.toUpperCase())
    : null;

  const { items, total } = await listClients(org.organizationId, {
    status: statusResult?.success ? statusResult.data : undefined,
    search: searchParams.get("search") ?? undefined,
    page: pagination.page,
    limit: pagination.limit,
    offset: pagination.offset,
  });

  return jsonOk(
    { items, page: pagination.page, limit: pagination.limit },
    { headers: withTotalCountHeaders(undefined, total) },
  );
});

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const body = await parseJsonBody(createClientSchema, request);
  const client = await createClient(org.organizationId, org.planTier, body);

  emitHeliosEvent("client.created", {
    organizationId: org.organizationId,
    clientId: client.id,
    source: "manual",
  });

  return jsonOk(client, { status: 201 });
});
