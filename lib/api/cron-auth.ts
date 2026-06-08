import type { NextRequest } from "next/server";
import { getDb, runWithDbScope } from "@/lib/db";

export function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function runCronJob<T>(fn: () => Promise<T>): Promise<T> {
  return runWithDbScope({ bypass: true }, fn);
}
