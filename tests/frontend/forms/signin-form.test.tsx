import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"

import {
  mockAuthError,
  mockAuthSuccess,
} from "@/tests/frontend/helpers/auth-mock"
import { renderWithProviders } from "@/tests/frontend/helpers/test-providers"
import { SignInForm } from "@/components/auth/signin-form"
import { authClient } from "@/lib/auth-client"

const mockExecuteRecaptcha = vi.fn().mockResolvedValue("mock-captcha-token")

vi.mock("react-google-recaptcha-v3", () => ({
  useGoogleReCaptcha: () => ({
    executeRecaptcha: mockExecuteRecaptcha,
  }),
}))

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      username: vi.fn(),
    },
    getSession: vi.fn(),
  },
}))

vi.mock("@/i18n/locale", () => ({
  setUserLocale: vi.fn(),
}))

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExecuteRecaptcha.mockResolvedValue("mock-captcha-token")
  })

  it("should render sign-in form with all fields", () => {
    renderWithProviders(<SignInForm />)

    expect(
      screen.getByText("Sign In", { selector: "[data-slot=card-title]" })
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /^sign in$/i })
    ).toBeInTheDocument()
  })

  it("should display validation errors when submitting empty form", async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignInForm />)

    const submitBtn = screen.getByRole("button", { name: /^sign in$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument()
    })
    expect(authClient.signIn.username).not.toHaveBeenCalled()
  })

  it("should submit credentials and trigger captcha on valid submit", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.signIn.username).mockImplementationOnce(
      mockAuthSuccess({ twoFactorRedirect: false })
    )

    renderWithProviders(<SignInForm />)

    const usernameInput = screen.getByLabelText(/username/i)
    const passwordInput = screen.getByLabelText(/password/i)

    await user.type(usernameInput, "johndoe")
    await user.type(passwordInput, "ValidPassword123!")

    const submitBtn = screen.getByRole("button", { name: /^sign in$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockExecuteRecaptcha).toHaveBeenCalledWith("sign_in")
      expect(authClient.signIn.username).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "johndoe",
          password: "ValidPassword123!",
          fetchOptions: expect.objectContaining({
            headers: { "x-captcha-response": "mock-captcha-token" },
          }),
        })
      )
    })
  })

  it("should handle invalid credentials error from authClient", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.signIn.username).mockImplementationOnce(
      mockAuthError({ code: "INVALID_USERNAME_OR_PASSWORD" }, 401)
    )

    renderWithProviders(<SignInForm />)

    await user.type(screen.getByLabelText(/username/i), "wronguser")
    await user.type(screen.getByLabelText(/password/i), "WrongPassword123!")

    await user.click(screen.getByRole("button", { name: /^sign in$/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid username or password!")
    })
  })
})
