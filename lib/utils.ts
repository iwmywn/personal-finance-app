import type { Route } from "next"
import Decimal from "decimal.js"

import type { RollupHealth } from "@/lib/valuation-engine"
import { DEFAULT_SIGNIN_REDIRECT } from "@/routes"

export const progressColorClass = {
  gray: "progress-gray",
  green: "progress-green",
  yellow: "progress-yellow",
  red: "progress-red",
} as const

export function getRollupHealthClass(health: RollupHealth): string {
  switch (health) {
    case "unstarted":
      return progressColorClass.gray
    case "on_track":
      return progressColorClass.green
    case "warning":
      return progressColorClass.yellow
    case "exceeded":
      return progressColorClass.red
  }
}

export function getFlowColorClass(
  type?: "inflow" | "outflow" | string | null
): string {
  if (type === "inflow") return "text-green"
  if (type === "outflow") return "text-red"
  return ""
}

export function getBalanceColorClass(balance?: Decimal.Value | null): string {
  if (balance === undefined || balance === null || balance === "") return ""
  try {
    const dec = new Decimal(balance)
    if (dec.greaterThan(0)) return "text-green"
    if (dec.lessThan(0)) return "text-red"
  } catch {
    return ""
  }
  return ""
}

export function toDecimal(value: string): Decimal {
  return new Decimal(value)
}

export { convertAmountWithRates } from "@/lib/currency"

export function getSafeCallbackUrl(
  url: string | null | undefined,
  fallback: Route = DEFAULT_SIGNIN_REDIRECT
): Route {
  if (!url) return fallback

  if (
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.includes("\\") &&
    !url.includes(":")
  ) {
    return url as Route
  }

  return fallback
}

export function isUserBanned(
  user:
    | {
        banned?: boolean | null
        banExpires?: Date | string | number | null
      }
    | null
    | undefined,
  now: Date = new Date()
): boolean {
  if (!user || !user.banned) return false
  if (!user.banExpires) return true
  const expireTime = new Date(user.banExpires).getTime()
  if (Number.isNaN(expireTime)) return true
  return expireTime > now.getTime()
}
