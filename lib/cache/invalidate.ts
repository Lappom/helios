import { cacheDel, cacheDelByPattern } from "./redis";
import { cacheKeys } from "./keys";

export async function invalidateProgramTree(
  orgId: string,
  programId: string,
): Promise<void> {
  await cacheDel(cacheKeys.programTree(orgId, programId));
}

export async function invalidateOrgPrograms(orgId: string): Promise<void> {
  await cacheDelByPattern(`${cacheKeys.programTree(orgId, "*").replace("*", "")}*`);
  await cacheDelByPattern(`helios:cache:prog:${orgId}:*`);
}

export async function invalidateExercises(orgId: string): Promise<void> {
  await cacheDel(cacheKeys.exerciseHidden(orgId));
  await cacheDelByPattern(cacheKeys.exercisePattern(orgId));
}

export async function invalidateSchedule(
  orgId: string,
  clientId: string,
): Promise<void> {
  await cacheDelByPattern(cacheKeys.schedulePattern(orgId, clientId));
}

export async function invalidateNutrition(
  orgId: string,
  clientId: string,
): Promise<void> {
  await cacheDelByPattern(cacheKeys.nutritionPattern(orgId, clientId));
}

export async function invalidatePublicCoach(slug: string): Promise<void> {
  await cacheDel(cacheKeys.publicCoach(slug));
  await cacheDelByPattern("helios:cache:coaches:pub:*");
}

export async function invalidateOrgContext(
  clerkOrgId: string,
  userId: string,
): Promise<void> {
  await cacheDel(cacheKeys.orgContext(clerkOrgId, userId));
}

export async function invalidateQuota(
  orgId: string,
  resource: string,
): Promise<void> {
  await cacheDel(cacheKeys.quota(orgId, resource));
}

export async function invalidateAllOrgQuotas(orgId: string): Promise<void> {
  await cacheDelByPattern(`helios:cache:quota:${orgId}:*`);
}
