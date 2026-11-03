import type { Page } from "@playwright/test"

import {
  deleteRowViaMenu,
  expect,
  selectPreviousMonth15thToTodayRange,
  selectTodayInDatePicker,
  test,
  uniqueTag,
} from "@/tests/e2e/fixtures"

interface CreateCategoryInput {
  type: "Inflow" | "Outflow"
  name: string
  description: string
}

async function openAndSubmitAddCategoryDialog(
  page: Page,
  input: CreateCategoryInput
): Promise<void> {
  await page.getByRole("button", { name: "Add" }).click()

  const dialog = page.getByRole("dialog")
  await expect(
    dialog.getByRole("heading", { name: "Add Category" })
  ).toBeVisible()

  await dialog.getByRole("tab", { name: input.type }).click()
  await dialog.getByLabel("Category Name").fill(input.name)
  await dialog.getByLabel("Description").fill(input.description)
  await dialog.getByRole("button", { name: "Add" }).click()
}

async function attemptDeleteCategoryByName(
  page: Page,
  categoryName: string
): Promise<void> {
  const row = page.getByRole("row").filter({ hasText: categoryName })
  await row.getByRole("button", { name: "Open menu" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()

  const alertDialog = page.getByRole("alertdialog")
  await expect(
    alertDialog.getByRole("heading", { name: "Delete Category" })
  ).toBeVisible()
  await expect(
    alertDialog.getByText(
      "Are you sure you want to delete this category? This action cannot be undone."
    )
  ).toBeVisible()
  await alertDialog.getByRole("button", { name: "Delete" }).click()
}

async function deleteUnusedCategoryByName(
  page: Page,
  categoryName: string
): Promise<void> {
  await deleteRowViaMenu(page, {
    rowText: categoryName,
    dialogHeading: "Delete Category",
    confirmMessage:
      "Are you sure you want to delete this category? This action cannot be undone.",
    successToast: "Category has been deleted.",
  })
}

test.describe("Categories CRUD, duplicate guard, and in-use deletion refusal", () => {
  test("creates custom categories, lists them on the categories page, and makes them selectable in transaction, budget, goal, and recurring transaction forms", async ({
    page,
  }) => {
    const tag = uniqueTag()
    const inflowCategoryName = `E2E Freelance ${tag}`
    const inflowDescription = `Custom inflow category ${tag}`
    const outflowCategoryName = `E2E Pet Care ${tag}`
    const outflowDescription = `Custom outflow category ${tag}`

    await page.goto("/categories")
    await expect(
      page.getByRole("heading", { name: "Categories" })
    ).toBeVisible()

    await openAndSubmitAddCategoryDialog(page, {
      type: "Inflow",
      name: inflowCategoryName,
      description: inflowDescription,
    })
    await expect(page.getByText("Category has been created.")).toBeVisible()

    const inflowRow = page
      .getByRole("row")
      .filter({ hasText: inflowCategoryName })
    await expect(inflowRow).toBeVisible()
    await expect(inflowRow).toContainText(inflowDescription)
    await expect(inflowRow).toContainText("Inflow")

    await openAndSubmitAddCategoryDialog(page, {
      type: "Outflow",
      name: outflowCategoryName,
      description: outflowDescription,
    })

    const outflowRow = page
      .getByRole("row")
      .filter({ hasText: outflowCategoryName })
    await expect(outflowRow).toBeVisible()
    await expect(outflowRow).toContainText(outflowDescription)
    await expect(outflowRow).toContainText("Outflow")

    // Verify selectable when creating a transaction
    await page.goto("/transactions")
    await page.getByRole("button", { name: "Add" }).click()
    const txDialog = page.getByRole("dialog")
    await expect(
      txDialog.getByRole("heading", { name: "Add Transaction" })
    ).toBeVisible()
    await txDialog.getByLabel("Category").click()
    await page
      .getByRole("option", { name: new RegExp(`^${inflowCategoryName}`) })
      .click()
    await expect(txDialog.getByLabel("Category")).toContainText(
      inflowCategoryName
    )
    await txDialog.getByRole("button", { name: "Cancel" }).click()
    await expect(txDialog).toBeHidden()

    // Verify selectable when creating a budget (Outflow categories)
    await page.goto("/budgets")
    await page.getByRole("button", { name: "Add" }).click()
    const budgetDialog = page.getByRole("dialog")
    await expect(
      budgetDialog.getByRole("heading", { name: "Add Budget" })
    ).toBeVisible()
    await budgetDialog.getByLabel("Category").click()
    await page
      .getByRole("option", { name: new RegExp(`^${outflowCategoryName}`) })
      .click()
    await expect(budgetDialog.getByLabel("Category")).toContainText(
      outflowCategoryName
    )
    await budgetDialog.getByRole("button", { name: "Cancel" }).click()
    await expect(budgetDialog).toBeHidden()

    // Verify selectable when creating a goal (Inflow categories)
    await page.goto("/goals")
    await page.getByRole("button", { name: "Add" }).click()
    const goalDialog = page.getByRole("dialog")
    await expect(
      goalDialog.getByRole("heading", { name: "Add Goal" })
    ).toBeVisible()
    await goalDialog.getByLabel("Category").click()
    await page
      .getByRole("option", { name: new RegExp(`^${inflowCategoryName}`) })
      .click()
    await expect(goalDialog.getByLabel("Category")).toContainText(
      inflowCategoryName
    )
    await goalDialog.getByRole("button", { name: "Cancel" }).click()
    await expect(goalDialog).toBeHidden()

    // Verify selectable when creating a recurring transaction
    await page.goto("/recurring")
    await page.getByRole("button", { name: "Add" }).click()
    const recurringDialog = page.getByRole("dialog")
    await expect(
      recurringDialog.getByRole("heading", {
        name: "Add Recurring Transaction",
      })
    ).toBeVisible()
    await recurringDialog.getByRole("tab", { name: "Outflow" }).click()
    await recurringDialog.getByLabel("Category").click()
    await page
      .getByRole("option", { name: new RegExp(`^${outflowCategoryName}`) })
      .click()
    await expect(recurringDialog.getByLabel("Category")).toContainText(
      outflowCategoryName
    )
    await recurringDialog.getByRole("button", { name: "Cancel" }).click()
    await expect(recurringDialog).toBeHidden()
  })

  test("edits a custom category and deletes an unused custom category from the list", async ({
    page,
  }) => {
    const tag = uniqueTag()
    const initialName = `E2E Hobby ${tag}`
    const initialDescription = `Initial hobby description ${tag}`
    const updatedName = `E2E Crafts ${tag}`
    const updatedDescription = `Updated crafts description ${tag}`

    await page.goto("/categories")

    await openAndSubmitAddCategoryDialog(page, {
      type: "Outflow",
      name: initialName,
      description: initialDescription,
    })
    await expect(page.getByText("Category has been created.")).toBeVisible()

    const initialRow = page.getByRole("row").filter({ hasText: initialName })
    await expect(initialRow).toBeVisible()
    await expect(initialRow).toContainText(initialDescription)
    await expect(initialRow).toContainText("Outflow")

    await initialRow.getByRole("button", { name: "Open menu" }).click()
    await page.getByRole("menuitem", { name: "Edit" }).click()

    const editDialog = page.getByRole("dialog")
    await expect(
      editDialog.getByRole("heading", { name: "Edit Category" })
    ).toBeVisible()

    await editDialog.getByLabel("Category Name").fill(updatedName)
    await editDialog.getByLabel("Description").fill(updatedDescription)
    await editDialog.getByRole("button", { name: "Update" }).click()

    await expect(page.getByText("Category has been updated.")).toBeVisible()
    await expect(initialRow).toHaveCount(0)

    const updatedRow = page.getByRole("row").filter({ hasText: updatedName })
    await expect(updatedRow).toBeVisible()
    await expect(updatedRow).toContainText(updatedDescription)
    await expect(updatedRow).toContainText("Outflow")

    await deleteUnusedCategoryByName(page, updatedName)
  })

  test("displays the server-side duplicate error message when creating a category that already exists", async ({
    page,
  }) => {
    const tag = uniqueTag()
    const duplicateName = `E2E Duplicate Cat ${tag}`
    const description = `Duplicate check category ${tag}`

    await page.goto("/categories")

    await openAndSubmitAddCategoryDialog(page, {
      type: "Outflow",
      name: duplicateName,
      description,
    })
    await expect(page.getByText("Category has been created.")).toBeVisible()
    await expect(
      page.getByRole("row").filter({ hasText: duplicateName })
    ).toHaveCount(1)

    await openAndSubmitAddCategoryDialog(page, {
      type: "Outflow",
      name: duplicateName,
      description: `Another description ${tag}`,
    })

    await expect(page.getByText("This category already exists!")).toBeVisible()

    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden()

    await expect(
      page.getByRole("row").filter({ hasText: duplicateName })
    ).toHaveCount(1)
  })

  test("refuses to delete a custom category used by a transaction and keeps the category in the list", async ({
    page,
  }) => {
    const tag = uniqueTag()
    const categoryName = `E2E Guard TxCat ${tag}`
    const txDescription = `E2E Guard Tx ${tag}`

    try {
      await page.goto("/categories")
      await openAndSubmitAddCategoryDialog(page, {
        type: "Outflow",
        name: categoryName,
        description: `Transaction guard category ${tag}`,
      })
      await expect(page.getByText("Category has been created.")).toBeVisible()

      await page.goto("/transactions")
      await page.getByRole("button", { name: "Add" }).click()
      const txDialog = page.getByRole("dialog")
      await txDialog.getByRole("tab", { name: "Outflow" }).click()
      await txDialog.getByLabel("Category").click()
      await page
        .getByRole("option", { name: new RegExp(`^${categoryName}`) })
        .click()
      await txDialog.getByLabel("Amount").fill("150000")
      await txDialog.getByLabel("Description").fill(txDescription)
      await selectTodayInDatePicker(page, txDialog, "Date")
      await txDialog.getByRole("button", { name: "Add" }).click()
      await expect(
        page.getByText("Transaction has been created.")
      ).toBeVisible()

      await page.goto("/categories")
      await attemptDeleteCategoryByName(page, categoryName)
      await expect(
        page.getByText(
          "Cannot delete category. There are 1 transactions using this category. Please delete those transactions first."
        )
      ).toBeVisible()

      const alertDialog = page.getByRole("alertdialog")
      await alertDialog.getByRole("button", { name: "Cancel" }).click()
      await expect(alertDialog).toBeHidden()
      await expect(
        page.getByRole("row").filter({ hasText: categoryName })
      ).toBeVisible()
    } finally {
      // Clean up the transaction so shared worker state remains clean
      await page.goto("/transactions")
      const txRow = page.getByRole("row").filter({ hasText: txDescription })
      if ((await txRow.count()) > 0) {
        await deleteRowViaMenu(page, {
          rowText: txDescription,
          dialogHeading: "Delete Transaction",
          confirmMessage:
            "Are you sure you want to delete this transaction? This action cannot be undone.",
          successToast: "Transaction has been deleted.",
        })
      }
    }
  })

  test("refuses to delete a custom category used by a budget and keeps the category in the list", async ({
    page,
  }) => {
    const tag = uniqueTag()
    const categoryName = `E2E Guard BudgetCat ${tag}`

    try {
      await page.goto("/categories")
      await openAndSubmitAddCategoryDialog(page, {
        type: "Outflow",
        name: categoryName,
        description: `Budget guard category ${tag}`,
      })
      await expect(page.getByText("Category has been created.")).toBeVisible()

      await page.goto("/budgets")
      await page.getByRole("button", { name: "Add" }).click()
      const budgetDialog = page.getByRole("dialog")
      await expect(
        budgetDialog.getByRole("heading", { name: "Add Budget" })
      ).toBeVisible()
      await budgetDialog.getByLabel("Category").click()
      await page
        .getByRole("option", { name: new RegExp(`^${categoryName}`) })
        .click()
      await budgetDialog.getByLabel("Amount").fill("2000000")
      await selectPreviousMonth15thToTodayRange(page, budgetDialog)
      await budgetDialog.getByRole("button", { name: "Add" }).click()
      await expect(page.getByText("Budget has been created.")).toBeVisible()

      await page.goto("/categories")
      await attemptDeleteCategoryByName(page, categoryName)
      await expect(
        page.getByText(
          "Cannot delete category. There are 1 budgets using this category. Please delete those budgets first."
        )
      ).toBeVisible()

      const alertDialog = page.getByRole("alertdialog")
      await alertDialog.getByRole("button", { name: "Cancel" }).click()
      await expect(alertDialog).toBeHidden()
      await expect(
        page.getByRole("row").filter({ hasText: categoryName })
      ).toBeVisible()
    } finally {
      // Clean up the budget
      await page.goto("/budgets")
      const budgetRow = page.getByRole("row").filter({ hasText: categoryName })
      if ((await budgetRow.count()) > 0) {
        await deleteRowViaMenu(page, {
          rowText: categoryName,
          dialogHeading: "Delete Budget",
          confirmMessage: "Are you sure you want to delete this budget?",
          successToast: "Budget has been deleted.",
        })
      }
    }
  })

  test("refuses to delete a custom category used by a goal and keeps the category in the list", async ({
    page,
  }) => {
    const tag = uniqueTag()
    const categoryName = `E2E Guard GoalCat ${tag}`
    const goalName = `E2E Guard Goal ${tag}`

    try {
      await page.goto("/categories")
      await openAndSubmitAddCategoryDialog(page, {
        type: "Inflow",
        name: categoryName,
        description: `Goal guard category ${tag}`,
      })
      await expect(page.getByText("Category has been created.")).toBeVisible()

      await page.goto("/goals")
      await page.getByRole("button", { name: "Add" }).click()
      const goalDialog = page.getByRole("dialog")
      await expect(
        goalDialog.getByRole("heading", { name: "Add Goal" })
      ).toBeVisible()
      await goalDialog.getByLabel("Category").click()
      await page
        .getByRole("option", { name: new RegExp(`^${categoryName}`) })
        .click()
      await goalDialog.getByLabel("Goal Name").fill(goalName)
      await goalDialog.getByLabel("Target Amount").fill("5000000")
      await selectPreviousMonth15thToTodayRange(page, goalDialog)
      await goalDialog.getByRole("button", { name: "Add" }).click()
      await expect(page.getByText("Goal has been created.")).toBeVisible()

      await page.goto("/categories")
      await attemptDeleteCategoryByName(page, categoryName)
      await expect(
        page.getByText(
          "Cannot delete category. There are 1 goals using this category. Please delete those goals first."
        )
      ).toBeVisible()

      const alertDialog = page.getByRole("alertdialog")
      await alertDialog.getByRole("button", { name: "Cancel" }).click()
      await expect(alertDialog).toBeHidden()
      await expect(
        page.getByRole("row").filter({ hasText: categoryName })
      ).toBeVisible()
    } finally {
      // Clean up the goal
      await page.goto("/goals")
      const goalRow = page.getByRole("row").filter({ hasText: goalName })
      if ((await goalRow.count()) > 0) {
        await deleteRowViaMenu(page, {
          rowText: goalName,
          dialogHeading: "Delete Goal",
          confirmMessage: "Are you sure you want to delete this goal?",
          successToast: "Goal has been deleted.",
        })
      }
    }
  })

  test("refuses to delete a custom category used by a recurring transaction and keeps the category in the list", async ({
    page,
  }) => {
    const tag = uniqueTag()
    const categoryName = `E2E Guard RecCat ${tag}`
    const recurringDescription = `E2E Guard Recurring ${tag}`

    try {
      await page.goto("/categories")
      await openAndSubmitAddCategoryDialog(page, {
        type: "Inflow",
        name: categoryName,
        description: `Recurring guard category ${tag}`,
      })
      await expect(page.getByText("Category has been created.")).toBeVisible()

      await page.goto("/recurring")
      await page.getByRole("button", { name: "Add" }).click()
      const recurringDialog = page.getByRole("dialog")
      await expect(
        recurringDialog.getByRole("heading", {
          name: "Add Recurring Transaction",
        })
      ).toBeVisible()
      await recurringDialog.getByRole("tab", { name: "Inflow" }).click()
      await recurringDialog.getByLabel("Category").click()
      await page
        .getByRole("option", { name: new RegExp(`^${categoryName}`) })
        .click()
      await recurringDialog.getByLabel("Amount").fill("1000000")
      await recurringDialog.getByLabel("Description").fill(recurringDescription)
      await selectTodayInDatePicker(page, recurringDialog, "Start Date")
      await recurringDialog.getByRole("button", { name: "Add" }).click()
      await expect(
        page.getByText("Recurring transaction has been created.")
      ).toBeVisible()

      await page.goto("/categories")
      await attemptDeleteCategoryByName(page, categoryName)
      await expect(
        page.getByText(
          "Cannot delete category. There are 1 recurring transactions using this category. Please delete those recurring transactions first."
        )
      ).toBeVisible()

      const alertDialog = page.getByRole("alertdialog")
      await alertDialog.getByRole("button", { name: "Cancel" }).click()
      await expect(alertDialog).toBeHidden()
      await expect(
        page.getByRole("row").filter({ hasText: categoryName })
      ).toBeVisible()
    } finally {
      // Clean up the recurring transaction
      await page.goto("/recurring")
      const recurringRow = page
        .getByRole("row")
        .filter({ hasText: recurringDescription })
      if ((await recurringRow.count()) > 0) {
        await deleteRowViaMenu(page, {
          rowText: recurringDescription,
          dialogHeading: "Delete Recurring Transaction",
          confirmMessage:
            "Are you sure you want to delete this recurring transaction?",
          successToast: "Recurring transaction has been deleted.",
        })
      }
    }
  })
})
