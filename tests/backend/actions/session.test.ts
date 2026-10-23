import type * as React from "react"
import { headers } from "next/headers"

import { mockAdminUser, mockSession, mockUser } from "@/tests/shared/data"
import {
  getSession,
  getSessions,
  revokeSessionById,
} from "@/actions/session.actions"
import { auth } from "@/lib/auth"
import type { Session } from "@/lib/definitions"
import { triggerRateLimit } from "@/lib/rate-limit"

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
      listSessions: vi.fn(),
      revokeSession: vi.fn(),
    },
  },
}))

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof React>()
  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  }
})

describe("Session", () => {
  beforeEach(() => {
    vi.mocked(headers).mockResolvedValue(
      new Headers({ "user-agent": "test-agent" })
    )
  })

  describe("getSession", () => {
    it("should handle error and return generic failure when headers() throws", async () => {
      vi.mocked(headers).mockRejectedValueOnce(new Error("Headers unavailable"))

      const result = await getSession()

      expect(result.error).toBe(
        "Failed to get session! Please try again later."
      )
      expect(auth.api.getSession).not.toHaveBeenCalled()
      expect(result.user).toBeUndefined()
      expect(result.session).toBeUndefined()
    })

    it("should handle error and return generic failure when auth.api.getSession throws", async () => {
      vi.mocked(auth.api.getSession).mockRejectedValueOnce(
        new Error("Database connection lost")
      )

      const result = await getSession()

      expect(result.error).toBe(
        "Failed to get session! Please try again later."
      )
      expect(result.user).toBeUndefined()
      expect(result.session).toBeUndefined()
    })

    it("should return access denied error when session is null", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(null)

      const result = await getSession()

      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
      expect(result.user).toBeUndefined()
      expect(result.session).toBeUndefined()
    })

    it("should return access denied error when requireAdmin is true but user is not admin", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: mockUser,
        session: mockSession,
      })

      const result = await getSession(true)

      expect(result.error).toBe("Access denied! Admin privileges required.")
      expect(result.user).toBeUndefined()
      expect(result.session).toBeUndefined()
    })

    it("should return access denied error when requireAdmin is true and user has an unknown role", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: { ...mockUser, role: "guest" },
        session: mockSession,
      })

      const result = await getSession(true)

      expect(result.error).toBe("Access denied! Admin privileges required.")
      expect(result.user).toBeUndefined()
      expect(result.session).toBeUndefined()
    })

    it("should return user and sanitized session for authenticated user", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: mockUser,
        session: mockSession,
      })

      const result = await getSession()

      expect(result.error).toBeUndefined()
      expect(result.user).toEqual(mockUser)
      expect(result.session).toBeDefined()
      expect(result.session?.id).toBe(mockSession.id)
      expect(result.session?.userId).toBe(mockSession.userId)
      // Regression check: token must be stripped
      expect(result.session?.token).toBe("")
      expect(result.session?.token).not.toBe(mockSession.token)
    })

    it("should allow regular user when requireAdmin is explicitly false", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: mockUser,
        session: mockSession,
      })

      const result = await getSession(false)

      expect(result.error).toBeUndefined()
      expect(result.user).toEqual(mockUser)
      expect(result.session?.token).toBe("")
    })

    it("should return user and session when requireAdmin is true and user is admin", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: mockAdminUser,
        session: mockSession,
      })

      const result = await getSession(true)

      expect(result.error).toBeUndefined()
      expect(result.user).toEqual(mockAdminUser)
      expect(result.session?.token).toBe("")
    })
  })

  describe("getSessions", () => {
    it("should handle error and return generic failure when headers() throws", async () => {
      vi.mocked(headers).mockRejectedValueOnce(new Error("Headers failed"))

      const result = await getSessions()

      expect(result.error).toBe(
        "Failed to get session! Please try again later."
      )
      expect(auth.api.listSessions).not.toHaveBeenCalled()
      expect(result.sessions).toBeUndefined()
    })

    it("should handle error and return generic failure when auth.api.listSessions throws", async () => {
      vi.mocked(auth.api.listSessions).mockRejectedValueOnce(
        new Error("Auth service unavailable")
      )

      const result = await getSessions()

      expect(result.error).toBe(
        "Failed to get session! Please try again later."
      )
      expect(result.sessions).toBeUndefined()
    })

    it("should return access denied error when listSessions returns null", async () => {
      // @ts-expect-error - Testing null response
      vi.mocked(auth.api.listSessions).mockResolvedValueOnce(null)

      const result = await getSessions()

      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
      expect(result.sessions).toBeUndefined()
    })

    it("should return sanitized active sessions list", async () => {
      const secondMockSession: Session = {
        ...mockSession,
        id: "session-2",
        token: "second-secret-token-456",
        userAgent: "Mobile Safari",
      }

      vi.mocked(auth.api.listSessions).mockResolvedValueOnce([
        mockSession,
        secondMockSession,
      ])

      const result = await getSessions()

      expect(result.error).toBeUndefined()
      expect(result.sessions).toHaveLength(2)
      expect(result.sessions?.[0]?.id).toBe("session-1")
      expect(result.sessions?.[0]?.token).toBe("")
      expect(result.sessions?.[1]?.id).toBe("session-2")
      expect(result.sessions?.[1]?.token).toBe("")
      // Regression check: verify real tokens are never exposed
      expect(result.sessions?.map((s) => s.token)).toEqual(["", ""])
    })

    it("should return empty list when no active sessions exist", async () => {
      vi.mocked(auth.api.listSessions).mockResolvedValueOnce([])

      const result = await getSessions()

      expect(result.error).toBeUndefined()
      expect(result.sessions).toEqual([])
    })
  })

  describe("revokeSessionById", () => {
    it("should handle error when headers() throws", async () => {
      vi.mocked(headers).mockRejectedValueOnce(new Error("Headers failed"))

      const result = await revokeSessionById("session-1")

      expect(result.error).toBe(
        "Failed to terminate session! Please try again later."
      )
      expect(auth.api.listSessions).not.toHaveBeenCalled()
      expect(auth.api.revokeSession).not.toHaveBeenCalled()
      expect(result.success).toBeUndefined()
    })

    it("should handle error when auth.api.listSessions throws", async () => {
      vi.mocked(auth.api.listSessions).mockRejectedValueOnce(
        new Error("Network failure")
      )

      const result = await revokeSessionById("session-1")

      expect(result.error).toBe(
        "Failed to terminate session! Please try again later."
      )
      expect(auth.api.revokeSession).not.toHaveBeenCalled()
      expect(result.success).toBeUndefined()
    })

    it("should return session not found error when sessionId does not exist in active sessions", async () => {
      vi.mocked(auth.api.listSessions).mockResolvedValueOnce([mockSession])

      const result = await revokeSessionById("non-existent-session-id")

      expect(result.error).toBe("Session not found.")
      expect(auth.api.revokeSession).not.toHaveBeenCalled()
      expect(result.success).toBeUndefined()
    })

    it("should return error when rate limit is exceeded in revokeSessionById", async () => {
      vi.mocked(auth.api.listSessions).mockResolvedValueOnce([mockSession])
      await triggerRateLimit(`session:revoke:${mockSession.userId}`)

      const result = await revokeSessionById(mockSession.id)

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Too many requests! Please slow down and try again later."
      )
      expect(auth.api.revokeSession).not.toHaveBeenCalled()
    })

    it("should return session not found error when listSessions returns null", async () => {
      // @ts-expect-error - Testing null response
      vi.mocked(auth.api.listSessions).mockResolvedValueOnce(null)

      const result = await revokeSessionById("session-1")

      expect(result.error).toBe("Session not found.")
      expect(auth.api.revokeSession).not.toHaveBeenCalled()
      expect(result.success).toBeUndefined()
    })

    it("should return session not found error when empty string sessionId is provided", async () => {
      vi.mocked(auth.api.listSessions).mockResolvedValueOnce([mockSession])

      const result = await revokeSessionById("")

      expect(result.error).toBe("Session not found.")
      expect(auth.api.revokeSession).not.toHaveBeenCalled()
      expect(result.success).toBeUndefined()
    })

    it("should handle error when auth.api.revokeSession throws", async () => {
      vi.mocked(auth.api.listSessions).mockResolvedValueOnce([mockSession])
      vi.mocked(auth.api.revokeSession).mockRejectedValueOnce(
        new Error("Revoke failed on auth server")
      )

      const result = await revokeSessionById(mockSession.id)

      expect(result.error).toBe(
        "Failed to terminate session! Please try again later."
      )
      expect(result.success).toBeUndefined()
    })

    it("should successfully revoke session by finding matching ID and sending token", async () => {
      const targetSession: Session = {
        ...mockSession,
        id: "target-session-to-revoke",
        token: "target-token-to-revoke",
      }
      const otherSession: Session = {
        ...mockSession,
        id: "other-session",
        token: "other-token",
      }

      vi.mocked(auth.api.listSessions).mockResolvedValueOnce([
        otherSession,
        targetSession,
      ])
      vi.mocked(auth.api.revokeSession).mockResolvedValueOnce({
        status: true,
      })

      const result = await revokeSessionById("target-session-to-revoke")

      expect(result.error).toBeUndefined()
      expect(result.success).toBe("Session terminated.")
      expect(auth.api.revokeSession).toHaveBeenCalledTimes(1)
      expect(auth.api.revokeSession).toHaveBeenCalledWith({
        body: {
          token: "target-token-to-revoke",
        },
        headers: expect.any(Headers),
      })
    })
  })
})
