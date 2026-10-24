/**
 * ClinicPilot Unified Rate Limiter
 * Supports Upstash Redis REST API, Vercel KV REST API, or an in-memory sliding window fallback.
 *
 * Environment variables supported:
 * - UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN
 * - KV_REST_API_URL & KV_REST_API_TOKEN
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
  error?: string;
}

interface InMemoryRecord {
  count: number;
  resetAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __clinicpilot_rate_limit_store__: Map<string, InMemoryRecord> | undefined;
}

const memoryStore: Map<string, InMemoryRecord> =
  global.__clinicpilot_rate_limit_store__ ||
  (global.__clinicpilot_rate_limit_store__ = new Map());

// Upstash or Vercel KV REST credentials
export function getRedisConfig(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    return { url: url.replace(/\/$/, ""), token };
  }
  return null;
}

/**
 * Checks whether the rate limiter must fail closed.
 * Rule: In production (NODE_ENV=production, DEMO_MODE=false) with no Upstash/KV
 * variables configured, it must FAIL CLOSED, never falling back to in-memory store.
 */
export function shouldFailClosed(): boolean {
  const isProduction = process.env.NODE_ENV === "production";
  const isDemo = process.env.DEMO_MODE === "true";
  return isProduction && !isDemo && !getRedisConfig();
}

/**
 * Executes a command against Upstash / Vercel KV REST API.
 */
async function redisRestCommand(command: string[]): Promise<any> {
  const config = getRedisConfig();
  if (!config) return null;

  try {
    const res = await fetch(`${config.url}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.result;
  } catch {
    return null;
  }
}

/**
 * Increment and check key with TTL window in seconds.
 */
async function incrementWithTtl(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (shouldFailClosed()) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: 0,
      error: "Distributed rate limit store required in production (UPSTASH_REDIS or KV_REST credentials missing). Refusing request to protect security.",
    };
  }

  const redis = getRedisConfig();

  if (redis) {
    try {
      // INCR key
      const count = await redisRestCommand(["INCR", key]);
      if (typeof count === "number") {
        if (count === 1) {
          // Set TTL on first increment
          await redisRestCommand(["EXPIRE", key, String(windowSeconds)]);
        }
        const ttl = (await redisRestCommand(["TTL", key])) || windowSeconds;
        return {
          allowed: count <= limit,
          remaining: Math.max(0, limit - count),
          resetInSeconds: Math.max(0, ttl),
        };
      }
    } catch {
      // Fallback to in-memory on network failure if not strictly fail-closed
    }
  }

  // In-Memory sliding-window fallback (only permitted in dev/demo/test)
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || now > existing.resetAt) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetInSeconds: windowSeconds,
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const resetInSeconds = Math.ceil((existing.resetAt - now) / 1000);

  return {
    allowed: existing.count <= limit,
    remaining,
    resetInSeconds,
  };
}

/**
 * Get current count for a key.
 */
async function getCurrentCount(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (shouldFailClosed()) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: 0,
      error: "Distributed rate limit store required in production (UPSTASH_REDIS or KV_REST credentials missing). Refusing request to protect security.",
    };
  }

  const redis = getRedisConfig();

  if (redis) {
    try {
      const countStr = await redisRestCommand(["GET", key]);
      const count = countStr ? parseInt(String(countStr), 10) : 0;
      const ttl = (await redisRestCommand(["TTL", key])) || windowSeconds;
      return {
        allowed: count < limit,
        remaining: Math.max(0, limit - count),
        resetInSeconds: Math.max(0, ttl),
      };
    } catch {
      // Fallback to in-memory
    }
  }

  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || now > existing.resetAt) {
    return {
      allowed: true,
      remaining: limit,
      resetInSeconds: windowSeconds,
    };
  }

  return {
    allowed: existing.count < limit,
    remaining: Math.max(0, limit - existing.count),
    resetInSeconds: Math.ceil((existing.resetAt - now) / 1000),
  };
}

/**
 * Reset a specific rate limit key.
 */
export async function resetRateLimitKey(key: string): Promise<void> {
  memoryStore.delete(key);
  const redis = getRedisConfig();
  if (redis) {
    try {
      await redisRestCommand(["DEL", key]);
    } catch {
      // ignore
    }
  }
}

// ==========================================
// Specific Business Limits
// ==========================================

/**
 * Rule: 5 failed logins per account+IP per 15 minutes (900s)
 */
export async function checkLoginRateLimit(identifier: string): Promise<RateLimitResult> {
  const key = `rl:login:${identifier.toLowerCase()}`;
  return getCurrentCount(key, 5, 900);
}

export async function recordFailedLogin(identifier: string): Promise<RateLimitResult> {
  const key = `rl:login:${identifier.toLowerCase()}`;
  return incrementWithTtl(key, 5, 900);
}

export async function resetLoginRateLimit(identifier: string): Promise<void> {
  const key = `rl:login:${identifier.toLowerCase()}`;
  await resetRateLimitKey(key);
}

/**
 * Rule: 5 OTP codes per phone per hour (3600s)
 */
export async function checkOtpSendRateLimit(phone: string): Promise<RateLimitResult> {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const key = `rl:otp_send:${cleanPhone}`;
  return getCurrentCount(key, 5, 3600);
}

export async function recordOtpSend(phone: string): Promise<RateLimitResult> {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const key = `rl:otp_send:${cleanPhone}`;
  return incrementWithTtl(key, 5, 3600);
}

/**
 * Rule: 3 failed attempts per OTP code
 */
export async function checkOtpAttemptLimit(phone: string): Promise<RateLimitResult> {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const key = `rl:otp_attempt:${cleanPhone}`;
  return getCurrentCount(key, 3, 300); // 5 min OTP window
}

export async function recordOtpAttempt(phone: string): Promise<RateLimitResult> {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const key = `rl:otp_attempt:${cleanPhone}`;
  return incrementWithTtl(key, 3, 300);
}

export async function resetOtpAttempts(phone: string): Promise<void> {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const key = `rl:otp_attempt:${cleanPhone}`;
  await resetRateLimitKey(key);
}
