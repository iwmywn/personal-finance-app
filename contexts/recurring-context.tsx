"use client"

import * as React from "react"

import type { RecurringTransaction } from "@/lib/definitions"

type RecurringContextValue = {
  recurringTransactions: RecurringTransaction[]
}

export const RecurringContext =
  React.createContext<RecurringContextValue | null>(null)

export function useRecurring() {
  const context = React.useContext(RecurringContext)
  if (!context) {
    throw new Error("useRecurring must be used within a RecurringContext")
  }
  return context
}
