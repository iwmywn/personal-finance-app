"use client"

import { useLocale } from "next-intl"
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3"

import { clientEnv } from "@/env/client"

export function ReCaptchaProvider({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = useLocale()

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={clientEnv.NEXT_PUBLIC_RECAPTCHA}
      language={locale}
    >
      {children}
    </GoogleReCaptchaProvider>
  )
}
