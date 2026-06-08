import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/org-context";
import { listAuditLogs } from "@/lib/audit/service";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireRole("org_owner", "org_admin");
  const pagination = parsePagination(new URL(request.url).searchParams);
  const { items, total } = await listAuditLogs(org.organizationId, {
    page: pagination.page,
    limit: pagination.limit,
    offset: pagination.offset,
  });

  return jsonOk(
    { items, page: pagination.page, limit: pagination.limit },
    { headers: withTotalCountHeaders(undefined, total) },
  );
});
