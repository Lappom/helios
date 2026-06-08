import { NextRequest } from "next/server";
import { isAuthorizedCron, runCronJob } from "@/lib/api/cron-auth";
import { jsonOk } from "@/lib/api/response";
import { processQuestionnaireSchedules } from "@/lib/questionnaires/cron";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return jsonOk({ status: "unauthorized" }, { status: 401 });
  }

  const result = await runCronJob(() => processQuestionnaireSchedules());

  return jsonOk({
    status: "ok",
    ...result,
  });
}
