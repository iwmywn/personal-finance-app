"use server"

import { cacheTag, updateTag } from "next/cache"
import { after } from "next/server"
import { ObjectId } from "mongodb"
import { getExtracted } from "next-intl/server"

import { getTransactionsCollection } from "@/lib/collections"
import type { Currency } from "@/lib/currency"
import type { ActionResponse, Transaction } from "@/lib/definitions"
import { getSchemas } from "@/schemas/server"
import type { TransactionFormValues } from "@/schemas/types"

import { isValidUserCategory } from "./category.server"
import {
  convertTransactionsToCurrency,
  enqueueMissingExchangeRateDate,
  ensureExchangeRateForDate,
} from "./exchange-rates.actions"
import { getSession } from "./session.actions"
import { toDecimal128 } from "./utils"

export async function createTransaction(
  values: TransactionFormValues
): Promise<ActionResponse> {
  const t = await getExtracted()

  try {
    const { createTransactionSchema } = await getSchemas()
    const parsedValues = createTransactionSchema().safeParse(values)

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

    const transactionsCollection = await getTransactionsCollection()

    await transactionsCollection.insertOne({
      userId: new ObjectId(user.id),
      type: parsedValues.data.type,
      categoryKey: parsedValues.data.categoryKey,
      amount: toDecimal128(parsedValues.data.amount),
      currency: parsedValues.data.currency,
      description: parsedValues.data.description,
      date: parsedValues.data.date,
    })

    after(async () => {
      try {
        await ensureExchangeRateForDate(parsedValues.data.date)
        updateTag(`transactions-${user.id}`)
      } catch (error) {
        console.warn(
          "Could not ensure exchange rate for transaction date, enqueuing retry:",
          error
        )
        await enqueueMissingExchangeRateDate(parsedValues.data.date, error)
      }
    })

    updateTag(`transactions-${user.id}`)
    return { success: t("Transaction has been created.") }
  } catch (error) {
    console.error("Error creating transaction:", error)
    return { error: t("Failed to create transaction! Please try again later.") }
  }
}

export async function updateTransaction(
  transactionId: string,
  values: TransactionFormValues
): Promise<ActionResponse> {
  const t = await getExtracted()

  try {
    if (!ObjectId.isValid(transactionId)) {
      return {
        error: t("Invalid transaction ID!"),
      }
    }

    const { createTransactionSchema } = await getSchemas()
    const parsedValues = createTransactionSchema().safeParse(values)

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

    const transactionsCollection = await getTransactionsCollection()

    const result = await transactionsCollection.updateOne(
      {
        _id: new ObjectId(transactionId),
        userId: new ObjectId(user.id),
      },
      {
        $set: {
          type: parsedValues.data.type,
          categoryKey: parsedValues.data.categoryKey,
          amount: toDecimal128(parsedValues.data.amount),
          currency: parsedValues.data.currency,
          description: parsedValues.data.description,
          date: parsedValues.data.date,
        },
      }
    )

    if (result.matchedCount === 0) {
      return {
        error: t("Transaction not found or you don't have permission to edit!"),
      }
    }

    after(async () => {
      try {
        await ensureExchangeRateForDate(parsedValues.data.date)
        updateTag(`transactions-${user.id}`)
      } catch (error) {
        console.warn(
          "Could not ensure exchange rate for transaction date, enqueuing retry:",
          error
        )
        await enqueueMissingExchangeRateDate(parsedValues.data.date, error)
      }
    })

    updateTag(`transactions-${user.id}`)
    return {
      success: t("Transaction has been updated."),
    }
  } catch (error) {
    console.error("Error updating transaction:", error)
    return { error: t("Failed to update transaction! Please try again later.") }
  }
}

export async function deleteTransaction(
  transactionId: string
): Promise<ActionResponse> {
  const t = await getExtracted()

  try {
    if (!ObjectId.isValid(transactionId)) {
      return {
        error: t("Invalid transaction ID!"),
      }
    }

    const { error, user, session } = await getSession()

    if (!user || !session) {
      return { error }
    }

    const transactionsCollection = await getTransactionsCollection()
    const result = await transactionsCollection.deleteOne({
      _id: new ObjectId(transactionId),
      userId: new ObjectId(user.id),
    })

    if (result.deletedCount === 0) {
      return {
        error: t(
          "Transaction not found or you don't have permission to delete!"
        ),
      }
    }

    updateTag(`transactions-${user.id}`)
    return { success: t("Transaction has been deleted.") }
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return { error: t("Failed to delete transaction! Please try again later.") }
  }
}

export async function getTransactions(): Promise<{
  error?: string
  transactions?: Transaction[]
}> {
  const { error, user, session } = await getSession()

  if (!user || !session) {
    return { error }
  }

  return getCachedTransactions(user.id, user.currency as Currency)
}

async function getCachedTransactions(userId: string, targetCurrency: Currency) {
  "use cache: private"
  cacheTag(`transactions-${userId}`)

  const t = await getExtracted()

  try {
    const transactionsCollection = await getTransactionsCollection()
    const transactions = await transactionsCollection
      .find({ userId: new ObjectId(userId) })
      .sort({ date: -1, _id: -1 })
      .toArray()
    const mapped = transactions.map((transaction) => ({
      ...transaction,
      _id: transaction._id.toString(),
      userId: transaction.userId.toString(),
      amount: transaction.amount.toString(),
      recurringId: transaction.recurringId
        ? transaction.recurringId.toString()
        : undefined,
    })) as Transaction[]
    const converted = await convertTransactionsToCurrency(
      mapped,
      targetCurrency
    )

    return {
      transactions: converted,
    }
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return { error: t("Failed to load transactions! Please try again later.") }
  }
}
