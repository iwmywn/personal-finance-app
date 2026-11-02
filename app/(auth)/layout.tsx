import { Suspense } from "react"

import { ReCaptchaProvider } from "@/components/layout/recaptcha-provider"
import { Logo } from "@/components/logo"

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ReCaptchaProvider>
      <main className="flex min-h-screen items-center justify-center overflow-hidden p-6 md:p-10">
        <div className="w-full max-w-sm">
          <Suspense
            fallback={
              <div className="center h-screen">
                <Logo isLoading />
              </div>
            }
          >
            {children}
          </Suspense>
        </div>
      </main>
    </ReCaptchaProvider>
  )
}
