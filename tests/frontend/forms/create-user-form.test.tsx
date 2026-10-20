import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { mockAuthSuccess } from "@/tests/frontend/helpers/auth-mock"
import { renderWithProviders } from "@/tests/frontend/helpers/test-providers"
import { CreateUserForm } from "@/components/admin/create-user-form"
import { authClient } from "@/lib/auth-client"

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    isUsernameAvailable: vi.fn(),
    admin: {
      createUser: vi.fn(),
    },
  },
}))

describe("CreateUserForm", () => {
  const setIsOpen = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render create user dialog with fields", () => {
    renderWithProviders(<CreateUserForm isOpen={true} setIsOpen={setIsOpen} />)

    expect(screen.getByText("Create New User")).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^add$/i })).toBeInTheDocument()
  })

  it("should validate required fields when submitting empty form", async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateUserForm isOpen={true} setIsOpen={setIsOpen} />)

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
    expect(authClient.admin.createUser).not.toHaveBeenCalled()
  })

  it("should submit new user creation when valid", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.isUsernameAvailable).mockResolvedValueOnce({
      data: { available: true },
      error: null,
    } as never)
    vi.mocked(authClient.admin.createUser).mockImplementationOnce(
      mockAuthSuccess()
    )

    renderWithProviders(<CreateUserForm isOpen={true} setIsOpen={setIsOpen} />)

    await user.type(screen.getByLabelText(/full name/i), "Alice Admin")
    await user.type(screen.getByLabelText(/username/i), "alice_admin")
    await user.type(screen.getByLabelText(/email/i), "alice@example.com")
    await user.type(screen.getByLabelText(/password/i), "StrongPassword123!")

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(authClient.admin.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Alice Admin",
          email: "alice@example.com",
          password: "StrongPassword123!",
          data: expect.objectContaining({
            username: "alice_admin",
            emailVerified: true,
          }),
        })
      )
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("User has been created.")
      expect(setIsOpen).toHaveBeenCalledWith(false)
    })
  })

  it("should show error if username is not available", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.isUsernameAvailable).mockResolvedValueOnce({
      data: { available: false },
      error: null,
    } as never)

    renderWithProviders(<CreateUserForm isOpen={true} setIsOpen={setIsOpen} />)

    await user.type(screen.getByLabelText(/full name/i), "Alice Admin")
    await user.type(screen.getByLabelText(/username/i), "alice_admin")
    await user.type(screen.getByLabelText(/email/i), "alice@example.com")
    await user.type(screen.getByLabelText(/password/i), "StrongPassword123!")

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "This username is already taken."
      )
    })
    expect(authClient.admin.createUser).not.toHaveBeenCalled()
  })
})
