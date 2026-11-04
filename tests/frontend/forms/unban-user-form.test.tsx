import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"

import {
  mockAuthError,
  mockAuthSuccess,
} from "@/tests/frontend/helpers/auth-mock"
import { renderWithProviders } from "@/tests/frontend/helpers/test-providers"
import { mockUser } from "@/tests/shared/data"
import { UnbanUserForm } from "@/components/admin/unban-user-form"
import { authClient } from "@/lib/auth-client"
import type { User } from "@/lib/definitions"

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    admin: {
      unbanUser: vi.fn(),
    },
  },
}))

describe("UnbanUserForm", () => {
  const setIsOpen = vi.fn()

  const bannedTargetUser: User = {
    ...mockUser,
    id: "target-user-2",
    name: "Banned Target User",
    banned: true,
    banReason: "Violated terms",
    banExpires: new Date("2026-12-31T00:00:00.000Z"),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render unban dialog for banned user and trigger unban", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.admin.unbanUser).mockImplementationOnce(
      mockAuthSuccess()
    )

    renderWithProviders(
      <UnbanUserForm
        user={bannedTargetUser}
        isOpen={true}
        setIsOpen={setIsOpen}
      />
    )

    expect(screen.getByText("Unban User")).toBeInTheDocument()
    expect(screen.getByText(/Violated terms/)).toBeInTheDocument()
    expect(screen.getByText(/Expires on/)).toBeInTheDocument()

    const unbanBtn = screen.getByRole("button", { name: /^unban$/i })
    await user.click(unbanBtn)

    await waitFor(() => {
      expect(authClient.admin.unbanUser).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "target-user-2",
        })
      )
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("User has been unbanned.")
      expect(setIsOpen).toHaveBeenCalledWith(false)
    })
  })

  it("should show error toast when unbanUser fails", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.admin.unbanUser).mockImplementationOnce(
      mockAuthError({ message: "Unban failed" })
    )

    renderWithProviders(
      <UnbanUserForm
        user={bannedTargetUser}
        isOpen={true}
        setIsOpen={setIsOpen}
      />
    )

    const unbanBtn = screen.getByRole("button", { name: /^unban$/i })
    await user.click(unbanBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to update ban status! Please try again later."
      )
      expect(setIsOpen).not.toHaveBeenCalledWith(false)
    })
  })
})
