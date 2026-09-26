"use client"

import { useUser } from "@/contexts/user-context"
import { CURRENCY_CONFIG, formatCurrency } from "@/lib/currency"
import type { Currency } from "@/lib/currency"

export function useFormatCurrency() {
  const { user } = useUser()

  const userCurrency = user.currency as Currency

  return (amount: string, overrideCurrency?: Currency) => {
    const currency = overrideCurrency || userCurrency
    const currencyLocale = CURRENCY_CONFIG[currency].locale

    return formatCurrency(amount, currencyLocale, currency)
  }
}
