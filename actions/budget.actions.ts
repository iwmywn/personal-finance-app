"use server"

import { cacheTag, updateTag } from "next/cache"
import { ObjectId } from "mongodb"
import { getExtracted } from "next-intl/server"

import { getBudgetsCollection } from "@/lib/collections"
import type { ActionResponse, Budget } from "@/lib/definitions"
import { isDuplicateKeyError } from "@/lib/indexes"
import { getSchemas } from "@/schemas/server"
import type { BudgetFormValues } from "@/schemas/types"

import { isValidUserCategory } from "./category.server"
import { getSession } from "./session.actions"
import { toDecimal128 } from "./utils"

export async function createBudget(
  values: BudgetFormValues
): Promise<ActionResponse> {
  const t = await getExtracted()

  try {
    const { createBudgetSchema } = await getSchemas()
    const parsedValues = createBudgetSchema().safeParse(values)

    if (!parsedValues.success) {
      return { error: t("Invalid data!") }
    }

    const { error, user, session } = await getSession()

    if (!user || !session) {
      return { error }
    }

    const isValidCategory = await isValidUserCategory(
      user.id,
      parsedValues.data.categoryKey,
      "outflow"
    )

    if (!isValidCategory) {
      return { error: t("Invalid category!") }
    }

    const budgetsCollection = await getBudgetsCollection()

    await budgetsCollection.insertOne({
      userId: new ObjectId(user.id),
      categoryKey: parsedValues.data.categoryKey,
      currency: parsedValues.data.currency,
      allocatedAmount: toDecimal128(parsedValues.data.allocatedAmount),
      startDate: parsedValues.data.startDate,
      endDate: parsedValues.data.endDate,
    })

    updateTag(`budgets-${user.id}`)
    return { success: t("Budget has been created.") }
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { error: t("This budget already exists!") }
    }
    console.error("Error creating budget:", error)
    return { error: t("Failed to create budget! Please try again later.") }
  }
}

export async function updateBudget(
  budgetId: string,
  values: BudgetFormValues
): Promise<ActionResponse> {
  const t = await getExtracted()

  try {
    if (!ObjectId.isValid(budgetId)) {
      return {
        error: t("Invalid budget ID!"),
      }
    }

    const { createBudgetSchema } = await getSchemas()
    const parsedValues = createBudgetSchema().safeParse(values)

    if (!parsedValues.success) {
      return { error: t("Invalid data!") }
    }

    const { error, user, session } = await getSession()

    if (!user || !session) {
      return { error }
    }

    const isValidCategory = await isValidUserCategory(
      user.id,
      parsedValues.data.categoryKey,
      "outflow"
    )

    if (!isValidCategory) {
      return { error: t("Invalid category!") }
    }

    const budgetsCollection = await getBudgetsCollection()
    const result = await budgetsCollection.updateOne(
      { _id: new ObjectId(budgetId), userId: new ObjectId(user.id) },
      {
        $set: {
          categoryKey: parsedValues.data.categoryKey,
          currency: parsedValues.data.currency,
          allocatedAmount: toDecimal128(parsedValues.data.allocatedAmount),
          startDate: parsedValues.data.startDate,
          endDate: parsedValues.data.endDate,
        },
      }
    )

    if (result.matchedCount === 0) {
      return {
        error: t("Budget not found or you don't have permission to edit!"),
      }
    }

    updateTag(`budgets-${user.id}`)
    return { success: t("Budget has been updated.") }
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { error: t("This budget already exists!") }
    }
    console.error("Error updating budget:", error)
    return { error: t("Failed to update budget! Please try again later.") }
  }
}

export async function deleteBudget(budgetId: string): Promise<ActionResponse> {
  const t = await getExtracted()

  try {
    if (!ObjectId.isValid(budgetId)) {
      return {
        error: t("Invalid budget ID!"),
      }
    }

    const { error, user, session } = await getSession()

    if (!user || !session) {
      return { error }
    }

    const budgetsCollection = await getBudgetsCollection()
    const result = await budgetsCollection.deleteOne({
      _id: new ObjectId(budgetId),
      userId: new ObjectId(user.id),
    })

    if (result.deletedCount === 0) {
      return {
        error: t("Budget not found or you don't have permission to delete!"),
      }
    }

    updateTag(`budgets-${user.id}`)
    return { success: t("Budget has been deleted.") }
  } catch (error) {
    console.error("Error deleting budget:", error)
    return { error: t("Failed to delete budget! Please try again later.") }
  }
}

export async function getBudgets(): Promise<{
  error?: string
  budgets?: Budget[]
}> {
  const { error, user, session } = await getSession()

  if (!user || !session) {
    return { error }
  }

  return getCachedBudgets(user.id)
}

async function getCachedBudgets(userId: string) {
  "use cache: private"
  cacheTag(`budgets-${userId}`)

  const t = await getExtracted()

  try {
    const budgetsCollection = await getBudgetsCollection()
    const budgets = await budgetsCollection
      .find({ userId: new ObjectId(userId) })
      .sort({ startDate: -1, _id: -1 })
      .toArray()

    return {
      budgets: budgets.map((budget) => ({
        ...budget,
        _id: budget._id.toString(),
        userId: budget.userId.toString(),
        allocatedAmount: budget.allocatedAmount.toString(),
      })) as Budget[],
    }
  } catch (error) {
    console.error("Error fetching budgets:", error)
    return {
      error: t("Failed to load budgets! Please try again later."),
    }
  }
}
