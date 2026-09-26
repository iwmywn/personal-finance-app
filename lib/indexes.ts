import "server-only"

import { MongoServerError } from "mongodb"
import type { Db } from "mongodb"

async function ensureIndexes(db: Db) {
  await Promise.all([
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

    db.collection("categories").createIndex(
      {
        userId: 1,
        type: 1,
        label: 1,
      },
      { unique: true, name: "userId_type_label" }
    ),

    db.collection("transactions").createIndex(
      {
        userId: 1,
        date: -1,
      },
      {
        name: "userId_date",
      }
    ),

    db.collection("transactions").createIndex(
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

    db.collection("users").createIndex(
      { username: 1 },
      {
        unique: true,
        name: "username",
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
