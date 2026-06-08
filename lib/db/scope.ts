import { sql } from "drizzle-orm";
import { db, type DrizzleDb } from "./client";
import { getDbContextStore, runInDbContext } from "./context";

export type DbScope = { organizationId: string } | { bypass: true };

export async function runWithDbScope<T>(
  scope: DbScope,
  fn: () => Promise<T>,
): Promise<T> {
  if (getDbContextStore()) {
    return fn();
  }

  return db.transaction(async (tx) => {
    if ("bypass" in scope) {
      await tx.execute(sql`SELECT set_config('app.bypass_rls', 'true', true)`);
    } else {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${scope.organizationId}, true)`,
      );
    }

    return runInDbContext(tx as unknown as DrizzleDb, fn);
  });
}
