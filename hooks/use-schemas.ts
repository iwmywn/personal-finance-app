"use client"

import { buildSchemas } from "@/schemas"
import { useSchemaMessages } from "@/contexts/schema-messages-context"

export function useSchemas() {
  const messages = useSchemaMessages()

  return buildSchemas(messages)
}
