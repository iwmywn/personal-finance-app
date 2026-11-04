import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderWithProviders } from "@/tests/frontend/helpers/test-providers"
import { mockSession } from "@/tests/shared/data"
import { getLocationFromIP } from "@/actions/location.actions"
import { getSessions, revokeSessionById } from "@/actions/session.actions"
import { ActiveSessionsManager } from "@/components/settings/active-sessions-manager"
import type { Session } from "@/lib/definitions"

vi.mock("@/actions/session.actions", () => ({
  getSessions: vi.fn(),
  revokeSessionById: vi.fn(),
}))

vi.mock("@/actions/location.actions", () => ({
  getLocationFromIP: vi.fn(),
}))

vi.mock("@/actions/revalidate.actions", () => ({
  revalidateCoreLayout: vi.fn(),
}))

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    revokeSessions: vi.fn(),
    revokeOtherSessions: vi.fn(),
    admin: {
      stopImpersonating: vi.fn(),
    },
  },
}))

describe("ActiveSessionsManager", () => {
  const otherSession1: Session = {
    ...mockSession,
    id: "session-other-1",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    ipAddress: "1.1.1.1",
  }

  const otherSession2: Session = {
    ...mockSession,
    id: "session-other-2",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
    ipAddress: "2.2.2.2",
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getLocationFromIP).mockResolvedValue("Test Location")
    vi.mocked(getSessions).mockResolvedValue({
      sessions: [mockSession, otherSession1, otherSession2],
    })
  })

  it("should open dialog and display active sessions", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ActiveSessionsManager />)

    const triggerButton = screen.getByRole("button", {
      name: "View Active Sessions",
    })
    await user.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Terminate" })).toHaveLength(
        3
      )
    })
  })

  it("should disable all Terminate buttons and guard dialog dismissal while termination is in flight", async () => {
    const user = userEvent.setup()
    let resolveRevoke: (value: { success: string }) => void = () => {}
    const revokePromise = new Promise<{ success: string }>((resolve) => {
      resolveRevoke = resolve
    })
    vi.mocked(revokeSessionById).mockReturnValue(revokePromise)

    renderWithProviders(<ActiveSessionsManager />)

    await user.click(
      screen.getByRole("button", { name: "View Active Sessions" })
    )

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Terminate" })).toHaveLength(
        3
      )
    })

    const terminateButtons = screen.getAllByRole("button", {
      name: "Terminate",
    })
    const terminateAllButton = screen.getByRole("button", {
      name: "Terminate All",
    })

    // Click Terminate on otherSession1
    await user.click(terminateButtons[1])

    // While in flight, all Terminate buttons and Terminate All must be disabled
    expect(terminateButtons[0]).toBeDisabled()
    expect(terminateButtons[1]).toBeDisabled()
    expect(terminateButtons[2]).toBeDisabled()
    expect(terminateAllButton).toBeDisabled()

    // Dismissal guard: attempting to close dialog during in-flight request should be ignored
    // Escape key press:
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    // Now resolve the in-flight termination request
    resolveRevoke({ success: "Session terminated." })

    await waitFor(() => {
      // otherSession1 is removed, so 2 terminate buttons remain
      expect(screen.getAllByRole("button", { name: "Terminate" })).toHaveLength(
        2
      )
    })

    // Remaining buttons and Terminate All should be re-enabled
    const remainingButtons = screen.getAllByRole("button", {
      name: "Terminate",
    })
    expect(remainingButtons[0]).not.toBeDisabled()
    expect(remainingButtons[1]).not.toBeDisabled()
    expect(
      screen.getByRole("button", { name: "Terminate All" })
    ).not.toBeDisabled()

    // Dialog dismissal should now succeed
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("should re-enable buttons and clear dismissal guard when termination fails", async () => {
    const user = userEvent.setup()
    let rejectRevoke: (reason?: unknown) => void = () => {}
    const revokePromise = new Promise<{ success: string }>((_, reject) => {
      rejectRevoke = reject
    })
    vi.mocked(revokeSessionById).mockReturnValue(revokePromise)

    renderWithProviders(<ActiveSessionsManager />)

    await user.click(
      screen.getByRole("button", { name: "View Active Sessions" })
    )

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Terminate" })).toHaveLength(
        3
      )
    })

    const terminateButtons = screen.getAllByRole("button", {
      name: "Terminate",
    })
    await user.click(terminateButtons[1])

    expect(terminateButtons[0]).toBeDisabled()
    expect(terminateButtons[1]).toBeDisabled()

    rejectRevoke(new Error("Network failure"))

    await waitFor(() => {
      expect(terminateButtons[0]).not.toBeDisabled()
      expect(terminateButtons[1]).not.toBeDisabled()
      expect(
        screen.getByRole("button", { name: "Terminate All" })
      ).not.toBeDisabled()
    })

    // Dialog can be dismissed
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })
})
