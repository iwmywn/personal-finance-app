"use client"

import { useEffect } from "react"
import { TriangleAlertIcon } from "lucide-react"
import { useExtracted } from "next-intl"

import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry?: () => void
}) {
  const t = useExtracted()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <EmptyState
        className="w-full max-w-lg"
        icon={<TriangleAlertIcon />}
        title={t("Something went wrong!")}
        description={error.message || t("Please try again later.")}
        action={
          retry ? (
            <Button onClick={() => retry()}>{t("Try again")}</Button>
          ) : undefined
        }
      />
    </div>
  )
}
