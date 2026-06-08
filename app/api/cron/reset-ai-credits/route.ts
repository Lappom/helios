import { NextRequest } from "next/server";
import { isAuthorizedCron, runCronJob } from "@/lib/api/cron-auth";
import { jsonOk } from "@/lib/api/response";
import { resetAllApiCredits } from "@/lib/billing/api-credits";
import { resetAllAiCredits } from "@/lib/billing/ai-credits";
import { resetAllNotificationQuotas } from "@/lib/billing/notification-quota";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return jsonOk({ status: "unauthorized" }, { status: 401 });
  }

  const result = await runCronJob(async () => {
    const [aiResetCount, apiResetCount, notificationResetCount] =
      await Promise.all([
        resetAllAiCredits(),
        resetAllApiCredits(),
        resetAllNotificationQuotas(),
      ]);
    return { aiResetCount, apiResetCount, notificationResetCount };
  });

  return jsonOk({
    status: "ok",
    ...result,
  });
}
