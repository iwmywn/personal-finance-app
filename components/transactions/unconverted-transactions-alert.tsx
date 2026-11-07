"use client"

import { AlertCircleIcon } from "lucide-react"
import { useExtracted } from "next-intl"

import { Alert, AlertDescription } from "@/components/ui/alert"

export function UnconvertedTransactionsAlert({
  hasUnconverted,
}: {
  hasUnconverted: boolean
}) {
  const t = useExtracted()

  if (!hasUnconverted) return null

  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertDescription>
        {t(
          "Some transactions are pending exchange rates and are displayed in their original currency."
        )}
      </AlertDescription>
    </Alert>
  )
}
