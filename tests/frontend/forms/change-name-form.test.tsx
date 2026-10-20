import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  mockAuthError,
  mockAuthSuccess,
} from "@/tests/frontend/helpers/auth-mock"
import { renderWithProviders } from "@/tests/frontend/helpers/test-providers"
import { mockUser } from "@/tests/shared/data"
import { ChangeNameForm } from "@/components/settings/change-name-form"
import { authClient } from "@/lib/auth-client"

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    updateUser: vi.fn(),
  },
}))

describe("ChangeNameForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should open dialog and update user name", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.updateUser).mockImplementationOnce(mockAuthSuccess())

    renderWithProviders(<ChangeNameForm />, {
      user: { ...mockUser, name: "Old Name" },
    })

    const triggerBtn = screen.getByRole("button", { name: "Change Name" })
    await user.click(triggerBtn)

    expect(
      screen.getByRole("heading", { name: "Change Name" })
    ).toBeInTheDocument()
    const nameInput = screen.getByRole("textbox", { name: "Name" })
    expect(nameInput).toHaveValue("Old Name")

    await user.clear(nameInput)
    await user.type(nameInput, "New Name")

    const saveBtn = screen.getByRole("button", { name: /^save$/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(authClient.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Name",
        })
      )
      expect(toast.success).toHaveBeenCalledWith("Your name has been updated.")
    })
  })

  it("should show validation error when submitting empty name", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChangeNameForm />, {
      user: { ...mockUser, name: "Old Name" },
    })

    const triggerBtn = screen.getByRole("button", { name: "Change Name" })
    await user.click(triggerBtn)

    const nameInput = screen.getByRole("textbox", { name: "Name" })
    await user.clear(nameInput)

    const saveBtn = screen.getByRole("button", { name: /^save$/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
    expect(authClient.updateUser).not.toHaveBeenCalled()
  })

  it("should show error toast when updateUser fails", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.updateUser).mockImplementationOnce(
      mockAuthError({ message: "Network error" })
    )

    renderWithProviders(<ChangeNameForm />, {
      user: { ...mockUser, name: "Old Name" },
    })

    const triggerBtn = screen.getByRole("button", { name: "Change Name" })
    await user.click(triggerBtn)

    const nameInput = screen.getByRole("textbox", { name: "Name" })
    await user.clear(nameInput)
    await user.type(nameInput, "New Name")

    const saveBtn = screen.getByRole("button", { name: /^save$/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to update name! Please try again later."
      )
    })
  })
})
