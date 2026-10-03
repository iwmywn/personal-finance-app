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
import { LOCALE_CONFIG } from "@/i18n/config"
import type { Locale } from "@/i18n/config"
import { setUserLocale } from "@/i18n/locale"
import { authClient } from "@/lib/auth-client"

export function LanguageSelector() {
  const t = useExtracted()
  const [isPending, startTransition] = useTransition()
  const { user } = useUser()

  function handleLocaleChange(locale: Locale) {
    startTransition(async () => {
      try {
        await authClient.updateUser({
          locale,
          fetchOptions: {
            onError: () => {
              toast.error(
                t("Failed to update language! Please try again later.")
              )
            },
            onSuccess: async () => {
              await setUserLocale(locale)
              window.location.reload()
            },
          },
        })
      } catch {
        toast.error(t("Failed to update language! Please try again later."))
      }
    })
  }

  return (
    <Select
      value={user.locale}
      onValueChange={handleLocaleChange}
      disabled={isPending}
    >
      <SelectTrigger>
        <SelectValue placeholder={t("Language")} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(LOCALE_CONFIG).map(([locale, config]) => (
          <SelectItem key={locale} value={locale}>
            {config.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
