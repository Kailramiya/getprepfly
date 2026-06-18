import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting backed by Upstash Redis (works across serverless instances).
 *
 * If UPSTASH_REDIS_REST_URL / _TOKEN are not configured (e.g. local dev),
 * every limiter is null and checks are skipped — the app stays usable, it just
 * isn't rate limited. Configure both env vars in production.
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

if (!redis && process.env.NODE_ENV === "production") {
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL/_TOKEN not set — rate limiting is DISABLED in production."
  );
}

function make(limit: number, window: Parameters<typeof Ratelimit.slidingWindow>[1], prefix: string) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: `rl:${prefix}`,
    analytics: false,
  });
}

/**
 * Named limiters. Tune the numbers per endpoint sensitivity:
 *  - ai: expensive OpenAI calls — keep tight
 *  - auth: brute-force / enumeration protection — per IP
 *  - lookup: GPT-backed vocab lookup — moderate
 *  - questions: anti-scraping of the question bank — generous but bounded
 */
export const limiters = {
  ai: make(20, "1 m", "ai"),
  auth: make(10, "1 m", "auth"),
  lookup: make(30, "1 m", "lookup"),
  questions: make(120, "1 m", "questions"),
};

export type LimiterName = keyof typeof limiters;

/**
 * Extract a best-effort client IP from the request headers.
 */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Enforce a named rate limit for `identifier` (a user id or IP).
 * Returns a 429 NextResponse when the limit is exceeded, otherwise null.
 *
 *   const limited = await enforceRateLimit("ai", user.id);
 *   if (limited) return limited;
 */
export async function enforceRateLimit(
  name: LimiterName,
  identifier: string
): Promise<NextResponse | null> {
  const limiter = limiters[name];
  if (!limiter) return null; // not configured — allow

  const { success, reset } = await limiter.limit(identifier);
  if (success) return null;

  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return NextResponse.json(
    {
      success: false,
      error: "Too many requests. Please slow down and try again shortly.",
      rateLimited: true,
      retryAfter,
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/**
 * Lightweight boolean check for use outside Next route handlers
 * (e.g. inside the NextAuth credentials authorize()).
 */
export async function isRateLimited(name: LimiterName, identifier: string): Promise<boolean> {
  const limiter = limiters[name];
  if (!limiter) return false;
  const { success } = await limiter.limit(identifier);
  return !success;
}
