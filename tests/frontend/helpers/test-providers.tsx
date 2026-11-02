import * as React from "react"
import { render } from "@testing-library/react"
import type { RenderOptions } from "@testing-library/react"

import { mockSession, mockUser } from "@/tests/shared/data"
import { CategoriesContext } from "@/contexts/categories-context"
import { SchemaMessagesContext } from "@/contexts/schema-messages-context"
import { UserContext } from "@/contexts/user-context"
import type { Category, Session, User } from "@/lib/definitions"
import { getSchemaMessages } from "@/schemas/messages"
import type { SchemaMessages } from "@/schemas/messages"

export const defaultTestSchemaMessages: SchemaMessages =
  await getSchemaMessages()

export interface TestProviderOptions {
  user?: User
  session?: Session
  schemaMessages?: SchemaMessages
  customCategories?: Category[]
}

export function createTestWrapper(options?: TestProviderOptions) {
  const user = options?.user ?? mockUser
  const session = options?.session ?? mockSession
  const schemaMessages = options?.schemaMessages ?? defaultTestSchemaMessages
  const customCategories = options?.customCategories ?? []

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <UserContext.Provider value={{ user, session }}>
        <SchemaMessagesContext.Provider value={schemaMessages}>
          <CategoriesContext.Provider value={{ customCategories }}>
            {children}
          </CategoriesContext.Provider>
        </SchemaMessagesContext.Provider>
      </UserContext.Provider>
    )
  }
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: TestProviderOptions & Omit<RenderOptions, "wrapper">
) {
  const { user, session, schemaMessages, customCategories, ...renderOptions } =
    options ?? {}

  return render(ui, {
    wrapper: createTestWrapper({
      user,
      session,
      schemaMessages,
      customCategories,
    }),
    ...renderOptions,
  })
}
