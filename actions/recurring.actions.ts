"use server"

import { cacheTag, updateTag } from "next/cache"
import { ObjectId } from "mongodb"
import { getExtracted } from "next-intl/server"

import { getRecurringTransactionsCollection } from "@/lib/collections"
import type { ActionResponse, RecurringTransaction } from "@/lib/definitions"
import { isDuplicateKeyError } from "@/lib/indexes"
import { getSchemas } from "@/schemas/server"
import type { RecurringTransactionFormValues } from "@/schemas/types"

import { isValidUserCategory } from "./category.server"
import { getSession } from "./session.actions"
import { toDecimal128 } from "./utils"

export async function createRecurringTransaction(
  values: RecurringTransactionFormValues
): Promise<ActionResponse> {
  const t = await getExtracted()

  try {
    const { createRecurringTransactionSchema } = await getSchemas()
    const parsedValues = createRecurringTransactionSchema().safeParse(values)

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
      parsedValues.data.type
    )

    if (!isValidCategory) {
      return { error: t("Invalid category!") }
    }

    const recurringCollection = await getRecurringTransactionsCollection()

    await recurringCollection.insertOne({
      userId: new ObjectId(user.id),
      type: parsedValues.data.type,
      categoryKey: parsedValues.data.categoryKey,
      amount: toDecimal128(parsedValues.data.amount),
      currency: parsedValues.data.currency,
      description: parsedValues.data.description,
      frequency: parsedValues.data.frequency,
      randomEveryXDays: parsedValues.data.randomEveryXDays,
      startDate: parsedValues.data.startDate,
      endDate: parsedValues.data.endDate,
      lastGeneratedDate: undefined,
    })

    updateTag(`recurringTransactions-${user.id}`)
    return {
      success: t("Recurring transaction has been created."),
    }
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { error: t("This recurring transaction already exists!") }
    }
    console.error("Error creating recurring transaction:", error)
    return {
      error: t(
        "Failed to create recurring transaction! Please try again later."
      ),
    }
  }
}

export async function deleteRecurringTransaction(
  recurringId: string
): Promise<ActionResponse> {
  const t = await getExtracted()

  try {
    if (!ObjectId.isValid(recurringId)) {
      return {
        error: t("Invalid recurring transaction ID!"),
      }
    }

    const { error, user, session } = await getSession()

    if (!user || !session) {
      return { error }
    }

    const recurringCollection = await getRecurringTransactionsCollection()
    const result = await recurringCollection.deleteOne({
      _id: new ObjectId(recurringId),
      userId: new ObjectId(user.id),
    })

    if (result.deletedCount === 0) {
      return {
        error: t(
          "Recurring transaction not found or you don't have permission to delete!"
        ),
      }
    }

    updateTag(`recurringTransactions-${user.id}`)
    return { success: t("Recurring transaction has been deleted.") }
  } catch (error) {
    console.error("Error deleting recurring transaction:", error)
    return {
      error: t(
        "Failed to delete recurring transaction! Please try again later."
      ),
    }
  }
}

export async function getRecurringTransactions(): Promise<{
  error?: string
  recurringTransactions?: RecurringTransaction[]
}> {
  const { error, user, session } = await getSession()

  if (!user || !session) {
    return { error }
  }

  return getCachedRecurringTransactions(user.id)
}

async function getCachedRecurringTransactions(userId: string) {
  "use cache: private"
  cacheTag(`recurringTransactions-${userId}`)

  const t = await getExtracted()

  try {
    const recurringCollection = await getRecurringTransactionsCollection()
    const recurringTransactions = await recurringCollection
      .find({ userId: new ObjectId(userId) })
      .sort({ startDate: -1, _id: -1 })
      .toArray()

    return {
      recurringTransactions: recurringTransactions.map((recurring) => ({
        ...recurring,
        _id: recurring._id.toString(),
        userId: recurring.userId.toString(),
        amount: recurring.amount.toString(),
      })) as RecurringTransaction[],
    }
  } catch (error) {
    console.error("Error fetching recurring transactions:", error)
    return {
      error: t(
        "Failed to load recurring transactions! Please try again later."
      ),
    }
  }
}
