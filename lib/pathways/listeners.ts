import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { coachingPathways } from "@/lib/db/schema";
import type { ClientCreatedPayload } from "@/lib/events/types";
import {
  dispatchPathwayEnrollment,
  resolvePathwayTriggerEventId,
} from "./dispatcher";

export async function handlePathwayClientCreated(
  payload: ClientCreatedPayload,
): Promise<void> {
  const pathway = await getDb().query.coachingPathways.findFirst({
    where: and(
      eq(coachingPathways.organizationId, payload.organizationId),
      eq(coachingPathways.isActive, true),
      eq(coachingPathways.autoEnrollOnClientCreated, true),
    ),
    columns: { id: true },
  });

  if (!pathway) return;

  await dispatchPathwayEnrollment(
    payload.organizationId,
    pathway.id,
    payload.clientId,
    resolvePathwayTriggerEventId(payload.clientId),
  );
}
