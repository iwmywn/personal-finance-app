import {
  E2E_DEFAULT_PASSWORD,
  E2E_GUEST_STORAGE_STATE,
  E2E_TOTP_SECRET,
  E2E_USERS,
} from "@/tests/e2e/constants"
import { expect, signInAs, signOut, test } from "@/tests/e2e/fixtures"
import { generateTotpCode } from "@/tests/e2e/helpers/totp"

function getInvalidTotpCode(
  secret: string,
  nowMs: number = Date.now()
): string {
  const validCandidates = new Set([
    generateTotpCode(secret, nowMs - 30_000),
    generateTotpCode(secret, nowMs),
    generateTotpCode(secret, nowMs + 30_000),
  ])

  for (const candidate of ["000000", "111111", "222222", "333333", "444444"]) {
    if (!validCandidates.has(candidate)) {
      return candidate
    }
  }

  return "999999"
}

test.describe("Guest authentication, two-factor, and route protection", () => {
  test.use({ storageState: E2E_GUEST_STORAGE_STATE })

  test("redirects signed-out visitor from a protected route to sign-in with next param and lands on destination after signing in", async ({
    page,
  }) => {
    await page.goto("/transactions")

    await expect(page).toHaveURL(/\/signin\?next=%2Ftransactions$/)

    await page.getByLabel("Username").fill(E2E_USERS.auth)
    await page.getByLabel("Password").fill(E2E_DEFAULT_PASSWORD)
    await page.getByRole("button", { name: "Sign In" }).click()

    await expect(page).toHaveURL(/\/transactions$/)
    await expect(
      page.getByRole("heading", { name: "Transactions" })
    ).toBeVisible()
  })

  test("displays an error and stays signed out when signing in with an incorrect password", async ({
    page,
  }) => {
    await signInAs(page, E2E_USERS.auth, "WrongPassword123!")

    await expect(page.getByText("Invalid username or password!")).toBeVisible()
    await expect(page).toHaveURL(/\/signin$/)

    await page.goto("/home")
    await expect(page).toHaveURL(/\/signin\?next=%2Fhome$/)
  })

  test("redirects directly visiting /two-factor without a pending two-factor cookie back to sign-in", async ({
    page,
  }) => {
    await page.goto("/two-factor")

    await expect(page).toHaveURL(/\/signin$/)
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible()
  })

  test("requires two-factor verification for 2FA user, rejects an invalid TOTP code, and accepts a valid TOTP code", async ({
    page,
  }) => {
    await signInAs(page, E2E_USERS.twoFactor, E2E_DEFAULT_PASSWORD)

    await expect(page).toHaveURL(/\/two-factor$/)
    await expect(
      page.getByText("Two-Factor Authentication", { exact: true })
    ).toBeVisible()

    const invalidCode = getInvalidTotpCode(E2E_TOTP_SECRET)
    await page.getByLabel("Verification Code").fill(invalidCode)
    await page.getByRole("button", { name: "Verify" }).click()

    await expect(page.getByText("Invalid authentication code!")).toBeVisible()
    await expect(page).toHaveURL(/\/two-factor$/)

    const validCode = generateTotpCode(E2E_TOTP_SECRET)
    await page.getByLabel("Verification Code").fill(validCode)
    await page.getByRole("button", { name: "Verify" }).click()

    await expect(page).toHaveURL(/\/home$/)
    await expect(
      page.getByRole("heading", { name: /Welcome back, Two Factor User/i })
    ).toBeVisible()
  })

  test("signing out terminates the session and blocks subsequent access to protected routes", async ({
    page,
  }) => {
    await signInAs(page, E2E_USERS.auth, E2E_DEFAULT_PASSWORD)

    await expect(page).toHaveURL(/\/home$/)
    await expect(
      page.getByRole("heading", { name: /Welcome back, Auth User/i })
    ).toBeVisible()

    await signOut(page)

    await page.goto("/home")
    await expect(page).toHaveURL(/\/signin\?next=%2Fhome$/)
  })
})

test.describe("Signed-in route protection and navigation guards", () => {
  test("redirects an already signed-in user away from /signin to /home", async ({
    page,
  }) => {
    await page.goto("/signin")

    await expect(page).toHaveURL(/\/home$/)
    await expect(
      page.getByRole("heading", { name: /Welcome back, Worker User/i })
    ).toBeVisible()
  })

  test("redirects a signed-in non-admin user visiting /admin to /home", async ({
    page,
  }) => {
    await page.goto("/admin")

    await expect(page).toHaveURL(/\/home$/)
    await expect(
      page.getByRole("heading", { name: /Welcome back, Worker User/i })
    ).toBeVisible()
  })

  test("renders the not-found page when a signed-in user visits an unknown path", async ({
    page,
  }) => {
    await page.goto("/unknown-route-that-does-not-exist")

    await expect(page.getByText("Page not found")).toBeVisible()
    await expect(
      page.getByText("The page you are looking for does not exist.")
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Back to Home" })).toBeVisible()
  })
})
