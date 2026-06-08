import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

type Finding = {
  file: string;
  line: number;
  message: string;
};

const findings: Finding[] = [];

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (
        entry === "node_modules" ||
        entry === "migrations" ||
        entry === ".next"
      ) {
        continue;
      }
      walk(path, files);
      continue;
    }
    if (path.endsWith("route.ts")) {
      files.push(path.replace(/\\/g, "/"));
    }
  }
  return files;
}

const allowlist = new Set([
  "app/api/health/route.ts",
  "app/api/webhooks/clerk/route.ts",
  "app/api/webhooks/resend/route.ts",
]);

function auditRoute(file: string): void {
  if (allowlist.has(file)) {
    return;
  }

  const content = readFileSync(file, "utf8");
  if (!content.includes("getDb()")) {
    return;
  }

  const usesApiHandler =
    content.includes("withApiHandler") ||
    content.includes("withPublicApiHandler") ||
    content.includes("runWithDbScope") ||
    content.includes("runCronJob");

  if (usesApiHandler) {
    return;
  }

  const lines = content.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]?.includes("getDb()")) {
      findings.push({
        file,
        line: index + 1,
        message: "Route uses getDb() without withApiHandler/withPublicApiHandler",
      });
    }
  }
}

for (const file of walk("app/api")) {
  auditRoute(file);
}

if (findings.length > 0) {
  console.error(JSON.stringify({ findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ status: "ok", findings: [] }));
