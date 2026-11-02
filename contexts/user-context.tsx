"use client"

import * as React from "react"

import type { Session, User } from "@/lib/definitions"

type UserContextValue = {
  user: User
  session: Session
}

export const UserContext = React.createContext<UserContextValue | null>(null)

export function useUser() {
  const context = React.useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within a UserContext")
  }
  return context
}
