"use client"

import "./globals.css"

import { useEffect } from "react"
import { TriangleAlertIcon } from "lucide-react"

import { fontDisplay, fontMono } from "@/app/fonts"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/empty-state"
import { ThemeProvider } from "@/components/layout/theme-provider"

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry?: () => void
}) {
  useEffect(() => {
    console.error("Global Error:", error)
  }, [error])

  return (
    <html
      lang="en-US"
      suppressHydrationWarning
      className={`${fontDisplay.variable} ${fontMono.variable} ${fontMono.className}`}
    >
      <body className="bg-background text-primary antialiased">
        <ThemeProvider>
          <main className="flex min-h-screen items-center justify-center p-6">
            <EmptyState
              className="w-full max-w-lg"
              icon={<TriangleAlertIcon />}
              title="Something went wrong!"
              description={
                error.message ||
                "A critical system error occurred. Please try again."
              }
              action={
                retry ? (
                  <Button onClick={() => retry()}>Try again</Button>
                ) : undefined
              }
            />
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
