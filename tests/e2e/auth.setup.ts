import { expect, test as setup } from "@playwright/test"

import {
  E2E_DEFAULT_PASSWORD,
  E2E_SETUP_WORKER_COUNT,
  getWorkerStorageStatePath,
  getWorkerUsername,
} from "@/tests/e2e/constants"

setup.describe.configure({ mode: "parallel" })

for (let index = 0; index < E2E_SETUP_WORKER_COUNT; index++) {
  setup(`authenticate worker ${index}`, async ({ page }) => {
    await page.goto("/signin")
    await page.getByLabel("Username").fill(getWorkerUsername(index))
    await page.getByLabel("Password").fill(E2E_DEFAULT_PASSWORD)
    await page.getByRole("button", { name: "Sign In" }).click()

    await expect(page).toHaveURL(/\/home$/)
    await expect(page.getByText(/Welcome back, Worker User/i)).toBeVisible()

    await page.context().storageState({
      path: getWorkerStorageStatePath(index),
    })
  })
}
