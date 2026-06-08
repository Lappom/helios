import type { PlanTier } from "@/lib/auth/types";

export type ApiRateLimits = {
  perSecond: number;
  perMinute: number;
  perHour: number;
  perDay: number;
};

export const API_RATE_LIMITS: Record<PlanTier, ApiRateLimits> = {
  STARTER: {
    perSecond: 3,
    perMinute: 30,
    perHour: 200,
    perDay: 100,
  },
  PRO: {
    perSecond: 10,
    perMinute: 60,
    perHour: 600,
    perDay: 1000,
  },
  BUSINESS: {
    perSecond: 20,
    perMinute: 120,
    perHour: 1200,
    perDay: 2000,
  },
  TEAM: {
    perSecond: 20,
    perMinute: 120,
    perHour: 1200,
    perDay: 2000,
  },
};

export function getApiRateLimits(planTier: PlanTier): ApiRateLimits {
  return API_RATE_LIMITS[planTier];
}
