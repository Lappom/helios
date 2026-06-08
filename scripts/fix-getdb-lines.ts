import { readFileSync, writeFileSync } from "node:fs";

const files = [
  "lib/assessments/service.ts",
  "lib/automations/service.ts",
  "lib/habits/service.ts",
  "lib/notifications/service.ts",
  "lib/nutrition/service.ts",
  "lib/pathways/service.ts",
  "lib/programs/service.ts",
  "lib/questionnaires/service.ts",
  "lib/referrals/service.ts",
  "lib/session-feedback/service.ts",
  "lib/videos/service.ts",
];

for (const file of files) {
  let content = readFileSync(file, "utf8");
  content = content.replace(
    /import \{ db \} from "@\/lib\/db"/g,
    'import { getDb } from "@/lib/db"',
  );
  content = content.replace(/\bdb\./g, "getDb().");
  content = content.replace(/\bawait db\b/g, "await getDb()");
  content = content.replace(/^([ \t]+)db$/gm, "$1getDb()");
  writeFileSync(file, content);
  console.log("ok", file);
}
