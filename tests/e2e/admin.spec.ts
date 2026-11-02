import type { Locator, Page } from "@playwright/test"

import {
  E2E_DEFAULT_PASSWORD,
  E2E_GUEST_STORAGE_STATE,
  E2E_USERS,
} from "@/tests/e2e/constants"
import {
  expect,
  expectHomeGreeting,
  signInAndExpectHome,
  signInAs,
  test,
  uniqueTag,
  withGuestPage,
} from "@/tests/e2e/fixtures"

function getSummaryCard(page: Page, title: string): Locator {
  return page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText(title, { exact: true }) })
}

async function clickRowMenuItem(
  page: Page,
  row: Locator,
  itemName: string
): Promise<void> {
  const menuItem = page.getByRole("menuitem", { name: itemName })
  await expect(async () => {
    if (!(await menuItem.isVisible())) {
      const menuButton = row.getByRole("button", { name: "Open menu" })
      await menuButton.click()
    }
    await expect(menuItem).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 15_000 })

  await menuItem.click()
}

test.describe("Admin user management, security controls, and impersonation", () => {
  test.use({ storageState: E2E_GUEST_STORAGE_STATE })

  test.beforeEach(async ({ page }) => {
    await signInAs(page, E2E_USERS.admin)
    await expect(page).toHaveURL(/\/home$/, { timeout: 15_000 })
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 })
    await expect(
      page.getByRole("heading", { name: "Admin Management" })
    ).toBeVisible({ timeout: 15_000 })
  })

  test("displays the user list, summary metrics, and admin indicators for seeded users", async ({
    page,
  }) => {
    await expect(
      page.getByText(
        "Manage application users, system roles, bans, sessions, and security."
      )
    ).toBeVisible()

    // Summary cards
    const totalCard = getSummaryCard(page, "Total Users")
    await expect(totalCard).toBeVisible()
    await expect(totalCard.getByText("Registered accounts")).toBeVisible()

    const activeCard = getSummaryCard(page, "Active Users")
    await expect(activeCard).toBeVisible()
    await expect(activeCard.getByText("Unrestricted access")).toBeVisible()

    const bannedCard = getSummaryCard(page, "Banned Users")
    await expect(bannedCard).toBeVisible()
    await expect(bannedCard.getByText("Suspended accounts")).toBeVisible()

    const adminCard = getSummaryCard(page, "Administrators")
    await expect(adminCard).toBeVisible()
    await expect(adminCard.getByText("Full system privileges")).toBeVisible()

    // Table header columns
    const table = page.getByRole("table")
    await expect(table).toBeVisible()
    for (const colName of ["User", "Email", "Role", "Status", "Joined Date"]) {
      await expect(
        table.getByRole("columnheader", { name: colName })
      ).toBeVisible()
    }

    // Verify seeded admin user row
    const searchInput = page.getByPlaceholder(
      "Search by name, email or username..."
    )
    await searchInput.fill(E2E_USERS.admin)
    const adminRow = page.getByRole("row", { name: /^Admin User\s/ })
    await expect(adminRow).toBeVisible()
    await expect(adminRow).toContainText(`@${E2E_USERS.admin}`)
    await expect(adminRow.getByText("Admin", { exact: true })).toBeVisible()
    await expect(adminRow.getByText("Active")).toBeVisible()
    await expect(adminRow.getByText("Verified")).toBeVisible()

    // Verify secondary admin row
    await searchInput.fill(E2E_USERS.secondaryAdmin)
    const secondaryAdminRow = page.getByRole("row", {
      name: /^Secondary Admin\s/,
    })
    await expect(secondaryAdminRow).toBeVisible()
    await expect(secondaryAdminRow).toContainText(
      `@${E2E_USERS.secondaryAdmin}`
    )
    await expect(
      secondaryAdminRow.getByText("Admin", { exact: true })
    ).toBeVisible()

    // Verify regular target user row
    await searchInput.fill(E2E_USERS.targetPassword)
    const targetRow = page.getByRole("row", {
      name: /^Target Password User\s/,
    })
    await expect(targetRow).toBeVisible()
    await expect(targetRow).toContainText(`@${E2E_USERS.targetPassword}`)
    await expect(targetRow.getByText("User", { exact: true })).toBeVisible()
  })

  test("creates a new user through the admin dialog who can immediately sign in", async ({
    page,
    browser,
  }) => {
    await page.getByRole("button", { name: "Add" }).click()

    const dialog = page.getByRole("dialog")
    await expect(
      dialog.getByRole("heading", { name: "Create New User" })
    ).toBeVisible()
    await expect(
      dialog.getByText("Add a new user account with credentials.")
    ).toBeVisible()

    const tag = uniqueTag()
    const fullName = `Created Admin User ${tag}`
    const username = `e2e_created_${tag}`
    const email = `e2e_created_${tag}@example.com`

    await dialog.getByLabel("Full Name").fill(fullName)
    await dialog.getByLabel("Username").fill(username)
    await dialog.getByLabel("Email").fill(email)
    await dialog.getByLabel("Password").fill(E2E_DEFAULT_PASSWORD)

    await dialog.getByRole("button", { name: "Add" }).click()

    await expect(page.getByText("User has been created.")).toBeVisible({
      timeout: 15_000,
    })
    await expect(dialog).toBeHidden()

    // Filter to verify user appears in table
    await page
      .getByPlaceholder("Search by name, email or username...")
      .fill(username)
    const newRow = page.getByRole("row", {
      name: new RegExp(`^${fullName}\\s`),
    })
    await expect(newRow).toBeVisible({ timeout: 15_000 })
    await expect(newRow).toContainText(`@${username}`)

    // Sign in through sign-in page with new user in an isolated context
    await withGuestPage(browser, async (newPage) => {
      await signInAndExpectHome(newPage, username, fullName)
    })
  })

  test("sets a new password for a target user allowing them to sign in with the updated password", async ({
    page,
    browser,
  }) => {
    await page
      .getByPlaceholder("Search by name, email or username...")
      .fill(E2E_USERS.targetPassword)
    const row = page.getByRole("row", { name: /^Target Password User\s/ })
    await expect(row).toBeVisible()

    await clickRowMenuItem(page, row, "Reset Password")

    const dialog = page.getByRole("dialog")
    await expect(
      dialog.getByRole("heading", { name: "Reset User Password" })
    ).toBeVisible()
    await expect(dialog.getByText("Target Password User")).toBeVisible()

    const newPassword = "NewAdminPass123!Secure"
    await dialog.getByLabel("New Password").fill(newPassword)
    await dialog.getByRole("button", { name: "Update" }).click()

    await expect(page.getByText("Password has been updated.")).toBeVisible({
      timeout: 15_000,
    })
    await expect(dialog).toBeHidden()

    // Verify signing in as the target user with the new password
    await withGuestPage(browser, async (userPage) => {
      await signInAndExpectHome(
        userPage,
        E2E_USERS.targetPassword,
        "Target Password User",
        newPassword
      )
    })
  })

  test("bans a target user preventing them from signing in and shows an appropriate error", async ({
    page,
    browser,
  }) => {
    await page
      .getByPlaceholder("Search by name, email or username...")
      .fill(E2E_USERS.targetBan)
    const row = page.getByRole("row", { name: /^Target Ban User\s/ })
    await expect(row).toBeVisible()

    await clickRowMenuItem(page, row, "Ban")

    const dialog = page.getByRole("dialog")
    await expect(
      dialog.getByRole("heading", { name: "Ban User" })
    ).toBeVisible()

    await dialog
      .getByLabel("Ban Reason")
      .fill("Violation of acceptable use policy")
    await dialog.getByRole("button", { name: "Ban" }).click()

    await expect(page.getByText("User has been banned.")).toBeVisible({
      timeout: 15_000,
    })
    await expect(dialog).toBeHidden()

    // Status badge in row updates to Banned
    await expect(row.getByText("Banned")).toBeVisible({ timeout: 15_000 })

    // Verify signing in is blocked with the banned error message
    await withGuestPage(browser, async (bannedPage) => {
      await signInAs(bannedPage, E2E_USERS.targetBan, E2E_DEFAULT_PASSWORD)
      await expect(
        bannedPage.getByText(
          "Your account has been banned. Please contact support if you believe this is an error."
        )
      ).toBeVisible({ timeout: 15_000 })
      await expect(bannedPage).toHaveURL(/\/signin$/)
    })
  })

  test("deletes a regular user and refuses deletion of administrator accounts", async ({
    page,
  }) => {
    // Delete regular user
    await page
      .getByPlaceholder("Search by name, email or username...")
      .fill(E2E_USERS.targetDelete)
    const row = page.getByRole("row", { name: /^Target Delete User\s/ })
    await expect(row).toBeVisible()

    await clickRowMenuItem(page, row, "Delete")

    const alertDialog = page.getByRole("alertdialog")
    await expect(
      alertDialog.getByRole("heading", { name: "Delete User Account" })
    ).toBeVisible()
    await expect(alertDialog.getByText("Target Delete User")).toBeVisible()

    await alertDialog.getByRole("button", { name: "Delete" }).click()

    await expect(page.getByText("User has been deleted.")).toBeVisible({
      timeout: 15_000,
    })
    await expect(alertDialog).toBeHidden()
    await expect(row).toHaveCount(0, { timeout: 15_000 })

    // Verify admin accounts do not have an action menu (deletion cannot be initiated)
    const searchInput = page.getByPlaceholder(
      "Search by name, email or username..."
    )

    // Admin's own account
    await searchInput.fill(E2E_USERS.admin)
    const ownAdminRow = page.getByRole("row", { name: /^Admin User\s/ })
    await expect(ownAdminRow).toBeVisible()
    await expect(
      ownAdminRow.getByRole("button", { name: "Open menu" })
    ).toHaveCount(0)

    // Secondary administrator account
    await searchInput.fill(E2E_USERS.secondaryAdmin)
    const secondaryAdminRow = page.getByRole("row", {
      name: /^Secondary Admin\s/,
    })
    await expect(secondaryAdminRow).toBeVisible()
    await expect(
      secondaryAdminRow.getByRole("button", { name: "Open menu" })
    ).toHaveCount(0)
  })

  test("impersonates a target user and stops impersonation to restore the admin session", async ({
    page,
  }) => {
    await page
      .getByPlaceholder("Search by name, email or username...")
      .fill(E2E_USERS.targetImpersonate)
    const row = page.getByRole("row", {
      name: /^Target Impersonate User\s/,
    })
    await expect(row).toBeVisible()

    await clickRowMenuItem(page, row, "Impersonate")

    await expect(
      page.getByText("Now impersonating Target Impersonate User")
    ).toBeVisible({ timeout: 15_000 })

    // Redirected to /home with impersonated user's view
    await expect(page).toHaveURL(/\/home$/, { timeout: 15_000 })
    await expectHomeGreeting(page, "Target Impersonate User")

    // Admin navigation link is not available to regular impersonated user
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0)

    // Stop impersonation via header button
    const stopButton = page.getByRole("button", {
      name: "Impersonating Target Impersonate User",
    })
    await expect(stopButton).toBeVisible()
    await stopButton.click()

    const alertDialog = page.getByRole("alertdialog")
    await expect(
      alertDialog.getByRole("heading", {
        name: "Stop impersonating this user?",
      })
    ).toBeVisible()
    await expect(alertDialog.getByText("Target Impersonate User")).toBeVisible()

    await alertDialog
      .getByRole("button", { name: "Stop Impersonating" })
      .click()

    await expect(page.getByText("Stopped impersonation session.")).toBeVisible({
      timeout: 15_000,
    })

    // Restores admin session and redirects back to /admin
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 })
    await expect(
      page.getByRole("heading", { name: "Admin Management" })
    ).toBeVisible()
    await expect(stopButton).toHaveCount(0)
  })
})
