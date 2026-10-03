"use server"

import { cache } from "react"
import { cookies } from "next/headers"

import { siteConfig } from "@/app/pfa.config"

const COOKIE_NAME = siteConfig.cookies.timezone
const DEFAULT_TIMEZONE = "UTC"

export const getUserTimezone = cache(async (): Promise<string> => {
  const cookieTimezone = (await cookies()).get(COOKIE_NAME)?.value

  if (cookieTimezone) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: cookieTimezone })
      return cookieTimezone
    } catch {
      // Invalid timezone, fallback to default
    }
  }

  return DEFAULT_TIMEZONE
})
