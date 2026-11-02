"use client"

import { useTransition } from "react"
import { useExtracted } from "next-intl"
import { toast } from "sonner"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUser } from "@/contexts/user-context"
import { authClient } from "@/lib/auth-client"
import { CURRENCY_CONFIG } from "@/lib/currency"
import type { Currency } from "@/lib/currency"

export function CurrencySelector() {
  const t = useExtracted()
  const [isPending, startTransition] = useTransition()
  const { user } = useUser()

  function handleCurrencyChange(currency: Currency) {
    startTransition(async () => {
      try {
        await authClient.updateUser({
          currency,
          fetchOptions: {
            onError: () => {
              toast.error(
                t("Failed to update currency! Please try again later.")
              )
            },
            onSuccess: async () => {
              window.location.reload()
            },
          },
        })
      } catch {
        toast.error(t("Failed to update currency! Please try again later."))
      }
    })
  }

  return (
    <Select
      value={user.currency}
      onValueChange={handleCurrencyChange}
      disabled={isPending}
    >
      <SelectTrigger>
        <SelectValue placeholder={t("Currency")} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(CURRENCY_CONFIG).map(([currency, config]) => (
          <SelectItem key={currency} value={currency}>
            {config.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
