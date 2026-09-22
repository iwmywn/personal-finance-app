import "server-only"

import { MongoServerError } from "mongodb"
import type { CreateIndexesOptions, Db, IndexSpecification } from "mongodb"

async function createIndexSafely(
  db: Db,
  collectionName: string,
  key: IndexSpecification,
  options: CreateIndexesOptions
) {
  const collection = db.collection(collectionName)
  try {
    await collection.createIndex(key, options)
  } catch (error) {
    if (
      error instanceof MongoServerError &&
      (error.code === 85 || error.code === 86) &&
      options.name
    ) {
      await collection.dropIndex(options.name).catch(() => {})
      await collection.createIndex(key, options)
      return
    }
    throw error
  }
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    // Index transactions by userId and date descending for fast listing and sorting.
    // Allows multiple transactions with identical details on the same date.
    db.collection("transactions").createIndex(
      {
        userId: 1,
        date: -1,
      },
      {
        name: "userId_date",
      }
    ),

    createIndexSafely(
      db,
      "transactions",
      {
        recurringId: 1,
        date: 1,
      },
      {
        name: "recurringId_date",
        unique: true,
        partialFilterExpression: {
          recurringId: { $type: "objectId" },
        },
      }
    ),

    db.collection("budgets").createIndex(
      {
        userId: 1,
        categoryKey: 1,
        currency: 1,
        startDate: 1,
        endDate: 1,
      },
      { unique: true, name: "userId_categoryKey_currency_startDate_endDate" }
    ),

    db.collection("categories").createIndex(
      {
        userId: 1,
        type: 1,
        label: 1,
      },
      { unique: true, name: "userId_type_label" }
    ),

    db.collection("goals").createIndex(
      {
        userId: 1,
        name: 1,
        categoryKey: 1,
        currency: 1,
        startDate: 1,
        endDate: 1,
      },
      {
        unique: true,
        name: "userId_name_categoryKey_currency_startDate_endDate",
      }
    ),

    db.collection("recurringTransactions").createIndex(
      {
        userId: 1,
        type: 1,
        categoryKey: 1,
        amount: 1,
        currency: 1,
        description: 1,
        frequency: 1,
        randomEveryXDays: 1,
        startDate: 1,
      },
      {
        unique: true,
        name: "userId_type_categoryKey_amount_currency_description_frequency_randomEveryXDays_startDate",
      }
    ),

    db
      .collection("exchangeRates")
      .createIndex({ date: 1 }, { unique: true, name: "date" }),

    db
      .collection("missingExchangeRates")
      .createIndex({ date: 1 }, { unique: true, name: "date" }),

    createIndexSafely(
      db,
      "users",
      { username: 1 },
      {
        unique: true,
        name: "username_unique",
        partialFilterExpression: {
          username: { $type: "string" },
        },
      }
    ),
  ])
}

let indexesPromise: Promise<void> | null = null

export function initIndexes(db: Db): Promise<void> {
  if (!indexesPromise) {
    indexesPromise = ensureIndexes(db)
  }
  return indexesPromise
}

export function resetIndexes(): void {
  indexesPromise = null
}

export function isDuplicateKeyError(error: unknown): error is MongoServerError {
  return error instanceof MongoServerError && error.code === 11000
}
