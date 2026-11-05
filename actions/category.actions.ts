"use server"

import { cacheTag } from "next/cache"
import { ObjectId } from "mongodb"
import { getExtracted } from "next-intl/server"
import { z } from "zod"

import { runDomainMutation } from "@/lib/action-handler"
import {
  getBudgetsCollection,
  getCategoriesCollection,
  getGoalsCollection,
  getRecurringTransactionsCollection,
  getTransactionsCollection,
} from "@/lib/collections"
import { withTransaction } from "@/lib/db"
import type { ActionResponse, Category } from "@/lib/definitions"
import { RATE_LIMIT_PRESETS } from "@/lib/rate-limit"
import { getSchemas } from "@/schemas/server"
import type { CategoryFormValues } from "@/schemas/types"

import { getSession } from "./session.actions"

export async function createCustomCategory(
  values: CategoryFormValues
): Promise<ActionResponse> {
  const t = await getExtracted()

  return runDomainMutation({
    rawInput: values,
    schema: async () => (await getSchemas()).createCategorySchema(),
    rateLimit: { domain: "category", preset: RATE_LIMIT_PRESETS.NORMAL },
    revalidate: ["categories"],
    successMessage: t("Category has been created."),
    duplicateKeyMessage: t("This category already exists!"),
    fallbackErrorMessage: t(
      "Failed to create category! Please try again later."
    ),
    execute: async ({ input, user }) => {
      const categoriesCollection = await getCategoriesCollection()

      await categoriesCollection.insertOne({
        userId: new ObjectId(user.id),
        type: input.type,
        label: input.label,
        description: input.description,
      })
    },
  })
}

export async function updateCustomCategory(
  id: string,
  values: CategoryFormValues
): Promise<ActionResponse> {
  const t = await getExtracted()

  return runDomainMutation({
    rawInput: { id, values },
    validateId: {
      id,
      message: t("Invalid category ID!"),
    },
    schema: async () => {
      const { createCategorySchema } = await getSchemas()
      return z.object({
        id: z.string(),
        values: createCategorySchema(),
      })
    },
    rateLimit: { domain: "category", preset: RATE_LIMIT_PRESETS.NORMAL },
    revalidate: ["categories"],
    successMessage: t("Category has been updated."),
    duplicateKeyMessage: t("This category already exists!"),
    fallbackErrorMessage: t(
      "Failed to update category! Please try again later."
    ),
    execute: async ({ input, user }) => {
      const categoriesCollection = await getCategoriesCollection()

      const result = await categoriesCollection.updateOne(
        {
          _id: new ObjectId(input.id),
          userId: new ObjectId(user.id),
          type: input.values.type,
        },
        {
          $set: {
            label: input.values.label,
            description: input.values.description,
          },
        }
      )

      if (result.matchedCount === 0) {
        const existingCategory = await categoriesCollection.findOne(
          {
            _id: new ObjectId(input.id),
            userId: new ObjectId(user.id),
          },
          { projection: { type: 1 } }
        )

        if (existingCategory && existingCategory.type !== input.values.type) {
          return {
            error: t("Category type cannot be changed!"),
          }
        }

        return {
          error: t("Category not found or you don't have permission to edit!"),
        }
      }
    },
  })
}

export async function deleteCustomCategory(
  categoryId: string
): Promise<ActionResponse> {
  const t = await getExtracted()

  return runDomainMutation<string>({
    rawInput: categoryId,
    validateId: {
      id: categoryId,
      message: t("Invalid category ID!"),
    },
    rateLimit: { domain: "category", preset: RATE_LIMIT_PRESETS.STRICT },
    revalidate: ["categories"],
    successMessage: t("Category has been deleted."),
    fallbackErrorMessage: t(
      "Failed to delete category! Please try again later."
    ),
    execute: async ({ input: categoryId, user }) => {
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

      return withTransaction(async (dbSession) => {
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
      })
    },
  })
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
