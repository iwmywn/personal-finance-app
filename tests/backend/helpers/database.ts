import {
  getBudgetsCollection,
  getCategoriesCollection,
  getExchangeRatesCollection,
  getGoalsCollection,
  getMissingExchangeRatesCollection,
  getRecurringTransactionsCollection,
  getTransactionsCollection,
  getUsersCollection,
} from "@/lib/collections"
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

export const insertTestUser = async (user: DBUser) => {
  const collection = await getUsersCollection()
  await collection.insertOne(user)
}

export const insertTestTransaction = async (transaction: DBTransaction) => {
  const collection = await getTransactionsCollection()
  await collection.insertOne(transaction)
}

export const insertTestCategory = async (category: DBCategory) => {
  const collection = await getCategoriesCollection()
  await collection.insertOne(category)
}

export const insertTestBudget = async (budget: DBBudget) => {
  const collection = await getBudgetsCollection()
  await collection.insertOne(budget)
}

export const insertTestGoal = async (goal: DBGoal) => {
  const collection = await getGoalsCollection()
  await collection.insertOne(goal)
}

export const insertTestRecurringTransaction = async (
  recurringTransaction: DBRecurringTransaction
) => {
  const collection = await getRecurringTransactionsCollection()
  await collection.insertOne(recurringTransaction)
}

export const insertTestExchangeRates = async (
  exchangeRates: DBExchangeRate[]
) => {
  const collection = await getExchangeRatesCollection()
  await collection.insertMany(exchangeRates)
}

export const insertTestMissingExchangeRate = async (
  missingRate: DBMissingExchangeRate
) => {
  const collection = await getMissingExchangeRatesCollection()
  await collection.insertOne(missingRate)
}
