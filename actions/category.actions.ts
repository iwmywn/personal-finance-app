"use server"

import { cacheTag, updateTag } from "next/cache"
import { ObjectId } from "mongodb"
import { getExtracted } from "next-intl/server"

import {
  getBudgetsCollection,
  getCategoriesCollection,
  getGoalsCollection,
  getRecurringTransactionsCollection,
  getTransactionsCollection,
} from "@/lib/collections"
import { withTransaction } from "@/lib/db"
import type { ActionResponse, Category } from "@/lib/definitions"
import { isDuplicateKeyError } from "@/lib/indexes"
import { getSchemas } from "@/schemas/server"
import type { CategoryFormValues } from "@/schemas/types"

import { getSession } from "./session.actions"

export async function createCustomCategory(
  values: CategoryFormValues
): Promise<ActionResponse> {
  const t = await getExtracted()

  try {
    const { createCategorySchema } = await getSchemas()
    const parsedValues = createCategorySchema().safeParse(values)

    if (!parsedValues.success) {
      return { error: t("Invalid data!") }
    }

    const { error, user, session } = await getSession()

    if (!user || !session) {
      return { error }
    }

    const categoriesCollection = await getCategoriesCollection()

    await categoriesCollection.insertOne({
      userId: new ObjectId(user.id),
      type: parsedValues.data.type,
      label: parsedValues.data.label,
      description: parsedValues.data.description,
    })

    updateTag(`categories-${user.id}`)
    return { success: t("Category has been created.") }
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { error: t("This category already exists!") }
    }
    console.error("Error creating custom category:", error)
    return { error: t("Failed to create category! Please try again later.") }
  }
}

export async function updateCustomCategory(
  categoryId: string,
  values: CategoryFormValues
): Promise<ActionResponse> {
  const t = await getExtracted()

  try {
    if (!ObjectId.isValid(categoryId)) {
      return {
        error: t("Invalid category ID!"),
      }
    }

    const { createCategorySchema } = await getSchemas()
    const parsedValues = createCategorySchema().safeParse(values)

    if (!parsedValues.success) {
      return { error: t("Invalid data!") }
    }

    const { error, user, session } = await getSession()

    if (!user || !session) {
      return { error }
    }

    const categoriesCollection = await getCategoriesCollection()

    const result = await categoriesCollection.updateOne(
      {
        _id: new ObjectId(categoryId),
        userId: new ObjectId(user.id),
        type: parsedValues.data.type,
      },
      {
        $set: {
          label: parsedValues.data.label,
          description: parsedValues.data.description,
        },
      }
    )

    if (result.matchedCount === 0) {
      const existingCategory = await categoriesCollection.findOne(
        {
          _id: new ObjectId(categoryId),
          userId: new ObjectId(user.id),
        },
        { projection: { type: 1 } }
      )

      if (
        existingCategory &&
        existingCategory.type !== parsedValues.data.type
      ) {
        return {
          error: t("Category type cannot be changed!"),
        }
      }

      return {
        error: t("Category not found or you don't have permission to edit!"),
      }
    }

    updateTag(`categories-${user.id}`)
    return { success: t("Category has been updated.") }
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { error: t("This category already exists!") }
    }
    console.error("Error updating custom category:", error)
    return { error: t("Failed to update category! Please try again later.") }
  }
}

export async function deleteCustomCategory(
  categoryId: string
): Promise<ActionResponse> {
  const t = await getExtracted()

  try {
    if (!ObjectId.isValid(categoryId)) {
      return {
        error: t("Invalid category ID!"),
      }
    }

    const { error, user, session } = await getSession()

    if (!user || !session) {
      return { error }
    }

    const [
      categoriesCollection,
      transactionsCollection,
      budgetsCollection,
      goalsCollection,
      recurringTransactionsCollection,
    ] = await Promise.all([
      getCategoriesCollection(),
      getTransactionsCollection(),
      getBudgetsCollection(),
      getGoalsCollection(),
      getRecurringTransactionsCollection(),
    ])

    const result = await withTransaction(async (dbSession) => {
      const existingCategory = await categoriesCollection.findOne(
        {
          _id: new ObjectId(categoryId),
          userId: new ObjectId(user.id),
        },
        { session: dbSession }
      )

      if (!existingCategory) {
        return {
          error: t(
            "Category not found or you don't have permission to delete!"
          ),
        }
      }

      const [
        transactionCount,
        budgetCount,
        goalCount,
        recurringTransactionCount,
      ] = await Promise.all([
        transactionsCollection.countDocuments(
          {
            userId: new ObjectId(user.id),
            categoryKey: categoryId,
          },
          { session: dbSession }
        ),
        budgetsCollection.countDocuments(
          {
            userId: new ObjectId(user.id),
            categoryKey: categoryId,
          },
          { session: dbSession }
        ),
        goalsCollection.countDocuments(
          {
            userId: new ObjectId(user.id),
            categoryKey: categoryId,
          },
          { session: dbSession }
        ),
        recurringTransactionsCollection.countDocuments(
          {
            userId: new ObjectId(user.id),
            categoryKey: categoryId,
          },
          { session: dbSession }
        ),
      ])

      if (transactionCount > 0) {
        return {
          error: t(
            "Cannot delete category. There are {count} transactions using this category. Please delete those transactions first.",
            {
              count: transactionCount.toString(),
            }
          ),
        }
      }

      if (budgetCount > 0) {
        return {
          error: t(
            "Cannot delete category. There are {count} budgets using this category. Please delete those budgets first.",
            {
              count: budgetCount.toString(),
            }
          ),
        }
      }

      if (goalCount > 0) {
        return {
          error: t(
            "Cannot delete category. There are {count} goals using this category. Please delete those goals first.",
            {
              count: goalCount.toString(),
            }
          ),
        }
      }

      if (recurringTransactionCount > 0) {
        return {
          error: t(
            "Cannot delete category. There are {count} recurring transactions using this category. Please delete those recurring transactions first.",
            {
              count: recurringTransactionCount.toString(),
            }
          ),
        }
      }

      await categoriesCollection.deleteOne(
        {
          _id: new ObjectId(categoryId),
          userId: new ObjectId(user.id),
        },
        { session: dbSession }
      )

      return { success: t("Category has been deleted.") }
    })

    if (result.success) {
      updateTag(`categories-${user.id}`)
    }

    return result
  } catch (error) {
    console.error("Error deleting custom category:", error)
    return { error: t("Failed to delete category! Please try again later.") }
  }
}

export async function getCustomCategories(): Promise<{
  error?: string
  customCategories?: Category[]
}> {
  const { error, user, session } = await getSession()

  if (!user || !session) {
    return { error }
  }

  return getCachedCustomCategories(user.id)
}

async function getCachedCustomCategories(userId: string) {
  "use cache: private"
  cacheTag(`categories-${userId}`)

  const t = await getExtracted()

  try {
    const categoriesCollection = await getCategoriesCollection()
    const categories = await categoriesCollection
      .find({ userId: new ObjectId(userId) })
      .sort({ _id: -1 })
      .toArray()

    return {
      customCategories: categories.map((category) => ({
        ...category,
        _id: category._id.toString(),
        userId: category.userId.toString(),
      })) as Category[],
    }
  } catch (error) {
    console.error("Error fetching custom categories:", error)
    return {
      error: t("Failed to load custom categories! Please try again later."),
    }
  }
}
