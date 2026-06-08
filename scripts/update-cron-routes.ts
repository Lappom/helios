import { readFileSync, writeFileSync } from "node:fs";

const cronFiles = [
  "app/api/cron/webhook-retries/route.ts",
  "app/api/cron/reset-ai-credits/route.ts",
  "app/api/cron/questionnaire-schedules/route.ts",
  "app/api/cron/subscription-renewals/route.ts",
  "app/api/cron/automation-schedules/route.ts",
  "app/api/cron/notification-scheduled/route.ts",
  "app/api/cron/daily-reminders/route.ts",
  "app/api/cron/revenue-snapshots/route.ts",
  "app/api/cron/booking-reminders/route.ts",
  "app/api/cron/habit-reminders/route.ts",
  "app/api/cron/monthly-assessments/route.ts",
  "app/api/cron/sync-off-foods/route.ts",
];

const cronAuthImport =
  'import { isAuthorizedCron, runCronJob } from "@/lib/api/cron-auth";';

const localAuthBlock =
  /function isAuthorizedCron\(request: NextRequest\): boolean \{[\s\S]*?\}\n\n/;

for (const file of cronFiles) {
  let content = readFileSync(file, "utf8");
  content = content.replace(localAuthBlock, "");
  if (!content.includes("cron-auth")) {
    content = content.replace(
      'import { jsonOk } from "@/lib/api/response";',
      `import { jsonOk } from "@/lib/api/response";\n${cronAuthImport}`,
    );
  }

  content = content.replace(
    /export async function GET\(request: NextRequest\) \{\n  if \(!isAuthorizedCron\(request\)\) \{\n    return jsonOk\(\{ status: "unauthorized" \}, \{ status: 401 \}\);\n  \}\n\n([\s\S]*?)\n  return jsonOk\(/,
    (
      _match: string,
      body: string,
    ) =>
      `export async function GET(request: NextRequest) {\n  if (!isAuthorizedCron(request)) {\n    return jsonOk({ status: "unauthorized" }, { status: 401 });\n  }\n\n  const result = await runCronJob(async () => {\n${body.trim()}\n  });\n\n  return jsonOk(`,
  );

  content = content.replace(
    /return jsonOk\(\{\n    status: "ok",/g,
    "return {\n    status: \"ok\",",
  );

  // Fix the closing - this is getting messy. Let me do manual approach per file instead.
  writeFileSync(file, content);
}
