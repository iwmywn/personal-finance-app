"use client"

import { useTransition } from "react"
import { useExtracted, useLocale } from "next-intl"
import { toast } from "sonner"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LOCALE_CONFIG } from "@/i18n/config"
import type { Locale } from "@/i18n/config"
import { setUserLocale } from "@/i18n/locale"

export function LanguageSelector() {
  const t = useExtracted()
  const activeLocale = useLocale()
  const [isPending, startTransition] = useTransition()

  function handleLocaleChange(locale: Locale) {
    startTransition(async () => {
      try {
        await setUserLocale(locale)
        window.location.reload()
      } catch {
        toast.error(t("Failed to update language! Please try again later."))
      }
    })
  }

  return (
    <Select
      value={activeLocale}
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
