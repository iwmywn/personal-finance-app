import type { Route } from "next"
import Decimal from "decimal.js"

import type { Currency } from "@/lib/currency"
import { DEFAULT_SIGNIN_REDIRECT } from "@/routes"

export const progressColorClass = {
  gray: "progress-gray",
  green: "progress-green",
  yellow: "progress-yellow",
  red: "progress-red",
} as const

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

export function convertAmountWithRates(
  amount: Decimal | string | number,
  from: Currency,
  to: Currency,
  rates?: Partial<Record<Currency, Decimal | string | number>>
): Decimal {
  const decAmount = new Decimal(amount)
  if (from === to || !rates) return decAmount

  const rateFromVal = rates[from] ?? (from === "USD" ? "1" : undefined)
  const rateToVal = rates[to] ?? (to === "USD" ? "1" : undefined)
  if (!rateFromVal || !rateToVal) return decAmount

  const rateFrom = new Decimal(rateFromVal)
  const rateTo = new Decimal(rateToVal)
  if (rateFrom.lte(0) || rateTo.lte(0)) return decAmount

  const amountInUSD = from === "USD" ? decAmount : decAmount.dividedBy(rateFrom)
  const result = to === "USD" ? amountInUSD : amountInUSD.mul(rateTo)

  return result
}

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
