import { randomUUID } from "node:crypto"
import { test as base, expect } from "@playwright/test"
import type { Browser, Locator, Page } from "@playwright/test"

import {
  E2E_BASE_URL,
  E2E_DEFAULT_PASSWORD,
  E2E_GUEST_STORAGE_STATE,
  E2E_SETUP_WORKER_COUNT,
  getWorkerStorageStatePath,
  getWorkerUsername,
} from "@/tests/e2e/constants"

export function uniqueTag(): string {
  return randomUUID().slice(0, 8)
}

export async function withGuestPage(
  browser: Browser,
  fn: (page: Page) => Promise<void>
): Promise<void> {
  const context = await browser.newContext({
    baseURL: E2E_BASE_URL,
    storageState: E2E_GUEST_STORAGE_STATE,
  })
  try {
    const page = await context.newPage()
    await fn(page)
  } finally {
    await context.close()
  }
}

export async function signInAs(
  page: Page,
  username: string,
  password: string = E2E_DEFAULT_PASSWORD
): Promise<void> {
  await page.goto("/signin")
  await page.getByLabel("Username").fill(username)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Sign In" }).click()
}

export async function expectHomeGreeting(
  page: Page,
  displayName: string
): Promise<void> {
  await expect(page).toHaveURL(/\/home$/)
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: new RegExp(displayName),
    })
  ).toBeVisible()
}

export async function signInAndExpectHome(
  page: Page,
  username: string,
  displayName: string,
  password: string = E2E_DEFAULT_PASSWORD
): Promise<void> {
  await signInAs(page, username, password)
  await expectHomeGreeting(page, displayName)
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sign Out" }).click()
  const alertDialog = page.getByRole("alertdialog")
  await expect(
    alertDialog.getByText("Are you sure you want to sign out?")
  ).toBeVisible()
  await alertDialog.getByRole("button", { name: "Sign Out" }).click()
  await expect(page).toHaveURL(/\/signin$/)
}

export async function selectTodayInDatePicker(
  page: Page,
  dialog: Locator,
  label: string
): Promise<void> {
  await dialog.getByLabel(label).click()
  const calendarGrid = page.getByRole("grid")
  await expect(calendarGrid).toBeVisible()
  await calendarGrid.getByRole("button", { name: /^Today,/ }).click()
  await expect(calendarGrid).toBeHidden()
}

export async function selectPreviousMonth15thToTodayRange(
  page: Page,
  dialog: Locator
): Promise<void> {
  await dialog.getByLabel("Start Date").click()
  const startGrid = page.getByRole("grid")
  await expect(startGrid).toBeVisible()
  await page.getByRole("button", { name: "Go to the Previous Month" }).click()
  await startGrid.getByRole("button", { name: /15th,/ }).click()
  await expect(startGrid).toBeHidden()

  await selectTodayInDatePicker(page, dialog, "End Date")
}

export interface DeleteRowOptions {
  rowText: string | RegExp
  dialogHeading: string
  confirmMessage?: string | RegExp
  successToast: string
}

export async function deleteRowViaMenu(
  page: Page,
  options: DeleteRowOptions
): Promise<void> {
  const row = page.getByRole("row").filter({ hasText: options.rowText })
  await row.getByRole("button", { name: "Open menu" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()

  const alertDialog = page.getByRole("alertdialog")
  await expect(
    alertDialog.getByRole("heading", { name: options.dialogHeading })
  ).toBeVisible()
  if (options.confirmMessage) {
    await expect(alertDialog.getByText(options.confirmMessage)).toBeVisible()
  }
  await alertDialog.getByRole("button", { name: "Delete" }).click()

  await expect(page.getByText(options.successToast)).toBeVisible()
  await expect(row).toHaveCount(0)
}

type WorkerFixtures = {
  workerUsername: string
}

export const test = base.extend<Record<never, never>, WorkerFixtures>({
  // oxlint-disable-next-line eslint/no-empty-pattern
  storageState: async ({}, use, testInfo) => {
    const workerIndex = testInfo.parallelIndex % E2E_SETUP_WORKER_COUNT
    await use(getWorkerStorageStatePath(workerIndex))
  },
  workerUsername: [
    // oxlint-disable-next-line eslint/no-empty-pattern
    async ({}, use, workerInfo) => {
      const workerIndex = workerInfo.parallelIndex % E2E_SETUP_WORKER_COUNT
      await use(getWorkerUsername(workerIndex))
    },
    { scope: "worker" },
  ],
})

export { expect }
