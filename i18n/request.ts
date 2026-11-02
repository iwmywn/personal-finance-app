import { getRequestConfig } from "next-intl/server"

import { getUserLocale } from "@/i18n/locale"
import { getUserTimezone } from "@/i18n/timezone"

export default getRequestConfig(async () => {
  const [locale, timeZone] = await Promise.all([
    getUserLocale(),
    getUserTimezone(),
  ])

  return {
    locale,
    timeZone,
    messages: (await import(`@/messages/${locale}.po`)).default,
  }
})
