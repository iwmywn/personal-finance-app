"use server"

import { cache } from "react"
import { cookies, headers } from "next/headers"

import { siteConfig } from "@/app/pfa.config"
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/config"
import type { Locale } from "@/i18n/config"
import { auth } from "@/lib/auth"

const COOKIE_NAME = siteConfig.cookies.locale

export const getUserLocale = cache(async (): Promise<Locale> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (session?.user.locale && LOCALES.includes(session.user.locale as Locale)) {
    return session.user.locale as Locale
  }

  const cookieLocale = (await cookies()).get(COOKIE_NAME)?.value
  if (cookieLocale && LOCALES.includes(cookieLocale as Locale))
    return cookieLocale as Locale

  return DEFAULT_LOCALE
})

const fourHundredDays = 400 * 24 * 60 * 60

// Setting locale is intentionally public for guest visitors before authentication.
// react-doctor-disable-next-line react-doctor/server-auth-actions
export async function setUserLocale(locale: Locale): Promise<void> {
  if (!LOCALES.includes(locale)) return

  const cookieStore = await cookies()
  if (cookieStore.get(COOKIE_NAME)?.value === locale) return

  cookieStore.set(COOKIE_NAME, locale, {
    sameSite: "lax",
    path: "/",
    maxAge: fourHundredDays,
  })
}
