"use server"

import { cache } from "react"
import { headers } from "next/headers"
import { getExtracted } from "next-intl/server"

import { auth } from "@/lib/auth"
import type { ActionResponse, Session, User } from "@/lib/definitions"
import { isRateLimited, RATE_LIMIT_PRESETS } from "@/lib/rate-limit"
import { isAdminRole } from "@/lib/role"

/**
 * Get current active session.
 */
export const getSession = cache(
  async (
    requireAdmin: boolean = false
  ): Promise<
    | { error: string; user?: never; session?: never }
    | { error?: never; user: User; session: Session }
  > => {
    const t = await getExtracted()

    try {
      const headersList = await headers()
      const session = await auth.api.getSession({
        headers: headersList,
      })

      if (!session)
        return {
          error: t("Access denied! Please refresh the page and try again."),
        }

      if (requireAdmin && !isAdminRole(session.user.role)) {
        return {
          error: t("Access denied! Admin privileges required."),
        }
      }

      return {
        user: session.user,
        session: {
          ...session.session,
          token: "",
        },
      }
    } catch (error) {
      console.error("Error getting session: ", error)
      return { error: t("Failed to get session! Please try again later.") }
    }
  }
)

/**
 * List all active sessions.
 */
export const getSessions = cache(
  async (): Promise<
    { error: string; sessions?: never } | { error?: never; sessions: Session[] }
  > => {
    const t = await getExtracted()

    try {
      const headersList = await headers()
      const sessions = await auth.api.listSessions({
        headers: headersList,
      })

      if (!sessions)
        return {
          error: t("Access denied! Please refresh the page and try again."),
        }

      return {
        sessions: sessions.map((session) => ({
          ...session,
          token: "",
        })),
      }
    } catch (error) {
      console.error("Error getting sessions: ", error)
      return { error: t("Failed to get session! Please try again later.") }
    }
  }
)

export async function revokeSessionById(
  sessionId: string
): Promise<ActionResponse> {
  const t = await getExtracted()

  try {
    const headersList = await headers()
    const sessions = await auth.api.listSessions({
      headers: headersList,
    })

    const targetSession = sessions?.find((s) => s.id === sessionId)
    if (!targetSession) {
      return { error: t("Session not found.") }
    }

    if (
      await isRateLimited(
        `session:revoke:${targetSession.userId}`,
        RATE_LIMIT_PRESETS.MODERATE
      )
    ) {
      return {
        error: t("Too many requests! Please slow down and try again later."),
      }
    }

    await auth.api.revokeSession({
      body: {
        token: targetSession.token,
      },
      headers: headersList,
    })

    return { success: t("Session terminated.") }
  } catch (error) {
    console.error("Error revoking session: ", error)
    return { error: t("Failed to terminate session! Please try again later.") }
  }
}
