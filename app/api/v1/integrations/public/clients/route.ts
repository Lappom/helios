import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { withPublicApiHandler, jsonOk } from "@/lib/api/public-api-handler";
import { listPublicClients } from "@/lib/integrations/public-read";
import { createClientViaIntegration } from "@/lib/integrations/public-write";
import {
  clientStatusSchema,
  parseJsonBody,
} from "@/lib/validators/clients";
import { createClientViaIntegrationSchema } from "@/lib/validators/integrations";

export const GET = withPublicApiHandler(async ({ request, apiKey }) => {
  const searchParams = new URL(request.url).searchParams;
  const pagination = parsePagination(searchParams);
  const statusParam = searchParams.get("status");
  const statusResult = statusParam
    ? clientStatusSchema.safeParse(statusParam.toUpperCase())
    : null;

  const { items, total } = await listPublicClients(apiKey.organizationId, {
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

export const POST = withPublicApiHandler(async ({ request, apiKey }) => {
  const body = await parseJsonBody(createClientViaIntegrationSchema, request);
  const client = await createClientViaIntegration(
    apiKey.organizationId,
    apiKey.planTier,
    body,
  );
  return jsonOk(client, { status: 201 });
});
