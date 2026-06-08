import { cacheGet, cacheSet } from "./redis";

export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const value = await fetcher();
  await cacheSet(key, value, ttlSeconds);
  return value;
}
