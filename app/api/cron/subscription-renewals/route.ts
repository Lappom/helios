import { NextRequest } from "next/server";
import { isAuthorizedCron, runCronJob } from "@/lib/api/cron-auth";
import { jsonOk } from "@/lib/api/response";
import { processSubscriptionRenewals } from "@/lib/automations/cron";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return jsonOk({ status: "unauthorized" }, { status: 401 });
  }

  const result = await runCronJob(() =>
    processSubscriptionRenewals(new Date()),
  );
  return jsonOk({ status: "ok", ...result });
}
