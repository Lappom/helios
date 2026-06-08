import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/api/response";
import { syncStaleOffFoods } from "@/lib/foods/service";

function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return jsonOk({ status: "unauthorized" }, { status: 401 });
  }

  const { synced } = await syncStaleOffFoods();

  return jsonOk({
    status: "ok",
    synced,
  });
}
