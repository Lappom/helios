import { NextRequest } from "next/server";
import { isAuthorizedCron, runCronJob } from "@/lib/api/cron-auth";
import { jsonOk } from "@/lib/api/response";
import { processAssessmentReminders } from "@/lib/assessments/reminders";
import { processSessionReminders } from "@/lib/sessions/reminders";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return jsonOk({ status: "unauthorized" }, { status: 401 });
  }

  const result = await runCronJob(async () => {
    const [sessions, assessments] = await Promise.all([
      processSessionReminders(new Date(), "d0"),
      processAssessmentReminders(new Date()),
    ]);
    return { sessions, assessments };
  });

  return jsonOk({
    status: "ok",
    ...result,
  });
}
