import type { Locator, Page } from "@playwright/test"

import {
  E2E_DEFAULT_PASSWORD,
  E2E_GUEST_STORAGE_STATE,
  E2E_USERS,
} from "@/tests/e2e/constants"
import {
  expect,
  signInAs,
  signOut,
  test,
  uniqueTag,
} from "@/tests/e2e/fixtures"
import { generateTotpFromBase32 } from "@/tests/e2e/helpers/totp"

async function expectHomeGreeting(
  page: Page,
  displayName: string
): Promise<void> {
  await expect(page).toHaveURL(/\/home$/, { timeout: 15_000 })
  await expect(
    page.getByRole("heading", {
      name: new RegExp(`Welcome back, ${displayName}`, "i"),
    })
  ).toBeVisible({ timeout: 15_000 })
}

async function signInAndExpectHome(
  page: Page,
  username: string,
  displayName: string,
  password: string = E2E_DEFAULT_PASSWORD
): Promise<void> {
  await signInAs(page, username, password)
  await expectHomeGreeting(page, displayName)
}

async function openAccountSettingsTab(page: Page): Promise<void> {
  await page.goto("/settings")
  const accountTab = page.getByRole("tab", { name: "Account" })
  await expect(async () => {
    await accountTab.click()
    await expect(accountTab).toHaveAttribute("data-state", "active", {
      timeout: 1000,
    })
  }).toPass({ timeout: 15_000 })
}

function getCardByTitle(page: Page, title: string): Locator {
  return page.locator('[data-slot="card"]').filter({ hasText: title })
}

async function selectSettingsOption(
  page: Page,
  cardTitle: string,
  optionName: string
): Promise<Locator> {
  const combobox = getCardByTitle(page, cardTitle).getByRole("combobox")
  const option = page.getByRole("option", { name: optionName })
  await expect(async () => {
    if (!(await option.isVisible())) {
      await combobox.click()
    }
    await expect(option).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15_000 })
  await option.click()
  return combobox
}

