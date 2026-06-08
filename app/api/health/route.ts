import { sql } from "drizzle-orm";
import { getDb, runWithDbScope } from "@/lib/db";
import { jsonOk } from "@/lib/api/response";

export async function GET() {
  try {
    await runWithDbScope({ bypass: true }, () =>
      getDb().execute(sql`SELECT 1`),
    );
    return jsonOk({
      status: "ok",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return jsonOk(
      {
        status: "degraded",
        db: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
