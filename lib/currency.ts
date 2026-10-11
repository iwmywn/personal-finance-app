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
