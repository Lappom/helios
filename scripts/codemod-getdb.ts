import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const exclude = new Set([
  "lib/db/client.ts",
  "lib/db/context.ts",
  "lib/db/scope.ts",
  "lib/db/index.ts",
]);

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "migrations") continue;
      walk(path, files);
      continue;
    }
    if (path.endsWith(".ts") || path.endsWith(".tsx")) {
      files.push(path.replace(/\\/g, "/"));
    }
  }
  return files;
}

for (const file of walk(".")) {
  if (exclude.has(file)) continue;

  let content = readFileSync(file, "utf8");
  if (!content.includes("@/lib/db")) continue;

  const original = content;

  if (!content.includes("getDb")) {
    content = content.replace(
      /import\s*\{\s*db\s*\}\s*from\s*["']@\/lib\/db["']/g,
      'import { getDb } from "@/lib/db"',
    );
    content = content.replace(/import\s*\{\s*db,\s*/g, "import { getDb, ");
    content = content.replace(/,\s*db\s*\}/g, ", getDb }");
    content = content.replace(
      /import\s*\{([^}]+)\}\s*from\s*["']@\/lib\/db["']/,
      (match, imports: string) => {
        if (imports.includes("getDb")) return match;
        return `import { getDb, ${imports.trim()} } from "@/lib/db"`;
      },
    );
  }

  content = content.replace(/\bdb\./g, "getDb().");
  content = content.replace(/\bawait db\b/g, "await getDb()");
  content = content.replace(/\breturn db\b/g, "return getDb()");

  if (content !== original) {
    writeFileSync(file, content);
    console.log("updated", file);
  }
}