test.describe("Settings: profile, security, sessions, and preferences", () => {
  test.use({ storageState: E2E_GUEST_STORAGE_STATE })

  test("changing the user's display name updates the name shown in the application UI", async ({
    page,
  }) => {
    await signInAndExpectHome(
      page,
      E2E_USERS.settingsProfile,
      "Settings Profile User"
    )

    await openAccountSettingsTab(page)
    await page.getByRole("button", { name: "Change Name" }).click()

    const dialog = page.getByRole("dialog", { name: "Change Name" })
    await expect(dialog).toBeVisible()

    await dialog.getByLabel("Name").fill("Updated Profile Name")
    await dialog.getByRole("button", { name: "Save" }).click()

    await expect(page.getByText("Your name has been updated.")).toBeVisible({
      timeout: 15_000,
    })
    await expect(dialog).toBeHidden()

    await page.goto("/home")
    await expectHomeGreeting(page, "Updated Profile Name")
  })

  test("changing the username rejects an already-taken username with a server-side error and allows signing in with a new username", async ({
    page,
  }) => {
    await signInAndExpectHome(
      page,
      E2E_USERS.settingsUsername,
      "Settings Username User"
    )

    await openAccountSettingsTab(page)
    await page.getByRole("button", { name: "Change Username" }).click()

    const dialog = page.getByRole("dialog", { name: "Change Username" })
    await expect(dialog).toBeVisible()

    await dialog.getByLabel("Username").fill(E2E_USERS.admin)
    await dialog.getByRole("button", { name: "Save" }).click()

    await expect(page.getByText("This username is already taken.")).toBeVisible(
      { timeout: 15_000 }
    )
    await expect(dialog).toBeVisible()

    const newUsername = `e2e_renamed_${uniqueTag()}`
    await dialog.getByLabel("Username").fill(newUsername)
    await dialog.getByRole("button", { name: "Save" }).click()

    await expect(page.getByText("Your username has been changed.")).toBeVisible(
      { timeout: 15_000 }
    )
    await expect(dialog).toBeHidden()

    await signOut(page)
    await signInAndExpectHome(page, newUsername, "Settings Username User")
  })

  test("changing the password fails when the current password is wrong and allows signing in with the new password when correct", async ({
    page,
  }) => {
    await signInAndExpectHome(
      page,
      E2E_USERS.settingsPassword,
      "Settings Password User"
    )

    await openAccountSettingsTab(page)
    await page.getByRole("button", { name: "Change Password" }).click()

    const dialog = page.getByRole("dialog", { name: "Change Password" })
    await expect(dialog).toBeVisible()

    const newPassword = "UpdatedPassword456!"
    await dialog
      .getByLabel("Current Password", { exact: true })
      .fill("WrongCurrent123!")
    await dialog.getByLabel("New Password", { exact: true }).fill(newPassword)
    await dialog
      .getByLabel("Confirm Password", { exact: true })
      .fill(newPassword)
    await dialog.getByRole("button", { name: "Save" }).click()

    await expect(page.getByText("Current password is incorrect!")).toBeVisible({
      timeout: 15_000,
    })
    await expect(dialog).toBeVisible()

    await dialog
      .getByLabel("Current Password", { exact: true })
      .fill(E2E_DEFAULT_PASSWORD)
    await dialog.getByLabel("New Password", { exact: true }).fill(newPassword)
    await dialog
      .getByLabel("Confirm Password", { exact: true })
      .fill(newPassword)
    await dialog.getByRole("button", { name: "Save" }).click()

    await expect(page.getByText("Your password has been changed.")).toBeVisible(
      { timeout: 15_000 }
    )
    await expect(dialog).toBeHidden()

    await signOut(page)
    await signInAndExpectHome(
      page,
      E2E_USERS.settingsPassword,
      "Settings Password User",
      newPassword
    )
  })

  test("enabling two-factor authentication activates TOTP verification on sign-in and disabling it turns 2FA off again", async ({
    page,
  }) => {
    await signInAndExpectHome(
      page,
      E2E_USERS.settingsTwoFactor,
      "Settings TwoFactor User"
    )

    await openAccountSettingsTab(page)
    await page.getByRole("button", { name: "Enable 2FA" }).click()

    const enableDialog = page.getByRole("dialog", {
      name: "Enable Two-Factor Authentication",
    })
    await expect(enableDialog).toBeVisible()

    await enableDialog
      .getByLabel("Password", { exact: true })
      .fill(E2E_DEFAULT_PASSWORD)
    await enableDialog.getByRole("button", { name: "Enable 2FA" }).click()

    await expect(enableDialog.getByText("Secret Key")).toBeVisible({
      timeout: 15_000,
    })
    // The "Secret Key" <Label> has no htmlFor, so the read-only input has no accessible name.
    const secret = await enableDialog.locator("input[readonly]").inputValue()
    expect(secret.length).toBeGreaterThan(0)

    await enableDialog
      .getByLabel("Verification Code")
      .fill(generateTotpFromBase32(secret))
    await enableDialog.getByRole("button", { name: "Verify" }).click()

    await expect(
      page.getByText("Two-factor authentication is now enabled.")
    ).toBeVisible({ timeout: 15_000 })
    await expect(enableDialog).toBeHidden()
    await expect(page.getByRole("button", { name: "Disable 2FA" })).toBeVisible(
      { timeout: 15_000 }
    )

    await signOut(page)
    await signInAs(page, E2E_USERS.settingsTwoFactor)

    await expect(page).toHaveURL(/\/two-factor$/, { timeout: 15_000 })
    await page
      .getByLabel("Verification Code")
      .fill(generateTotpFromBase32(secret))
    await page.getByRole("button", { name: "Verify" }).click()
    await expectHomeGreeting(page, "Settings TwoFactor User")

    await openAccountSettingsTab(page)
    await page.getByRole("button", { name: "Disable 2FA" }).click()

    const disableDialog = page.getByRole("dialog", {
      name: "Disable Two-Factor Authentication",
    })
    await expect(disableDialog).toBeVisible()

    await disableDialog
      .getByLabel("Password", { exact: true })
      .fill(E2E_DEFAULT_PASSWORD)
    await disableDialog.getByRole("button", { name: "Disable 2FA" }).click()

    await expect(
      page.getByText("Two-factor authentication is now disabled.")
    ).toBeVisible({ timeout: 15_000 })
    await expect(disableDialog).toBeHidden()
    await expect(page.getByRole("button", { name: "Enable 2FA" })).toBeVisible({
      timeout: 15_000,
    })

    await signOut(page)
    await signInAndExpectHome(
      page,
      E2E_USERS.settingsTwoFactor,
      "Settings TwoFactor User"
    )
  })

  test("viewing active sessions lists another signed-in session for the same user and terminates it so it is no longer authenticated", async ({
    page,
    browser,
  }) => {
    const secondContext = await browser.newContext({
      storageState: E2E_GUEST_STORAGE_STATE,
    })

    try {
      const secondPage = await secondContext.newPage()
      await signInAndExpectHome(
        secondPage,
        E2E_USERS.settingsSessions,
        "Settings Sessions User"
      )
      await signInAndExpectHome(
        page,
        E2E_USERS.settingsSessions,
        "Settings Sessions User"
      )

      await openAccountSettingsTab(page)
      await page.getByRole("button", { name: "View Active Sessions" }).click()

      const dialog = page.getByRole("dialog", { name: "Active Sessions" })
      await expect(dialog).toBeVisible()

      // Session <Item> rows have no ARIA role or accessible name.
      const sessionItems = dialog.locator('[data-slot="item"]')
      const currentSessionItem = sessionItems.filter({ hasText: "Current" })
      const otherSessionItem = sessionItems.filter({ hasNotText: "Current" })

      await expect(currentSessionItem).toHaveCount(1, { timeout: 15_000 })
      await expect(otherSessionItem).toHaveCount(1, { timeout: 15_000 })

      await otherSessionItem
        .getByRole("button", { name: "Terminate", exact: true })
        .click()

      await expect(page.getByText("Session terminated.")).toBeVisible({
        timeout: 15_000,
      })
      await expect(otherSessionItem).toHaveCount(0, { timeout: 15_000 })
      await expect(currentSessionItem).toHaveCount(1)

      await secondPage.goto("/home")
      await expect(secondPage).toHaveURL(/\/signin\?next=%2Fhome$/, {
        timeout: 15_000,
      })

      await page.goto("/home")
      await expectHomeGreeting(page, "Settings Sessions User")
    } finally {
      await secondContext.close()
    }
  })

  test("changing the theme, display currency, and language to vi-VN each update the visible UI accordingly", async ({
    page,
  }) => {
    await signInAndExpectHome(
      page,
      E2E_USERS.settingsPreferences,
      "Settings Preferences User"
    )

    // Cards have no ARIA role or accessible name.
    const monthlyInflowCard = getCardByTitle(page, "Monthly Inflow")
    await expect(monthlyInflowCard).toContainText("0 ₫")

    await page.goto("/settings")

    const themeCombobox = await selectSettingsOption(page, "Appearance", "Dark")
    await expect(page.locator("html")).toHaveClass(/\bdark\b/)
    await expect(themeCombobox).toContainText("Dark")

    await selectSettingsOption(page, "Appearance", "Light")
    await expect(page.locator("html")).toHaveClass(/\blight\b/)
    await expect(themeCombobox).toContainText("Light")

    const currencyCombobox = await selectSettingsOption(
      page,
      "Currency",
      "US Dollar ($)"
    )
    await expect(currencyCombobox).toContainText("US Dollar ($)", {
      timeout: 15_000,
    })

    await page.goto("/home")
    await expect(monthlyInflowCard).toContainText("$0.00", { timeout: 15_000 })

    await page.goto("/settings")
    await selectSettingsOption(page, "Language", "Tiếng Việt")

    await expect(page.locator("html")).toHaveAttribute("lang", "vi-VN", {
      timeout: 15_000,
    })
    await expect(page.getByRole("heading", { name: "Cài đặt" })).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      page.getByText("Quản lý tài khoản và tùy chọn ứng dụng của bạn.")
    ).toBeVisible()
    await expect(page.getByRole("tab", { name: "Chung" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Tài khoản" })).toBeVisible()
  })
})
