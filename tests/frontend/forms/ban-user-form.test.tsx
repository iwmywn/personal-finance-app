import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"

import {
  mockAuthError,
  mockAuthSuccess,
} from "@/tests/frontend/helpers/auth-mock"
import { renderWithProviders } from "@/tests/frontend/helpers/test-providers"
import { mockUser } from "@/tests/shared/data"
import { BanUserForm } from "@/components/admin/ban-user-form"
import { authClient } from "@/lib/auth-client"
import type { User } from "@/lib/definitions"

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    admin: {
      banUser: vi.fn(),
      unbanUser: vi.fn(),
    },
  },
}))

describe("BanUserForm", () => {
  const setIsOpen = vi.fn()

  const activeTargetUser: User = {
    ...mockUser,
    id: "target-user-1",
    name: "Target User",
    banned: false,
  }

  const bannedTargetUser: User = {
    ...mockUser,
    id: "target-user-2",
    name: "Banned Target User",
    banned: true,
    banReason: "Violated terms",
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render ban form for active user and ban user", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.admin.banUser).mockImplementationOnce(
      mockAuthSuccess()
    )

    renderWithProviders(
      <BanUserForm
        user={activeTargetUser}
        isOpen={true}
        setIsOpen={setIsOpen}
      />
    )

    expect(screen.getByText("Ban User")).toBeInTheDocument()
    expect(screen.getByLabelText(/ban reason/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/duration/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/ban reason/i), "Suspected bot")

    const banBtn = screen.getByRole("button", { name: /^ban$/i })
    await user.click(banBtn)

    await waitFor(() => {
      expect(authClient.admin.banUser).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "target-user-1",
          banReason: "Suspected bot",
        })
      )
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("User has been banned.")
      expect(setIsOpen).toHaveBeenCalledWith(false)
    })
  })

  it("should render unban dialog for banned user and trigger unban", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.admin.unbanUser).mockImplementationOnce(
      mockAuthSuccess()
    )

    renderWithProviders(
      <BanUserForm
        user={bannedTargetUser}
        isOpen={true}
        setIsOpen={setIsOpen}
      />
    )

    expect(screen.getByText("Unban User")).toBeInTheDocument()
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

  it("should show error toast when banUser fails", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.admin.banUser).mockImplementationOnce(
      mockAuthError({ message: "Ban failed" })
    )

    renderWithProviders(
      <BanUserForm
        user={activeTargetUser}
        isOpen={true}
        setIsOpen={setIsOpen}
      />
    )

    await user.type(screen.getByLabelText(/ban reason/i), "Suspected bot")
    const banBtn = screen.getByRole("button", { name: /^ban$/i })
    await user.click(banBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to ban user! Please try again later."
      )
      expect(setIsOpen).not.toHaveBeenCalledWith(false)
    })
  })

  it("should show error toast when unbanUser fails", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.admin.unbanUser).mockImplementationOnce(
      mockAuthError({ message: "Unban failed" })
    )

    renderWithProviders(
      <BanUserForm
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
