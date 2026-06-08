import { NextRequest } from "next/server";
import { isAuthorizedCron, runCronJob } from "@/lib/api/cron-auth";
import { jsonOk } from "@/lib/api/response";
import { processScheduledNotificationTemplates } from "@/lib/notifications/scheduled";
import { processSessionReminders } from "@/lib/sessions/reminders";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return jsonOk({ status: "unauthorized" }, { status: 401 });
  }

  const result = await runCronJob(async () => {
    const [scheduled, sessionH1] = await Promise.all([
      processScheduledNotificationTemplates(new Date()),
      processSessionReminders(new Date(), "h1"),
    ]);
    return { scheduled, sessionH1 };
  });

  return jsonOk({
    status: "ok",
    ...result,
  });
}
