import { expect, test } from "@/tests/e2e/fixtures"

test.describe("Authenticated home smoke test", () => {
  test("loads the authenticated home page using worker storage state", async ({
    page,
  }) => {
    await page.goto("/home")

    await expect(page).toHaveURL(/\/home$/)
    await expect(page.getByText(/Welcome back, Worker User/i)).toBeVisible()
    await expect(
      page.getByText("Here's what's happening with your finances this month.")
    ).toBeVisible()
  })
})
