import type { Page } from "@playwright/test"

import {
  deleteRowViaMenu,
  expect,
  selectPreviousMonth15thToTodayRange,
  selectTodayInDatePicker,
  test,
  uniqueTag,
} from "@/tests/e2e/fixtures"

interface CreateBudgetInput {
  category: string
  amount: string
}

async function openAndSubmitAddBudgetDialog(
  page: Page,
  input: CreateBudgetInput
): Promise<void> {
  await page.getByRole("button", { name: "Add" }).click()

  const dialog = page.getByRole("dialog")
  await expect(
    dialog.getByRole("heading", { name: "Add Budget" })
  ).toBeVisible()

  await dialog.getByLabel("Category").click()
  await page
    .getByRole("option", { name: new RegExp(`^${input.category}`) })
    .click()

  await dialog.getByLabel("Amount").fill(input.amount)
  await selectPreviousMonth15thToTodayRange(page, dialog)
  await dialog.getByRole("button", { name: "Add" }).click()
}

async function deleteBudgetByCategory(
  page: Page,
  category: string
): Promise<void> {
  await deleteRowViaMenu(page, {
    rowText: category,
    dialogHeading: "Delete Budget",
    confirmMessage:
      "Are you sure you want to delete this budget? This action cannot be undone.",
    successToast: "Budget has been deleted.",
  })
}

async function ensureNoBudgetForCategories(
  page: Page,
  categories: string[]
): Promise<void> {
  for (const category of categories) {
    const existingRow = page.getByRole("row").filter({ hasText: category })
    if ((await existingRow.count()) > 0) {
      await deleteBudgetByCategory(page, category)
    }
  }
}

interface CreateGoalInput {
  category: string
  name: string
  targetAmount: string
}

async function openAndSubmitAddGoalDialog(
  page: Page,
  input: CreateGoalInput
): Promise<void> {
  await page.getByRole("button", { name: "Add" }).click()

  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("heading", { name: "Add Goal" })).toBeVisible()

  await dialog.getByLabel("Category").click()
  await page
    .getByRole("option", { name: new RegExp(`^${input.category}`) })
    .click()

  await dialog.getByLabel("Goal Name").fill(input.name)
  await dialog.getByLabel("Target Amount").fill(input.targetAmount)
  await selectPreviousMonth15thToTodayRange(page, dialog)
  await dialog.getByRole("button", { name: "Add" }).click()
}

async function deleteGoalByName(page: Page, goalName: string): Promise<void> {
  await deleteRowViaMenu(page, {
    rowText: goalName,
    dialogHeading: "Delete Goal",
    confirmMessage:
      "Are you sure you want to delete this goal? This action cannot be undone.",
    successToast: "Goal has been deleted.",
  })
}

interface CreateRecurringInput {
  type: "Inflow" | "Outflow"
  category: string
  amount: string
  description: string
}

async function openAndSubmitAddRecurringDialog(
  page: Page,
  input: CreateRecurringInput
): Promise<void> {
  await page.getByRole("button", { name: "Add" }).click()

  const dialog = page.getByRole("dialog")
  await expect(
    dialog.getByRole("heading", { name: "Add Recurring Transaction" })
  ).toBeVisible()

  await dialog.getByRole("tab", { name: input.type }).click()
  await dialog.getByLabel("Category").click()
  await page
    .getByRole("option", { name: new RegExp(`^${input.category}`) })
    .click()

  await dialog.getByLabel("Amount").fill(input.amount)
  await dialog.getByLabel("Description").fill(input.description)
  await selectTodayInDatePicker(page, dialog, "Start Date")

  await dialog.getByRole("button", { name: "Add" }).click()
}

