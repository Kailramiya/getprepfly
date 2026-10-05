import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { istDayStart, istDateKey } from "./utils";

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

/**
 * Spend guards for paid OpenAI calls, counted atomically in Redis.
 *  - per-user daily cap (resets at midnight IST): stops one account burning credits
 *  - global monthly cap (IST month): app-level backstop on top of the OpenAI dashboard budget
 * Tune with AI_DAILY_CAP_PER_USER (default 100) and AI_MONTHLY_CAP (default 0 = off).
 * Like the limiters above, they are skipped when Redis isn't configured.
 */
const DAILY_CAP = Number(process.env.AI_DAILY_CAP_PER_USER ?? 100);
const MONTHLY_CAP = Number(process.env.AI_MONTHLY_CAP ?? 0);

type AiReservation = { ok: true; release: () => Promise<void> } | { ok: false; response: NextResponse };

/**
 * Reserve one AI call. Call after access checks (so rejected requests cost nothing) and call
 * `release()` if the OpenAI call fails, so an outage doesn't eat the student's daily tries.
 */
export async function reserveAiCall(userId: string): Promise<AiReservation> {
  const noop: AiReservation = { ok: true, release: async () => {} };
  if (!redis || (DAILY_CAP <= 0 && MONTHLY_CAP <= 0)) return noop;

  const now = Date.now();
  const dayKey = `aicap:d:${istDateKey(now)}:${userId}`;
  const monthKey = `aicap:m:${istDateKey(now).slice(0, 7)}`;
  const secsToIstMidnight = Math.ceil((istDayStart(now).getTime() + 86400000 - now) / 1000);

  const [daily, monthly] = await redis
    .pipeline()
    .incr(dayKey).expire(dayKey, secsToIstMidnight + 3600)
    .incr(monthKey).expire(monthKey, 40 * 86400)
    .exec<[number, number, number, number]>();

  const release = async () => {
    await redis.pipeline().decr(dayKey).decr(monthKey).exec().catch(() => {});
  };

  if (DAILY_CAP > 0 && daily > DAILY_CAP) {
    await release();
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: `Daily AI scoring limit reached (${DAILY_CAP}/day). It resets at midnight IST.`, rateLimited: true },
        { status: 429, headers: { "Retry-After": String(secsToIstMidnight) } }
      ),
    };
  }
  if (MONTHLY_CAP > 0 && monthly > MONTHLY_CAP) {
    await release();
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "AI scoring is temporarily unavailable. Please try again later.", rateLimited: true },
        { status: 503 }
      ),
    };
  }
  return { ok: true, release };
}
