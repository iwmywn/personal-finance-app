"use client"

import * as React from "react"

import type { Category } from "@/lib/definitions"

type CategoriesContextValue = {
  customCategories: Category[]
}

export const CategoriesContext =
  React.createContext<CategoriesContextValue | null>(null)

export function useCategories() {
  const context = React.useContext(CategoriesContext)
  if (!context) {
    throw new Error("useCategories must be used within a CategoriesContext")
  }
  return context
}
