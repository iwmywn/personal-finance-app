import "server-only"

import { collection } from "@/lib/db"
import type {
  DBBudget,
  DBCategory,
  DBExchangeRate,
  DBGoal,
  DBMissingExchangeRate,
  DBRecurringTransaction,
  DBTransaction,
  DBUser,
} from "@/lib/definitions"

export function getUsersCollection() {
  return collection<DBUser>("users")
}

export function getTransactionsCollection() {
  return collection<DBTransaction>("transactions")
}

export function getCategoriesCollection() {
  return collection<DBCategory>("categories")
}

export function getBudgetsCollection() {
  return collection<DBBudget>("budgets")
}

export function getGoalsCollection() {
  return collection<DBGoal>("goals")
}

export function getRecurringTransactionsCollection() {
  return collection<DBRecurringTransaction>("recurringTransactions")
}

export function getExchangeRatesCollection() {
  return collection<DBExchangeRate>("exchangeRates")
}

export function getMissingExchangeRatesCollection() {
  return collection<DBMissingExchangeRate>("missingExchangeRates")
}
