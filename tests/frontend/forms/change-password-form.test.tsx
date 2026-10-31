import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"

import {
  mockAuthError,
  mockAuthSuccess,
} from "@/tests/frontend/helpers/auth-mock"
import { renderWithProviders } from "@/tests/frontend/helpers/test-providers"
import { ChangePasswordForm } from "@/components/settings/change-password-form"
import { authClient } from "@/lib/auth-client"

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    changePassword: vi.fn(),
  },
}))

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should open dialog and change password", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.changePassword).mockImplementationOnce(
      mockAuthSuccess()
    )

    renderWithProviders(<ChangePasswordForm />)

    const triggerBtn = screen.getByRole("button", {
      name: "Change Password",
    })
    await user.click(triggerBtn)

    expect(
      screen.getByRole("heading", { name: "Change Password" })
    ).toBeInTheDocument()

    const currentInput = screen.getByLabelText(/current password/i)
    const newInput = screen.getByLabelText(/^new password$/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)
    const revokeCheckbox = screen.getByLabelText(
      /sign out from all other devices/i
    )

    await user.type(currentInput, "CurrentPassword123!")
    await user.type(newInput, "NewPassword123!")
    await user.type(confirmInput, "NewPassword123!")
    await user.click(revokeCheckbox)

    const saveBtn = screen.getByRole("button", { name: /^save$/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(authClient.changePassword).toHaveBeenCalledWith(
        expect.objectContaining({
          currentPassword: "CurrentPassword123!",
          newPassword: "NewPassword123!",
          revokeOtherSessions: true,
        })
      )
      expect(toast.success).toHaveBeenCalledWith(
        "Your password has been changed."
      )
    })
  })

  it("should show validation errors when submitting empty form", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChangePasswordForm />)

    const triggerBtn = screen.getByRole("button", {
      name: "Change Password",
    })
    await user.click(triggerBtn)

    const saveBtn = screen.getByRole("button", { name: /^save$/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/current password is required/i)
      ).toBeInTheDocument()
    })
    expect(authClient.changePassword).not.toHaveBeenCalled()
  })

  it("should show error toast when current password is wrong", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.changePassword).mockImplementationOnce(
      mockAuthError({ code: "INVALID_PASSWORD" })
    )

    renderWithProviders(<ChangePasswordForm />)

    const triggerBtn = screen.getByRole("button", {
      name: "Change Password",
    })
    await user.click(triggerBtn)

    await user.type(
      screen.getByLabelText(/current password/i),
      "WrongPassword123!"
    )
    await user.type(screen.getByLabelText(/^new password$/i), "NewPassword123!")
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "NewPassword123!"
    )

    const saveBtn = screen.getByRole("button", { name: /^save$/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Current password is incorrect!")
    })
  })
})
