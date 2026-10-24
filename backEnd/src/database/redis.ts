import "dotenv/config";
import { Redis } from "@upstash/redis";
import { AppError } from "../utils/errors";

let client: Redis | undefined;

export async function getRedisClient(): Promise<Redis> {
  if (!client) {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    if (!url || !token) {
      throw new AppError("Configure UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN no backend.", 503);
    }
    client = new Redis({
      url,
      token,
      automaticDeserialization: false,
      retry: false,
      signal: () => AbortSignal.timeout(5000),
    });
  }
  return client;
}
