"use client"

import { useEffect } from "react"

import { siteConfig } from "@/app/pfa.config"

const COOKIE_NAME = siteConfig.cookies.timezone
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60

export function ClientTimezone() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!tz) return

    const match = document.cookie.match(
      new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`)
    )
    const current = match ? decodeURIComponent(match[1]) : null

    if (current !== tz) {
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(tz)}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`
    }
  }, [])

  return null
}
