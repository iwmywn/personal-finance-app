import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  mockAuthError,
  mockAuthSuccess,
} from "@/tests/frontend/helpers/auth-mock"
import { renderWithProviders } from "@/tests/frontend/helpers/test-providers"
import { TwoFactorForm } from "@/components/auth/two-factor-form"
import { authClient } from "@/lib/auth-client"

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    twoFactor: {
      verifyTotp: vi.fn(),
    },
    getSession: vi.fn(),
  },
}))

vi.mock("@/i18n/locale", () => ({
  setUserLocale: vi.fn(),
}))

describe("TwoFactorForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render 2FA code input and trust device checkbox", () => {
    renderWithProviders(<TwoFactorForm />)

    expect(
      screen.getByText("Two-Factor Authentication", {
        selector: "[data-slot=card-title]",
      })
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/trust this device/i)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /^verify$/i })
    ).toBeInTheDocument()
  })

  it("should validate verification code format", async () => {
    const user = userEvent.setup()
    renderWithProviders(<TwoFactorForm />)

    const codeInput = screen.getByLabelText(/verification code/i)
    await user.type(codeInput, "abcdef")

    const submitBtn = screen.getByRole("button", { name: /^verify$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/code can only contain digits/i)
      ).toBeInTheDocument()
    })
    expect(authClient.twoFactor.verifyTotp).not.toHaveBeenCalled()
  })

  it("should call verifyTotp with code and trustDevice checkbox value", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.twoFactor.verifyTotp).mockImplementationOnce(
      mockAuthSuccess()
    )

    renderWithProviders(<TwoFactorForm />)

    const codeInput = screen.getByLabelText(/verification code/i)
    const trustCheckbox = screen.getByLabelText(/trust this device/i)

    await user.type(codeInput, "123456")
    await user.click(trustCheckbox)

    const submitBtn = screen.getByRole("button", { name: /^verify$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(authClient.twoFactor.verifyTotp).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "123456",
          trustDevice: true,
        })
      )
    })
  })

  it("should handle invalid code error", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.twoFactor.verifyTotp).mockImplementationOnce(
      mockAuthError({ code: "INVALID_CODE" })
    )

    renderWithProviders(<TwoFactorForm />)

    await user.type(screen.getByLabelText(/verification code/i), "999999")
    await user.click(screen.getByRole("button", { name: /^verify$/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid authentication code!")
    })
  })
})
