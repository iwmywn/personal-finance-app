"use client"

import * as React from "react"

import type { Transaction } from "@/lib/definitions"

type TransactionsContextValue = {
  transactions: Transaction[]
}

export const TransactionsContext =
  React.createContext<TransactionsContextValue | null>(null)

export function useTransactions() {
  const context = React.useContext(TransactionsContext)
  if (!context) {
    throw new Error("useTransactions must be used within a TransactionsContext")
  }
  return context
}
