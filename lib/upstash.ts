import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

/**
 * Lazy Upstash Redis client. Reads env at call time so routes that don't
 * touch Redis never initialise it.
 */
export function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set"
      );
    }
    _redis = new Redis({ url, token });
  }
  return _redis;
}

/**
 * Returns today's UTC date as YYYY-MM-DD. Used as the key suffix for the
 * daily challenge and leaderboard so everyone around the world gets the
 * same puzzle when it's the same UTC day.
 */
export function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

export const KEYS = {
  dailySeed: (date: string) => `audiovisa:daily:${date}:seed`,
  dailyBoard: (date: string) => `audiovisa:daily:${date}:board`,
  challenge: (id: string) => `audiovisa:challenge:${id}`,
};
