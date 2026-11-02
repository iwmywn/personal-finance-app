"use client"

import { AlertCircleIcon } from "lucide-react"
import { useExtracted } from "next-intl"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { useUser } from "@/contexts/user-context"
import type { Transaction } from "@/lib/definitions"

export function UnconvertedTransactionsAlert({
  transactions,
}: {
  transactions?: Transaction[]
}) {
  const t = useExtracted()
  const { user } = useUser()

  const shouldShow = transactions
    ? transactions.some((t) => t.currency !== user.currency)
    : true

  if (!shouldShow) return null

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
