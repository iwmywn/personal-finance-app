"use client"

import { useLocale, useTimeZone } from "next-intl"

import { formatDate } from "@/lib/date"

export function useFormatDate() {
  const locale = useLocale()
  const timeZone = useTimeZone()

  return (date: Date) => formatDate(date, locale, timeZone)
}
