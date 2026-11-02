import "server-only"

import crypto from "node:crypto"

import { serverEnv } from "@/env/server"

/**
 * Validates the Authorization Bearer header against CRON_SECRET
 * using constant-time comparison to protect against timing attacks.
 */
export function verifyCronAuth(authHeader: string | null): boolean {
  if (!authHeader) return false

  const expected = Buffer.from(`Bearer ${serverEnv.CRON_SECRET}`)
  const actual = Buffer.from(authHeader)

  if (expected.length !== actual.length) {
    return false
  }

  return crypto.timingSafeEqual(actual, expected)
}
