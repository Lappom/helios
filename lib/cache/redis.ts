import { Redis } from "@upstash/redis";
import { logger } from "@/lib/api/logger";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token || url.includes("...")) {
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

export function isCacheEnabled(): boolean {
  return getRedisClient() !== null;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    return await redis.get<T>(key);
  } catch (error) {
    logger.warn("Cache get failed", { key, error: String(error) });
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    logger.warn("Cache set failed", { key, error: String(error) });
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  const redis = getRedisClient();
  if (!redis || keys.length === 0) {
    return;
  }

  try {
    await redis.del(...keys);
  } catch (error) {
    logger.warn("Cache del failed", { keys, error: String(error) });
  }
}

export async function cacheDelByPattern(pattern: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: pattern,
        count: 100,
      });
      cursor = Number(nextCursor);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== 0);
  } catch (error) {
    logger.warn("Cache pattern delete failed", {
      pattern,
      error: String(error),
    });
  }
}
