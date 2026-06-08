import { NextRequest } from "next/server";
import { purgeExpiredAuditLogs } from "@/lib/audit/service";
import { isAuthorizedCron, runCronJob } from "@/lib/api/cron-auth";
import { jsonOk } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return jsonOk({ status: "unauthorized" }, { status: 401 });
  }

  const purged = await runCronJob(() => purgeExpiredAuditLogs());

  return jsonOk({
    status: "ok",
    purged,
  });
}
