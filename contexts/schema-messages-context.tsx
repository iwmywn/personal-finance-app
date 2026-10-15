"use client"

import * as React from "react"

import type { SchemaMessages } from "@/schemas/messages"

export const SchemaMessagesContext = React.createContext<SchemaMessages | null>(
  null
)

export function useSchemaMessages() {
  const context = React.useContext(SchemaMessagesContext)
  if (!context) {
    throw new Error(
      "useSchemaMessages must be used within a SchemaMessagesContext"
    )
  }
  return context
}
