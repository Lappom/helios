import type { PlanTier } from "@/lib/auth/types";
import type { subscriptionStatusEnum } from "@/lib/db/schema/enums";

export type QuotaType =
  | "clients"
  | "ai"
  | "api"
  | "notifications"
  | "exerciseVideo"
  | "vodVideo"
  | "driveFile"
  | "driveStorage";

export type SubscriptionStatus =
  (typeof subscriptionStatusEnum.enumValues)[number];

export const PLAN_LIMITS: Record<
  PlanTier,
  Record<QuotaType, number>
> = {
  STARTER: {
    clients: 5,
    ai: 500,
    api: 500,
    notifications: 200,
    exerciseVideo: 250 * 1024 * 1024,
    vodVideo: 250 * 1024 * 1024,
    driveFile: 100 * 1024 * 1024,
    driveStorage: 5 * 1024 * 1024 * 1024,
  },
  PRO: {
    clients: 50,
    ai: 5000,
    api: 5000,
    notifications: 1000,
    exerciseVideo: 500 * 1024 * 1024,
    vodVideo: 500 * 1024 * 1024,
    driveFile: 250 * 1024 * 1024,
    driveStorage: 25 * 1024 * 1024 * 1024,
  },
  BUSINESS: {
    clients: 500,
    ai: 10000,
    api: 10000,
    notifications: 5000,
    exerciseVideo: 1024 * 1024 * 1024,
    vodVideo: 1024 * 1024 * 1024,
    driveFile: 500 * 1024 * 1024,
    driveStorage: 100 * 1024 * 1024 * 1024,
  },
  TEAM: {
    clients: Number.POSITIVE_INFINITY,
    ai: Number.POSITIVE_INFINITY,
    api: 10000,
    notifications: Number.POSITIVE_INFINITY,
    exerciseVideo: 2 * 1024 * 1024 * 1024,
    vodVideo: 2 * 1024 * 1024 * 1024,
    driveFile: 2 * 1024 * 1024 * 1024,
    driveStorage: 500 * 1024 * 1024 * 1024,
  },
};

const CLERK_PLAN_SLUG_MAP: Record<string, PlanTier> = {
  starter: "STARTER",
  pro: "PRO",
  business: "BUSINESS",
  team: "TEAM",
};

const CLERK_STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  cancelled: "CANCELED",
};

export function mapClerkPlanSlugToTier(slug: string): PlanTier {
  const normalized = slug.toLowerCase().replace(/_plan$/, "");
  return CLERK_PLAN_SLUG_MAP[normalized] ?? "STARTER";
}

export function mapClerkSubscriptionStatus(status: string): SubscriptionStatus {
  return CLERK_STATUS_MAP[status.toLowerCase()] ?? "TRIALING";
}

export function getPlanLimit(planTier: PlanTier, quota: QuotaType): number {
  return PLAN_LIMITS[planTier][quota];
}

export function getExerciseVideoLimitMb(planTier: PlanTier): number {
  return Math.round(getPlanLimit(planTier, "exerciseVideo") / (1024 * 1024));
}

export function getVodVideoLimitMb(planTier: PlanTier): number {
  return Math.round(getPlanLimit(planTier, "vodVideo") / (1024 * 1024));
}

export function getDriveFileLimitMb(planTier: PlanTier): number {
  return Math.round(getPlanLimit(planTier, "driveFile") / (1024 * 1024));
}

export function getDriveStorageLimitGb(planTier: PlanTier): number {
  return Math.round(getPlanLimit(planTier, "driveStorage") / (1024 * 1024 * 1024));
}

export const CLERK_FEATURE_SLUGS = [
  "habits",
  "group_messaging",
  "automations",
  "api_access",
  "client_branding",
  "advanced_ai",
  "team_coaches",
  "custom_session_feedback",
  "recurring_questionnaires",
  "coaching_journeys",
  "shop",
  "referral_program",
  "priority_support",
] as const;

export type ClerkFeature = (typeof CLERK_FEATURE_SLUGS)[number];
