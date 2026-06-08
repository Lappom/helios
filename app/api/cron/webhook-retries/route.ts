import { NextRequest } from "next/server";
import { isAuthorizedCron, runCronJob } from "@/lib/api/cron-auth";
import { jsonOk } from "@/lib/api/response";
import { processPendingWebhookRetries } from "@/lib/integrations/deliver";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return jsonOk({ status: "unauthorized" }, { status: 401 });
  }

  const processed = await runCronJob(() => processPendingWebhookRetries());

  return jsonOk({
    status: "ok",
    processed,
  });
}
