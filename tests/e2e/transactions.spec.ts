import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import type { Locator, Page } from "@playwright/test"

import { expect, test } from "@/tests/e2e/fixtures"

function uniqueTag(): string {
  return randomUUID().slice(0, 8)
}

function getCardByTitle(page: Page, title: string): Locator {
  return page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText(title, { exact: true }) })
}

async function confirmDeleteFromRowMenu(
  page: Page,
  menuButton: Locator
): Promise<void> {
  await menuButton.click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  const alertDialog = page.getByRole("alertdialog")
  await expect(
    alertDialog.getByText(
      "Are you sure you want to delete this transaction? This action cannot be undone."
    )
  ).toBeVisible()
  await alertDialog.getByRole("button", { name: "Delete" }).click()
}

async function ensureNoTransactions(page: Page): Promise<void> {
  await page.goto("/transactions")
  await expect(
    page.getByRole("heading", { name: "Transactions" })
  ).toBeVisible()

  const menuButtons = page.getByRole("button", { name: "Open menu" })
  let count = await menuButtons.count()
  while (count > 0) {
    await confirmDeleteFromRowMenu(page, menuButtons.first())
    await expect(menuButtons).toHaveCount(count - 1, { timeout: 15_000 })
    count = await menuButtons.count()
  }
}

async function deleteTransactionByDescription(
  page: Page,
  description: string
): Promise<void> {
  const row = page.getByRole("row").filter({ hasText: description })
  await confirmDeleteFromRowMenu(
    page,
    row.getByRole("button", { name: "Open menu" })
  )
  await expect(page.getByText("Transaction has been deleted.")).toBeVisible({
    timeout: 15_000,
  })
  await expect(row).toHaveCount(0, { timeout: 15_000 })
}

interface CreateTransactionInput {
  type: "Inflow" | "Outflow"
  category: string
  currencyDisplayName?: string
  amount: string
  description: string
  dateSelection?: "today" | "previousMonth15th"
}

async function openAndSubmitAddTransactionDialog(
  page: Page,
  input: CreateTransactionInput
): Promise<void> {
  await page.getByRole("button", { name: "Add" }).click()

  const dialog = page.getByRole("dialog")
  await expect(
    dialog.getByRole("heading", { name: "Add Transaction" })
  ).toBeVisible()

  if (input.type === "Outflow") {
    await dialog.getByRole("tab", { name: "Outflow" }).click()
  } else {
    await dialog.getByRole("tab", { name: "Inflow" }).click()
  }

  await dialog.getByLabel("Category").click()
  await page
    .getByRole("option", { name: new RegExp(`^${input.category}`) })
    .click()

  if (input.currencyDisplayName) {
    await dialog.getByLabel("Currency").click()
    await page
      .getByRole("option", { name: input.currencyDisplayName, exact: true })
      .click()
  }

  await dialog.getByLabel("Amount").fill(input.amount)
  await dialog.getByLabel("Description").fill(input.description)

  await dialog.getByLabel("Date").click()
  const calendarGrid = page.getByRole("grid")
  await expect(calendarGrid).toBeVisible()

  if (input.dateSelection === "previousMonth15th") {
    await page.getByRole("button", { name: "Go to the Previous Month" }).click()
    await calendarGrid.getByRole("button", { name: /15th,/ }).click()
  } else {
    await calendarGrid.getByRole("button", { name: /^Today,/ }).click()
  }

  await expect(calendarGrid).toBeHidden()
  await dialog.getByRole("button", { name: "Add" }).click()
}

