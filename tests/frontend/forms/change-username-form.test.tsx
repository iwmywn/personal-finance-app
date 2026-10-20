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
import { ChangeUsernameForm } from "@/components/settings/change-username-form"
import { authClient } from "@/lib/auth-client"

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    updateUser: vi.fn(),
    isUsernameAvailable: vi.fn(),
  },
}))

describe("ChangeUsernameForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should open dialog, check availability, and update username", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.isUsernameAvailable).mockResolvedValueOnce({
      data: { available: true },
      error: null,
    } as never)
    vi.mocked(authClient.updateUser).mockImplementationOnce(mockAuthSuccess())

    renderWithProviders(<ChangeUsernameForm />, {
      user: { ...mockUser, username: "olduser" },
    })

    const triggerBtn = screen.getByRole("button", {
      name: "Change Username",
    })
    await user.click(triggerBtn)

    expect(
      screen.getByRole("heading", { name: "Change Username" })
    ).toBeInTheDocument()
    const usernameInput = screen.getByRole("textbox", { name: "Username" })
    expect(usernameInput).toHaveValue("olduser")

    await user.clear(usernameInput)
    await user.type(usernameInput, "newuser")

    const saveBtn = screen.getByRole("button", { name: /^save$/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(authClient.isUsernameAvailable).toHaveBeenCalledWith({
        username: "newuser",
      })
      expect(authClient.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "newuser",
        })
      )
      expect(toast.success).toHaveBeenCalledWith(
        "Your username has been changed."
      )
    })
  })

  it("should show error if username is already taken", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.isUsernameAvailable).mockResolvedValueOnce({
      data: { available: false },
      error: null,
    } as never)

    renderWithProviders(<ChangeUsernameForm />, {
      user: { ...mockUser, username: "olduser" },
    })

    const triggerBtn = screen.getByRole("button", {
      name: "Change Username",
    })
    await user.click(triggerBtn)

    const usernameInput = screen.getByRole("textbox", { name: "Username" })
    await user.clear(usernameInput)
    await user.type(usernameInput, "takenuser")

    const saveBtn = screen.getByRole("button", { name: /^save$/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "This username is already taken."
      )
    })
    expect(authClient.updateUser).not.toHaveBeenCalled()
  })

  it("should show error toast when checking username availability fails", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.isUsernameAvailable).mockResolvedValueOnce({
      data: null,
      error: { message: "Network error" },
    } as never)

    renderWithProviders(<ChangeUsernameForm />, {
      user: { ...mockUser, username: "olduser" },
    })

    const triggerBtn = screen.getByRole("button", {
      name: "Change Username",
    })
    await user.click(triggerBtn)

    const usernameInput = screen.getByRole("textbox", { name: "Username" })
    await user.clear(usernameInput)
    await user.type(usernameInput, "newuser")

    const saveBtn = screen.getByRole("button", { name: /^save$/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to check username availability! Please try again later."
      )
    })
    expect(authClient.updateUser).not.toHaveBeenCalled()
  })

  it("should show error toast when updateUser fails", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.isUsernameAvailable).mockResolvedValueOnce({
      data: { available: true },
      error: null,
    } as never)
    vi.mocked(authClient.updateUser).mockImplementationOnce(
      mockAuthError({ code: "UNKNOWN_ERROR" })
    )

    renderWithProviders(<ChangeUsernameForm />, {
      user: { ...mockUser, username: "olduser" },
    })

    const triggerBtn = screen.getByRole("button", {
      name: "Change Username",
    })
    await user.click(triggerBtn)

    const usernameInput = screen.getByRole("textbox", { name: "Username" })
    await user.clear(usernameInput)
    await user.type(usernameInput, "newuser")

    const saveBtn = screen.getByRole("button", { name: /^save$/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to update username! Please try again later."
      )
    })
  })
})
