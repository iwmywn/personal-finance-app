import "server-only"

import type { MongoClient } from "mongodb"
import {
  RateLimiterMemory,
  RateLimiterMongo,
  RateLimiterRes,
} from "rate-limiter-flexible"

import { serverEnv } from "@/env/server"
import { getClientPromise } from "@/lib/db"

export type RateLimitPreset = "NORMAL" | "MODERATE" | "STRICT"

export type RateLimitOptions = {
  points?: number
  duration?: number
}

/**
 * Standardized rate limit presets for server actions and API endpoints:
 * - NORMAL: Standard user actions (create/update transactions, budgets, goals, categories) -> 60 req/60s
 * - MODERATE: Sensitive mutations (deletions of single entities) -> 15 req/60s
 * - STRICT: Heavy mutations (cascade category deletion across 4 collections, recurring setup) -> 10 req/60s
 */
export const RATE_LIMIT_PRESETS: Record<
  RateLimitPreset,
  Required<RateLimitOptions>
> = {
  NORMAL: { points: 60, duration: 60 },
  MODERATE: { points: 15, duration: 60 },
  STRICT: { points: 10, duration: 60 },
} as const

const DEFAULT_POINTS = RATE_LIMIT_PRESETS.NORMAL.points
const DEFAULT_DURATION = RATE_LIMIT_PRESETS.NORMAL.duration

const mongoLimiters = new Map<string, RateLimiterMongo>()
const memoryLimiters = new Map<string, RateLimiterMemory>()

function getMemoryLimiter(points: number, duration: number): RateLimiterMemory {
  const key = `${points}:${duration}`
  let limiter = memoryLimiters.get(key)
  if (!limiter) {
    limiter = new RateLimiterMemory({
      points,
      duration,
      keyPrefix: `${points}_${duration}`,
    })
    memoryLimiters.set(key, limiter)
  }
  return limiter
}

function getMongoLimiter(
  client: MongoClient,
  points: number,
  duration: number
): RateLimiterMongo {
  const key = `${points}:${duration}`
  let limiter = mongoLimiters.get(key)
  if (!limiter) {
    const insuranceLimiter = getMemoryLimiter(points, duration)
    limiter = new RateLimiterMongo({
      storeClient: client,
      dbName: serverEnv.DB_NAME,
      tableName: "rateLimits",
      points,
      duration,
      keyPrefix: `${points}_${duration}`,
      insuranceLimiter,
    })
    mongoLimiters.set(key, limiter)
  }
  return limiter
}

async function resolveLimiter(
  points: number,
  duration: number
): Promise<RateLimiterMongo | RateLimiterMemory> {
  try {
    const client = await getClientPromise()
    return getMongoLimiter(client, points, duration)
  } catch {
    return getMemoryLimiter(points, duration)
  }
}

/**
 * Returns true if the key has exceeded the allowed rate limit.
 * Defaults to the NORMAL preset (60 requests / 60 seconds).
 */
export async function isRateLimited(
  key: string,
  options?: RateLimitOptions
): Promise<boolean> {
  const points = options?.points ?? DEFAULT_POINTS
  const duration = options?.duration ?? DEFAULT_DURATION
  const limiter = await resolveLimiter(points, duration)

  try {
    await limiter.consume(key)
    return false
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      return true
    }
    if (
      err &&
      typeof err === "object" &&
      ("remainingPoints" in err || "consumedPoints" in err)
    ) {
      return true
    }

    // Fail-open for unexpected internal errors so legitimate users are not blocked
    console.error("Rate limiter unexpected error:", err)
    return false
  }
}

/**
 * Manually set or trigger the rate limit for a key (useful for testing).
 * If no specific options are provided, blocks across all standard presets.
 */
export async function triggerRateLimit(
  key: string,
  optionsOrPoints?: number | RateLimitOptions,
  maybeDuration?: number
): Promise<void> {
  if (typeof optionsOrPoints === "object" && optionsOrPoints !== null) {
    const points = optionsOrPoints.points ?? DEFAULT_POINTS
    const duration = optionsOrPoints.duration ?? DEFAULT_DURATION
    const limiter = await resolveLimiter(points, duration)
    await limiter.block(key, duration)
    return
  }

  if (typeof optionsOrPoints === "number") {
    const points = optionsOrPoints
    const duration = maybeDuration ?? DEFAULT_DURATION
    const limiter = await resolveLimiter(points, duration)
    await limiter.block(key, duration)
    return
  }

  // Block across all standard presets in parallel
  const presets = [
    RATE_LIMIT_PRESETS.NORMAL,
    RATE_LIMIT_PRESETS.MODERATE,
    RATE_LIMIT_PRESETS.STRICT,
  ]

  await Promise.all(
    presets.map(async (preset) => {
      const limiter = await resolveLimiter(preset.points, preset.duration)
      await limiter.block(key, preset.duration)
    })
  )
}

/**
 * Resets the in-memory limiter caches (useful for test isolation).
 */
export function resetRateLimitStore(): void {
  mongoLimiters.clear()
  memoryLimiters.clear()
}
