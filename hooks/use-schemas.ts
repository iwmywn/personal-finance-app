"use client"

import { useSchemaMessages } from "@/contexts/schema-messages-context"
import { buildSchemas } from "@/schemas"

export function useSchemas() {
  const messages = useSchemaMessages()

  return buildSchemas(messages)
}
