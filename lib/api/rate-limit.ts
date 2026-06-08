import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { PlanTier } from "@/lib/auth/types";
import { logger } from "@/lib/api/logger";
import { problem } from "@/lib/api/response";
import { getApiRateLimits } from "@/lib/integrations/limits";

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (ratelimit) {
    return ratelimit;
  }

  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token || url.includes("...")) {
    return null;
  }

  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(120, "1 m"),
    analytics: true,
    prefix: "helios:ratelimit",
  });

  return ratelimit;
}

export async function enforceRateLimit(
  key: string,
): Promise<RateLimitResult | null> {
  const limiter = getRatelimit();

  if (!limiter) {
    logger.warn("Rate limiting disabled: Upstash Redis not configured");
    return null;
  }

  const result = await limiter.limit(key);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

export function rateLimitKeyFromRequest(
  request: Request,
  orgId?: string,
): string {
  if (orgId) {
    return `org:${orgId}`;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "anonymous";
  return `ip:${ip}`;
}

export function assertRateLimitAllowed(
  result: RateLimitResult | null,
): void {
  if (!result || result.success) {
    return;
  }

  throw problem({
    type: "rate-limit-exceeded",
    title: "Too many requests",
    status: 429,
    detail: "Rate limit exceeded. Please retry later.",
  });
}

type ApiRateLimiterSet = {
  second: Ratelimit;
  minute: Ratelimit;
  hour: Ratelimit;
  day: Ratelimit;
};

const apiRateLimiters = new Map<PlanTier, ApiRateLimiterSet>();

function getRedisClient(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token || url.includes("...")) {
    return null;
  }

  return new Redis({ url, token });
}

function getApiRateLimiterSet(planTier: PlanTier): ApiRateLimiterSet | null {
  const cached = apiRateLimiters.get(planTier);
  if (cached) {
    return cached;
  }

  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  const limits = getApiRateLimits(planTier);
  const set: ApiRateLimiterSet = {
    second: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limits.perSecond, "1 s"),
      prefix: `helios:api:${planTier}:s`,
    }),
    minute: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limits.perMinute, "1 m"),
      prefix: `helios:api:${planTier}:m`,
    }),
    hour: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limits.perHour, "1 h"),
      prefix: `helios:api:${planTier}:h`,
    }),
    day: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limits.perDay, "1 d"),
      prefix: `helios:api:${planTier}:d`,
    }),
  };

  apiRateLimiters.set(planTier, set);
  return set;
}

export async function enforceApiRateLimits(
  organizationId: string,
  planTier: PlanTier,
): Promise<void> {
  const limiters = getApiRateLimiterSet(planTier);

  if (!limiters) {
    logger.warn("API rate limiting disabled: Upstash Redis not configured");
    return;
  }

  const key = `org:${organizationId}`;
  const checks = await Promise.all([
    limiters.second.limit(key),
    limiters.minute.limit(key),
    limiters.hour.limit(key),
    limiters.day.limit(key),
  ]);

  const failed = checks.find((result) => !result.success);
  if (failed) {
    throw problem({
      type: "rate-limit-exceeded",
      title: "Too many requests",
      status: 429,
      detail: "API rate limit exceeded. Please retry later.",
    });
  }
}
