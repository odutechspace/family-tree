import Redis from "ioredis";

/**
 * BullMQ requires a dedicated IORedis instance per Queue/Worker (do not share one client).
 * maxRetriesPerRequest must be null for BullMQ.
 */
export function createRedisForBullmq(): Redis {
  const url = process.env.REDIS_URL?.trim();

  if (url) {
    return new Redis(url, { maxRetriesPerRequest: null });
  }

  return new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  });
}