test.describe("Budgets, Goals, and Recurring Transactions E2E", () => {
  test("creates a budget, displays it with its progress, edits its values, and deletes it", async ({
    page,
  }) => {
    const initialCategory = "Education & Development"
    const updatedCategory = "Social & Gifts"

    await page.goto("/budgets")
    await expect(page.getByRole("heading", { name: "Budgets" })).toBeVisible()
    await ensureNoBudgetForCategories(page, [initialCategory, updatedCategory])

    await openAndSubmitAddBudgetDialog(page, {
      category: initialCategory,
      amount: "1000000",
    })
    await expect(page.getByText("Budget has been created.")).toBeVisible({
      timeout: 15_000,
    })

    const initialRow = page
      .getByRole("row")
      .filter({ hasText: initialCategory })
    await expect(initialRow).toBeVisible()
    await expect(initialRow).toContainText("1.000.000 ₫")
    await expect(initialRow).toContainText(/(?<![\d.])0\s*₫/)
    await expect(initialRow).toContainText("Active")

    const initialProgress = initialRow.getByRole("progressbar")
    await expect(initialProgress).toBeVisible()
    await initialProgress.hover()
    await expect(page.getByRole("tooltip")).toContainText("0.0%")

    await initialRow.getByRole("button", { name: "Open menu" }).click()
    await page.getByRole("menuitem", { name: "Edit" }).click()

    const editDialog = page.getByRole("dialog")
    await expect(
      editDialog.getByRole("heading", { name: "Edit Budget" })
    ).toBeVisible()
    await editDialog.getByLabel("Category").click()
    await page
      .getByRole("option", { name: new RegExp(`^${updatedCategory}`) })
      .click()
    await editDialog.getByLabel("Amount").fill("1500000")
    await editDialog.getByRole("button", { name: "Update" }).click()

    await expect(page.getByText("Budget has been updated.")).toBeVisible({
      timeout: 15_000,
    })
    await expect(initialRow).toHaveCount(0)

    const updatedRow = page
      .getByRole("row")
      .filter({ hasText: updatedCategory })
    await expect(updatedRow).toBeVisible()
    await expect(updatedRow).toContainText("1.500.000 ₫")
    await expect(updatedRow).toContainText(/(?<![\d.])0\s*₫/)
    await expect(updatedRow).toContainText("Active")

    await deleteBudgetByCategory(page, updatedCategory)
  })

  test("updates a budget's displayed progress when an expense transaction is recorded in that category", async ({
    page,
  }) => {
    const tag = uniqueTag()
    const category = "Healthcare & Insurance"
    const expenseDescription = `E2E Budget Expense ${tag}`

    await page.goto("/budgets")
    await expect(page.getByRole("heading", { name: "Budgets" })).toBeVisible()
    await ensureNoBudgetForCategories(page, [category])

    await openAndSubmitAddBudgetDialog(page, {
      category,
      amount: "1000000",
    })
    await expect(page.getByText("Budget has been created.")).toBeVisible({
      timeout: 15_000,
    })

    const budgetRow = page.getByRole("row").filter({ hasText: category })
    await expect(budgetRow).toBeVisible()
    await expect(budgetRow).toContainText("1.000.000 ₫")
    await expect(budgetRow).toContainText(/(?<![\d.])0\s*₫/)

    const progressBar = budgetRow.getByRole("progressbar")
    await progressBar.hover()
    await expect(page.getByRole("tooltip")).toContainText("0.0%")

    // Record an expense transaction in the budgeted category on Today
    await page.goto("/transactions")
    await page.getByRole("button", { name: "Add" }).click()
    const txDialog = page.getByRole("dialog")
    await expect(
      txDialog.getByRole("heading", { name: "Add Transaction" })
    ).toBeVisible()
    await txDialog.getByRole("tab", { name: "Outflow" }).click()
    await txDialog.getByLabel("Category").click()
    await page.getByRole("option", { name: new RegExp(`^${category}`) }).click()
    await txDialog.getByLabel("Amount").fill("250000")
    await txDialog.getByLabel("Description").fill(expenseDescription)
    await selectTodayInDatePicker(page, txDialog, "Date")
    await txDialog.getByRole("button", { name: "Add" }).click()
    await expect(page.getByText("Transaction has been created.")).toBeVisible({
      timeout: 15_000,
    })

    // Verify budget progress reflects the 250,000 VND expense (25.0% of 1,000,000 VND)
    await page.goto("/budgets")
    await expect(budgetRow).toBeVisible()
    await expect(budgetRow).toContainText("1.000.000 ₫")
    await expect(budgetRow).toContainText("250.000 ₫")
    await expect(budgetRow).toContainText("750.000 ₫")

    await progressBar.hover()
    await expect(page.getByRole("tooltip")).toContainText("25.0%")

    // Clean up the budget and the expense transaction
    await deleteBudgetByCategory(page, category)

    await page.goto("/transactions")
    await deleteRowViaMenu(page, {
      rowText: expenseDescription,
      dialogHeading: "Delete Transaction",
      confirmMessage:
        "Are you sure you want to delete this transaction? This action cannot be undone.",
      successToast: "Transaction has been deleted.",
    })
  })

  test("displays the server-side duplicate error message when creating a budget that already exists", async ({
    page,
  }) => {
    const category = "Entertainment & Leisure"

    await page.goto("/budgets")
    await expect(page.getByRole("heading", { name: "Budgets" })).toBeVisible()
    await ensureNoBudgetForCategories(page, [category])

    await openAndSubmitAddBudgetDialog(page, {
      category,
      amount: "800000",
    })
    await expect(page.getByText("Budget has been created.")).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      page.getByRole("row").filter({ hasText: category })
    ).toHaveCount(1)

    await openAndSubmitAddBudgetDialog(page, {
      category,
      amount: "800000",
    })
    await expect(page.getByText("This budget already exists!")).toBeVisible({
      timeout: 15_000,
    })

    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden()
    await expect(
      page.getByRole("row").filter({ hasText: category })
    ).toHaveCount(1)

    await deleteBudgetByCategory(page, category)
  })

  test("creates a goal, edits its values, and deletes it from the goals list", async ({
    page,
  }) => {
    const tag = uniqueTag()
    const initialGoalName = `E2E Emergency Fund ${tag}`
    const updatedGoalName = `E2E Vacation Fund ${tag}`

    await page.goto("/goals")
    await expect(page.getByRole("heading", { name: "Goals" })).toBeVisible()

    await openAndSubmitAddGoalDialog(page, {
      category: "Salary & Bonus",
      name: initialGoalName,
      targetAmount: "10000000",
    })
    await expect(page.getByText("Goal has been created.")).toBeVisible({
      timeout: 15_000,
    })

    const initialRow = page
      .getByRole("row")
      .filter({ hasText: initialGoalName })
    await expect(initialRow).toBeVisible()
    await expect(initialRow).toContainText("Salary & Bonus")
    await expect(initialRow).toContainText("10.000.000 ₫")
    await expect(initialRow).toContainText(/(?<![\d.])0\s*₫/)
    await expect(initialRow).toContainText("Active")

    await initialRow.getByRole("button", { name: "Open menu" }).click()
    await page.getByRole("menuitem", { name: "Edit" }).click()

    const editDialog = page.getByRole("dialog")
    await expect(
      editDialog.getByRole("heading", { name: "Edit Goal" })
    ).toBeVisible()
    await editDialog.getByLabel("Category").click()
    await page.getByRole("option", { name: /^Investment & Passive/ }).click()
    await editDialog.getByLabel("Goal Name").fill(updatedGoalName)
    await editDialog.getByLabel("Target Amount").fill("15000000")
    await editDialog.getByRole("button", { name: "Update" }).click()

    await expect(page.getByText("Goal has been updated.")).toBeVisible({
      timeout: 15_000,
    })
    await expect(initialRow).toHaveCount(0)

    const updatedRow = page
      .getByRole("row")
      .filter({ hasText: updatedGoalName })
    await expect(updatedRow).toBeVisible()
    await expect(updatedRow).toContainText("Investment & Passive")
    await expect(updatedRow).toContainText("15.000.000 ₫")
    await expect(updatedRow).toContainText(/(?<![\d.])0\s*₫/)
    await expect(updatedRow).toContainText("Active")

    await deleteGoalByName(page, updatedGoalName)
  })

  test("displays the server-side duplicate error message when creating a goal that already exists", async ({
    page,
  }) => {
    const tag = uniqueTag()
    const duplicateGoalName = `E2E Duplicate Goal ${tag}`

    await page.goto("/goals")

    await openAndSubmitAddGoalDialog(page, {
      category: "Gifts & Support",
      name: duplicateGoalName,
      targetAmount: "5000000",
    })
    await expect(page.getByText("Goal has been created.")).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      page.getByRole("row").filter({ hasText: duplicateGoalName })
    ).toHaveCount(1)

    await openAndSubmitAddGoalDialog(page, {
      category: "Gifts & Support",
      name: duplicateGoalName,
      targetAmount: "5000000",
    })
    await expect(page.getByText("This goal already exists!")).toBeVisible({
      timeout: 15_000,
    })

    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden()
    await expect(
      page.getByRole("row").filter({ hasText: duplicateGoalName })
    ).toHaveCount(1)

    await deleteGoalByName(page, duplicateGoalName)
  })

  test("creates a recurring transaction, displays the server-side duplicate error message on duplicate creation, and deletes it", async ({
    page,
  }) => {
    const tag = uniqueTag()
    const recurringDescription = `E2E Rent Subscription ${tag}`

    await page.goto("/recurring")
    await expect(page.getByRole("heading", { name: "Recurring" })).toBeVisible()

    await openAndSubmitAddRecurringDialog(page, {
      type: "Outflow",
      category: "Housing & Utilities",
      amount: "3500000",
      description: recurringDescription,
    })
    await expect(
      page.getByText("Recurring transaction has been created.")
    ).toBeVisible({ timeout: 15_000 })

    const recurringRow = page
      .getByRole("row")
      .filter({ hasText: recurringDescription })
    await expect(recurringRow).toBeVisible()
    await expect(recurringRow).toContainText("No end date")
    await expect(recurringRow).toContainText("Outflow")
    await expect(recurringRow).toContainText("Housing & Utilities")
    await expect(recurringRow).toContainText("3.500.000 ₫")
    await expect(recurringRow).toContainText("Monthly")
    await expect(recurringRow).toContainText("Active")

    await openAndSubmitAddRecurringDialog(page, {
      type: "Outflow",
      category: "Housing & Utilities",
      amount: "3500000",
      description: recurringDescription,
    })
    await expect(
      page.getByText("This recurring transaction already exists!")
    ).toBeVisible({ timeout: 15_000 })

    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden()
    await expect(recurringRow).toHaveCount(1)

    await deleteRowViaMenu(page, {
      rowText: recurringDescription,
      dialogHeading: "Delete Recurring Transaction",
      confirmMessage:
        "Are you sure you want to delete this recurring transaction? This action cannot be undone.",
      successToast: "Recurring transaction has been deleted.",
    })
  })
})
