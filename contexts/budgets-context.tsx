"use client"

import * as React from "react"

import type { Budget } from "@/lib/definitions"

type BudgetsContextValue = {
  budgets: Budget[]
}

export const BudgetsContext = React.createContext<BudgetsContextValue | null>(
  null
)

export function useBudgets() {
  const context = React.useContext(BudgetsContext)
  if (!context) {
    throw new Error("useBudgets must be used within a BudgetsContext")
  }
  return context
}
