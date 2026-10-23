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
    },
  }
})

vi.mock("@/env/server", () => {
  return {
    serverEnv: {
      get RECAPTCHA_SECRET() {
        return "test-recaptcha-secret"
      },
      get CRON_SECRET() {
        return "test-cron-secret"
      },
      get BETTER_AUTH_SECRET() {
        return "test-better-auth-secret"
      },
      get CURRENCY_API_SECRET() {
        return "test-currency-api-secret"
      },
      get DB_URI() {
        return process.env.DB_URI
      },
      get DB_NAME() {
        return "test-db-name"
      },
    },
  }
})

export {}
