import { connect } from "@/lib/db"
import {
  isRateLimited,
  RATE_LIMIT_PRESETS,
  resetRateLimitStore,
  triggerRateLimit,
} from "@/lib/rate-limit"

describe("Rate Limiter (RateLimiterMongo + RateLimiterMemory fallback)", () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it("should enforce limit when requests exceed points threshold", async () => {
    const key = "user-test"
    const opts = { points: 3, duration: 10 }

    expect(await isRateLimited(key, opts)).toBe(false) // 1st
    expect(await isRateLimited(key, opts)).toBe(false) // 2nd
    expect(await isRateLimited(key, opts)).toBe(false) // 3rd
    expect(await isRateLimited(key, opts)).toBe(true) // 4th (exceeds limit)
    expect(await isRateLimited(key, opts)).toBe(true) // 5th (exceeds limit)
  })

  it("should enforce tiered presets correctly", async () => {
    const keyNormal = "user-preset-normal"
    const keyStrict = "user-preset-strict"

    for (let i = 0; i < 10; i++) {
      expect(await isRateLimited(keyStrict, RATE_LIMIT_PRESETS.STRICT)).toBe(
        false
      )
    }
    expect(await isRateLimited(keyStrict, RATE_LIMIT_PRESETS.STRICT)).toBe(true)

    expect(await isRateLimited(keyNormal, RATE_LIMIT_PRESETS.NORMAL)).toBe(
      false
    )
  })

  it("should allow manual trigger via triggerRateLimit", async () => {
    const key = "user-manual-trigger"
    await triggerRateLimit(key, 5, 10)

    expect(await isRateLimited(key, { points: 5, duration: 10 })).toBe(true)
  })

  it("should block across all presets when triggerRateLimit called without options", async () => {
    const key = "user-block-all"
    await triggerRateLimit(key)

    expect(await isRateLimited(key, RATE_LIMIT_PRESETS.NORMAL)).toBe(true)
    expect(await isRateLimited(key, RATE_LIMIT_PRESETS.MODERATE)).toBe(true)
    expect(await isRateLimited(key, RATE_LIMIT_PRESETS.STRICT)).toBe(true)
  })

  it("should track separate keys independently", async () => {
    const opts = { points: 2, duration: 10 }

    expect(await isRateLimited("user-A", opts)).toBe(false)
    expect(await isRateLimited("user-A", opts)).toBe(false)
    expect(await isRateLimited("user-A", opts)).toBe(true)

    // user-B should still be allowed
    expect(await isRateLimited("user-B", opts)).toBe(false)
    expect(await isRateLimited("user-B", opts)).toBe(false)
    expect(await isRateLimited("user-B", opts)).toBe(true)
  })

  it("should reset count after duration expires", async () => {
    vi.useFakeTimers()
    const key = "user-expiry"
    const opts = { points: 2, duration: 5 }

    expect(await isRateLimited(key, opts)).toBe(false)
    expect(await isRateLimited(key, opts)).toBe(false)
    expect(await isRateLimited(key, opts)).toBe(true)

    // Advance time past the 5-second window
    vi.advanceTimersByTime(5_001)

    // Should be allowed again
    expect(await isRateLimited(key, opts)).toBe(false)
  })

  it("should clear all records when store is reset", async () => {
    const key = "user-clear"
    const opts = { points: 1, duration: 10 }

    expect(await isRateLimited(key, opts)).toBe(false)
    expect(await isRateLimited(key, opts)).toBe(true)

    const db = await connect()
    await db.collection("actionRateLimits").deleteMany({})
    resetRateLimitStore()

    expect(await isRateLimited(key, opts)).toBe(false)
  })
})
