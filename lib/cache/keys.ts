const PREFIX = "helios:cache";

export const cacheKeys = {
  programTree: (orgId: string, programId: string) =>
    `${PREFIX}:prog:${orgId}:${programId}`,
  exerciseList: (orgId: string, queryHash: string) =>
    `${PREFIX}:ex:list:${orgId}:${queryHash}`,
  exerciseHidden: (orgId: string) => `${PREFIX}:ex:hidden:${orgId}`,
  schedule: (orgId: string, clientId: string, rangeKey: string) =>
    `${PREFIX}:sched:${orgId}:${clientId}:${rangeKey}`,
  nutrition: (orgId: string, clientId: string, dateKey: string) =>
    `${PREFIX}:nutri:${orgId}:${clientId}:${dateKey}`,
  publicCoach: (slug: string) => `${PREFIX}:coach:pub:${slug}`,
  publicCoaches: (queryHash: string) => `${PREFIX}:coaches:pub:${queryHash}`,
  orgContext: (clerkOrgId: string, userId: string) =>
    `${PREFIX}:orgctx:${clerkOrgId}:${userId}`,
  quota: (orgId: string, resource: string) =>
    `${PREFIX}:quota:${orgId}:${resource}`,
  orgPattern: (orgId: string) => `${PREFIX}:*:${orgId}:*`,
  programPattern: (orgId: string, programId: string) =>
    `${PREFIX}:prog:${orgId}:${programId}`,
  schedulePattern: (orgId: string, clientId: string) =>
    `${PREFIX}:sched:${orgId}:${clientId}:*`,
  nutritionPattern: (orgId: string, clientId: string) =>
    `${PREFIX}:nutri:${orgId}:${clientId}:*`,
  exercisePattern: (orgId: string) => `${PREFIX}:ex:*:${orgId}:*`,
} as const;

export function hashQuery(params: Record<string, unknown>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${String(params[k] ?? "")}`)
    .join("&");
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    hash = (hash << 5) - hash + sorted.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
