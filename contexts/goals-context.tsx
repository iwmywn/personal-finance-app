"use client"

import * as React from "react"

import type { Goal } from "@/lib/definitions"

type GoalsContextValue = {
  goals: Goal[]
}

export const GoalsContext = React.createContext<GoalsContextValue | null>(null)

export function useGoals() {
  const context = React.useContext(GoalsContext)
  if (!context) {
    throw new Error("useGoals must be used within a GoalsContext")
  }
  return context
}
