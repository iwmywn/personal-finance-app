import Decimal from "decimal.js"

import type { Locale } from "@/i18n/config"

export const CURRENCIES = ["USD", "CNY", "JPY", "KRW", "VND"] as const

export type Currency = (typeof CURRENCIES)[number]

export const DEFAULT_CURRENCY: Currency = "VND"

type CurrencyConfig = {
  [K in Currency]: {
    displayName: string
    locale: Locale
    decimals: number
  }
}

export const CURRENCY_CONFIG: CurrencyConfig = {
  USD: {
    displayName: "US Dollar ($)",
    locale: "en-US",
    decimals: 2,
  },
  CNY: {
    displayName: "人民币 (¥)",
    locale: "zh-CN",
    decimals: 2,
  },
  JPY: {
    displayName: "日本円 (¥)",
    locale: "ja-JP",
    decimals: 0,
  },
  KRW: {
    displayName: "대한민국 원 (₩)",
    locale: "ko-KR",
    decimals: 0,
  },
  VND: {
    displayName: "Việt Nam đồng (₫)",
    locale: "vi-VN",
    decimals: 0,
  },
}

export function formatCurrency(
  amount: string | number | null | undefined,
  locale: Locale,
  currency: Currency
): string {
  let safeAmount: number | string = 0
  if (typeof amount === "number") {
    safeAmount = Number.isFinite(amount) ? amount : 0
  } else if (typeof amount === "string") {
    const trimmed = amount.trim()
    if (trimmed !== "" && !Number.isNaN(Number(trimmed))) {
      safeAmount = trimmed
    }
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(safeAmount as unknown as number)
}

export function convertAmountWithRates(
  amount: Decimal | string | number,
  from: Currency,
  to: Currency,
  rates?:
    | Partial<Record<Currency, Decimal | string | number>>
    | Record<string, Decimal | string | number>
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

export function resolveTransactionAmount(
  t: {
    amount: string
    currency: string
    originalAmount?: string
    originalCurrency?: string
    rates?: Record<string, string>
  },
  targetCurrency?: Currency
): Decimal | null {
  if (!targetCurrency || t.currency === targetCurrency) {
    return new Decimal(t.amount)
  }

  const originalAmount = t.originalAmount ?? t.amount
  const originalCurrency = (t.originalCurrency ?? t.currency) as Currency

  if (originalCurrency === targetCurrency) {
    return new Decimal(originalAmount)
  }

  if (t.rates && originalCurrency && targetCurrency) {
    const rateFrom =
      t.rates[originalCurrency] ??
      (originalCurrency === "USD" ? "1" : undefined)
    const rateTo =
      t.rates[targetCurrency] ?? (targetCurrency === "USD" ? "1" : undefined)
    if (rateFrom && rateTo) {
      return convertAmountWithRates(
        originalAmount,
        originalCurrency,
        targetCurrency,
        t.rates
      )
    }
  }

  return null
}
