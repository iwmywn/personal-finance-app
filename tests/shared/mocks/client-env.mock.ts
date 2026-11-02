vi.mock("@/env/client", () => {
  return {
    clientEnv: {
      get NEXT_PUBLIC_URL() {
        return "http://localhost:3000"
      },
      get NEXT_PUBLIC_NODE_ENV() {
        return "development"
      },
      get NEXT_PUBLIC_RECAPTCHA() {
        return "test-recaptcha"
      },
      get NEXT_PUBLIC_DISABLE_CAPTCHA() {
        return undefined
      },
    },
    isCaptchaDisabled: () => false,
  }
})
