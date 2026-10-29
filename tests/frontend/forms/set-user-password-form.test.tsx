import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"

import {
  mockAuthError,
  mockAuthSuccess,
} from "@/tests/frontend/helpers/auth-mock"
import { renderWithProviders } from "@/tests/frontend/helpers/test-providers"
import { mockUser } from "@/tests/shared/data"
import { SetUserPasswordForm } from "@/components/admin/set-user-password-form"
import { authClient } from "@/lib/auth-client"

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    admin: {
      setUserPassword: vi.fn(),
    },
  },
}))

describe("SetUserPasswordForm", () => {
  const setIsOpen = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render password reset dialog and submit new password", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.admin.setUserPassword).mockImplementationOnce(
      mockAuthSuccess()
    )

    renderWithProviders(
      <SetUserPasswordForm
        user={mockUser}
        isOpen={true}
        setIsOpen={setIsOpen}
      />
    )

    expect(screen.getByText("Reset User Password")).toBeInTheDocument()
    const passwordInput = screen.getByLabelText(/new password/i)
    await user.type(passwordInput, "NewSecurePassword123!")

    const saveBtn = screen.getByRole("button", { name: /^update$/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(authClient.admin.setUserPassword).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          newPassword: "NewSecurePassword123!",
        })
      )
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Password has been updated.")
      expect(setIsOpen).toHaveBeenCalledWith(false)
    })
  })

  it("should show validation error when submitting empty password", async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <SetUserPasswordForm
        user={mockUser}
        isOpen={true}
        setIsOpen={setIsOpen}
      />
    )

    const saveBtn = screen.getByRole("button", { name: /^update$/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
    expect(authClient.admin.setUserPassword).not.toHaveBeenCalled()
  })

  it("should show error toast when setUserPassword fails", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.admin.setUserPassword).mockImplementationOnce(
      mockAuthError({ message: "Server error" })
    )

    renderWithProviders(
      <SetUserPasswordForm
        user={mockUser}
        isOpen={true}
        setIsOpen={setIsOpen}
      />
    )

    const passwordInput = screen.getByLabelText(/new password/i)
    await user.type(passwordInput, "NewSecurePassword123!")

    const saveBtn = screen.getByRole("button", { name: /^update$/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to set user password! Please try again later."
      )
    })
  })
})
