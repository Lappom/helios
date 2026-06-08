import { AsyncLocalStorage } from "node:async_hooks";
import { db, type DrizzleDb } from "./client";

const dbContext = new AsyncLocalStorage<DrizzleDb>();

export function getDb(): DrizzleDb {
  return dbContext.getStore() ?? db;
}

export function getDbContextStore(): DrizzleDb | undefined {
  return dbContext.getStore();
}

export function runInDbContext<T>(store: DrizzleDb, fn: () => T): T {
  return dbContext.run(store, fn);
}