test.describe("Transactions, Home dashboard, and Statistics", () => {
  test("creates a new transaction inside the seeded exchange-rate window and converts currency without external API calls", async ({
    page,
  }) => {
    const tag = uniqueTag()
    const description = `E2E Seeded Rate ${tag}`

    await page.goto("/transactions")

    await openAndSubmitAddTransactionDialog(page, {
      type: "Inflow",
      category: "Salary & Bonus",
      currencyDisplayName: "US Dollar ($)",
      amount: "100",
      description,
    })

    await expect(page.getByText("Transaction has been created.")).toBeVisible({
      timeout: 15_000,
    })

    const row = page.getByRole("row").filter({ hasText: description })
    await expect(row).toBeVisible()
    await expect(row).toContainText("Inflow")
    await expect(row).toContainText("Salary & Bonus")
    // 100 USD converted at seeded rate 1 USD = 25,000 VND -> +2.500.000 ₫
    await expect(row).toContainText("+2.500.000 ₫")

    await expect(
      page.getByText(
        "Some transactions are pending exchange rates and are displayed in their original currency."
      )
    ).toHaveCount(0)

    await deleteTransactionByDescription(page, description)
  })

  test("edits an existing transaction and deletes it from the transactions table", async ({
    page,
  }) => {
    const tag = uniqueTag()
    const initialDescription = `E2E Initial Groceries ${tag}`
    const updatedDescription = `E2E Updated Taxi ${tag}`

    await page.goto("/transactions")

    await openAndSubmitAddTransactionDialog(page, {
      type: "Outflow",
      category: "Food & Beverage",
      amount: "120000",
      description: initialDescription,
    })

    await expect(page.getByText("Transaction has been created.")).toBeVisible({
      timeout: 15_000,
    })

    const initialRow = page
      .getByRole("row")
      .filter({ hasText: initialDescription })
    await expect(initialRow).toBeVisible()
    await expect(initialRow).toContainText("Outflow")
    await expect(initialRow).toContainText("Food & Beverage")
    await expect(initialRow).toContainText("-120.000 ₫")

    await initialRow.getByRole("button", { name: "Open menu" }).click()
    await page.getByRole("menuitem", { name: "Edit" }).click()

    const editDialog = page.getByRole("dialog")
    await expect(
      editDialog.getByRole("heading", { name: "Edit Transaction" })
    ).toBeVisible()

    await editDialog.getByLabel("Category").click()
    await page.getByRole("option", { name: /^Transportation/ }).click()

    await editDialog.getByLabel("Amount").fill("185000")
    await editDialog.getByLabel("Description").fill(updatedDescription)
    await editDialog.getByRole("button", { name: "Update" }).click()

    await expect(page.getByText("Transaction has been updated.")).toBeVisible({
      timeout: 15_000,
    })
    await expect(initialRow).toHaveCount(0)

    const updatedRow = page
      .getByRole("row")
      .filter({ hasText: updatedDescription })
    await expect(updatedRow).toBeVisible()
    await expect(updatedRow).toContainText("Outflow")
    await expect(updatedRow).toContainText("Transportation")
    await expect(updatedRow).toContainText("-185.000 ₫")

    await deleteTransactionByDescription(page, updatedDescription)
  })

  test("displays the server-side duplicate error message when creating an identical transaction", async ({
    page,
  }) => {
    const tag = uniqueTag()
    const duplicateDescription = `E2E Duplicate Item ${tag}`

    await page.goto("/transactions")

    await openAndSubmitAddTransactionDialog(page, {
      type: "Outflow",
      category: "Shopping",
      amount: "350000",
      description: duplicateDescription,
    })

    await expect(page.getByText("Transaction has been created.")).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      page.getByRole("row").filter({ hasText: duplicateDescription })
    ).toHaveCount(1)

    await openAndSubmitAddTransactionDialog(page, {
      type: "Outflow",
      category: "Shopping",
      amount: "350000",
      description: duplicateDescription,
    })

    await expect(
      page.getByText(
        "This transaction already exists! Please merge transactions or add more details in the description."
      )
    ).toBeVisible({ timeout: 15_000 })

    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden()

    await expect(
      page.getByRole("row").filter({ hasText: duplicateDescription })
    ).toHaveCount(1)

    await deleteTransactionByDescription(page, duplicateDescription)
  })

  test("filters transactions to matching rows and exports filtered transactions to a CSV file", async ({
    page,
  }) => {
    const tag = uniqueTag()
    const inflowDescription = `E2E Filter Alpha ${tag}`
    const outflowDescription = `E2E Filter Beta ${tag}`

    await page.goto("/transactions")

    await openAndSubmitAddTransactionDialog(page, {
      type: "Inflow",
      category: "Salary & Bonus",
      amount: "400000",
      description: inflowDescription,
    })
    await expect(
      page.getByRole("row").filter({ hasText: inflowDescription })
    ).toBeVisible({ timeout: 15_000 })

    await openAndSubmitAddTransactionDialog(page, {
      type: "Outflow",
      category: "Food & Beverage",
      amount: "95000",
      description: outflowDescription,
    })
    await expect(
      page.getByRole("row").filter({ hasText: outflowDescription })
    ).toBeVisible({ timeout: 15_000 })

    const inflowRow = page
      .getByRole("row")
      .filter({ hasText: inflowDescription })
    const outflowRow = page
      .getByRole("row")
      .filter({ hasText: outflowDescription })

    await expect(inflowRow).toBeVisible()
    await expect(outflowRow).toBeVisible()

    // Filter by search term + type so only outflowDescription matches
    await page.getByPlaceholder("Search transactions...").fill(tag)
    await page.getByRole("combobox").filter({ hasText: "All Types" }).click()
    await page.getByRole("option", { name: "Outflow", exact: true }).click()

    await expect(outflowRow).toBeVisible()
    await expect(inflowRow).toHaveCount(0)

    // Export filtered transactions and verify CSV file contents
    const downloadPromise = page.waitForEvent("download")
    await page
      .getByRole("button", {
        name: "Export transactions with current filters applied.",
      })
      .click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^transactions_.*\.csv$/)
    const downloadPath = await download.path()
    expect(downloadPath).not.toBeNull()
    const csvContent = readFileSync(downloadPath!, "utf8")

    expect(csvContent).toContain(
      '"Date","Type","Category","Amount","Currency","Original Amount","Original Currency","Description"'
    )
    expect(csvContent).toContain(
      `"Outflow","Food & Beverage","95000","VND","95000","VND","${outflowDescription}"`
    )
    expect(csvContent).not.toContain(inflowDescription)

    // Reset filters and clean up both transactions
    await page.getByRole("button", { name: "Reset" }).click()
    await expect(inflowRow).toBeVisible()
    await expect(outflowRow).toBeVisible()

    await deleteTransactionByDescription(page, inflowDescription)
    await deleteTransactionByDescription(page, outflowDescription)
  })

  test("displays a newly created transaction in recent transactions and updates summary figures on Home", async ({
    page,
  }) => {
    await ensureNoTransactions(page)

    const tag = uniqueTag()
    const description = `E2E Home Bonus ${tag}`

    await page.goto("/home")

    const monthlyInflowCard = getCardByTitle(page, "Monthly Inflow")
    const monthlyOutflowCard = getCardByTitle(page, "Monthly Outflow")
    const monthlyBalanceCard = getCardByTitle(page, "Monthly Balance")
    const recentTransactionsCard = getCardByTitle(page, "Recent Transactions")

    await expect(monthlyInflowCard).toContainText("0 ₫")
    await expect(monthlyInflowCard).toContainText("0 transactions")
    await expect(monthlyOutflowCard).toContainText("0 ₫")
    await expect(monthlyOutflowCard).toContainText("0 transactions")
    await expect(monthlyBalanceCard).toContainText("0 ₫")
    await expect(monthlyBalanceCard).toContainText(
      "Balanced compared to inflow"
    )
    await expect(recentTransactionsCard).toContainText("No transactions found")

    await openAndSubmitAddTransactionDialog(page, {
      type: "Inflow",
      category: "Salary & Bonus",
      amount: "500000",
      description,
    })

    await expect(page.getByText("Transaction has been created.")).toBeVisible({
      timeout: 15_000,
    })

    await expect(recentTransactionsCard).toContainText(description)
    await expect(recentTransactionsCard).toContainText("Salary & Bonus")
    await expect(recentTransactionsCard).toContainText("+500.000 ₫")

    await expect(monthlyInflowCard).toContainText("500.000 ₫")
    await expect(monthlyInflowCard).toContainText("1 transactions")
    await expect(monthlyBalanceCard).toContainText("500.000 ₫")
    await expect(monthlyBalanceCard).toContainText(
      "Positive compared to inflow"
    )

    await page.goto("/transactions")
    await deleteTransactionByDescription(page, description)
  })

  test("reflects recorded transactions on the Statistics page and updates summary and table when filters change", async ({
    page,
  }) => {
    await ensureNoTransactions(page)

    const tag = uniqueTag()
    const currentMonthDescription = `E2E Stats Inflow ${tag}`
    const prevMonthDescription = `E2E Stats Outflow ${tag}`

    const now = new Date()
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15)
    const currentMonthName = now.toLocaleString("en-US", { month: "long" })
    const prevMonthName = prevMonthDate.toLocaleString("en-US", {
      month: "long",
    })

    await page.goto("/transactions")

    await openAndSubmitAddTransactionDialog(page, {
      type: "Inflow",
      category: "Salary & Bonus",
      amount: "800000",
      description: currentMonthDescription,
    })
    await expect(
      page.getByRole("row").filter({ hasText: currentMonthDescription })
    ).toBeVisible({ timeout: 15_000 })

    await openAndSubmitAddTransactionDialog(page, {
      type: "Outflow",
      category: "Food & Beverage",
      amount: "200000",
      description: prevMonthDescription,
      dateSelection: "previousMonth15th",
    })
    await expect(
      page.getByRole("row").filter({ hasText: prevMonthDescription })
    ).toBeVisible({ timeout: 15_000 })

    await page.goto("/statistics")
    await expect(
      page.getByRole("heading", { name: "Statistics" })
    ).toBeVisible()

    const totalInflowCard = getCardByTitle(page, "Total Inflow")
    const totalOutflowCard = getCardByTitle(page, "Total Outflow")
    const balanceCard = getCardByTitle(page, "Balance")
    const totalTransactionsCard = getCardByTitle(page, "Total Transactions")

    const salaryRow = page
      .getByRole("row")
      .filter({ hasText: "Salary & Bonus" })
    const foodRow = page.getByRole("row").filter({ hasText: "Food & Beverage" })

    // Unfiltered: both months' transactions are aggregated
    await expect(totalInflowCard).toContainText("800.000 ₫")
    await expect(totalInflowCard).toContainText("1 transactions")
    await expect(totalOutflowCard).toContainText("200.000 ₫")
    await expect(totalOutflowCard).toContainText("1 transactions")
    await expect(balanceCard).toContainText("600.000 ₫")
    await expect(balanceCard).toContainText("Positive compared to inflow")
    await expect(totalTransactionsCard).toContainText("2")

    await expect(salaryRow).toContainText("Inflow")
    await expect(salaryRow).toContainText("+800.000 ₫")
    await expect(foodRow).toContainText("Outflow")
    await expect(foodRow).toContainText("-200.000 ₫")

    // Filter by current month -> only Salary & Bonus inflow appears
    await page.getByRole("combobox").filter({ hasText: "All Months" }).click()
    await page
      .getByRole("option", { name: currentMonthName, exact: true })
      .click()

    await expect(totalInflowCard).toContainText("800.000 ₫")
    await expect(totalInflowCard).toContainText("1 transactions")
    await expect(totalOutflowCard).toContainText("0 ₫")
    await expect(totalOutflowCard).toContainText("0 transactions")
    await expect(balanceCard).toContainText("800.000 ₫")
    await expect(totalTransactionsCard).toContainText("1")
    await expect(salaryRow).toBeVisible()
    await expect(foodRow).toHaveCount(0)

    // Filter by previous month -> only Food & Beverage outflow appears
    await page
      .getByRole("combobox")
      .filter({ hasText: currentMonthName })
      .click()
    await page.getByRole("option", { name: prevMonthName, exact: true }).click()

    await expect(totalInflowCard).toContainText("0 ₫")
    await expect(totalInflowCard).toContainText("0 transactions")
    await expect(totalOutflowCard).toContainText("200.000 ₫")
    await expect(totalOutflowCard).toContainText("1 transactions")
    await expect(balanceCard).toContainText("-200.000 ₫")
    await expect(balanceCard).toContainText("Negative compared to inflow")
    await expect(totalTransactionsCard).toContainText("1")
    await expect(foodRow).toBeVisible()
    await expect(salaryRow).toHaveCount(0)

    // Reset filters -> both rows visible again
    await page.getByRole("button", { name: "Reset" }).click()
    await expect(salaryRow).toBeVisible()
    await expect(foodRow).toBeVisible()

    // Clean up created transactions
    await page.goto("/transactions")
    await deleteTransactionByDescription(page, currentMonthDescription)
    await deleteTransactionByDescription(page, prevMonthDescription)
  })
})
