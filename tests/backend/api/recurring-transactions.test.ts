import { updateTag } from "next/cache"
import { NextRequest } from "next/server"
import { Decimal128, MongoServerError, ObjectId } from "mongodb"

import {
  insertTestRecurringTransaction,
  insertTestTransaction,
  insertTestUser,
} from "@/tests/backend/helpers/database"
import {
  mockDBBannedUser,
  mockDBRecurringTransaction,
} from "@/tests/shared/data"
import * as exchangeRatesActions from "@/actions/exchange-rates.actions"
import { GET } from "@/app/api/(cronjobs)/recurring-transactions/route"
import {
  getDueDates,
  getNextDate,
} from "@/app/api/(cronjobs)/recurring-transactions/utils"
import * as collections from "@/lib/collections"
import {
  getRecurringTransactionsCollection,
  getTransactionsCollection,
} from "@/lib/collections"
import { localDateToUTCMidnight } from "@/lib/date"
import type {
  DBRecurringTransaction,
  DBTransaction,
  DBUser,
} from "@/lib/definitions"

const cronSecret = "test-cron-secret"
const cronEndpoint = "http://localhost/api/recurring-transactions"

describe("Recurring Transactions Cron Job", () => {
  describe("Cron Job Route", () => {
    describe("Authorization", () => {
      it("should return 401 when authorization header is missing", async () => {
        const request = new NextRequest(cronEndpoint)

        const response = await GET(request)
        const text = await response.text()

        expect(response.status).toBe(401)
        expect(text).toBe("Unauthorized")
      })

      it("should return 401 when authorization header is invalid", async () => {
        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: "Bearer wrong-secret",
          },
        })

        const response = await GET(request)
        const text = await response.text()

        expect(response.status).toBe(401)
        expect(text).toBe("Unauthorized")
      })

      it("should return 401 when authorization header format is wrong", async () => {
        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Invalid ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const text = await response.text()

        expect(response.status).toBe(401)
        expect(text).toBe("Unauthorized")
      })
    })

    describe("Successful execution", () => {
      it("should create transaction when recurring transaction should generate today", async () => {
        const todayUTC = localDateToUTCMidnight(new Date("2024-02-01"))
        const lastMonthUTC = localDateToUTCMidnight(new Date("2024-01-01"))

        const recurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: lastMonthUTC,
        }

        await insertTestRecurringTransaction(recurringTransaction)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(1)
        expect(data.createdIds).toHaveLength(1)
        expect(data.skippedCount).toBe(0)
        expect(data.skippedReason).toHaveLength(0)

        const transactionsCollection = await getTransactionsCollection()
        const createdTransaction = await transactionsCollection.findOne({
          userId: recurringTransaction.userId,
          type: recurringTransaction.type,
          categoryKey: recurringTransaction.categoryKey,
          amount: recurringTransaction.amount,
          date: todayUTC,
        })

        expect(createdTransaction).toBeDefined()
        expect(createdTransaction?.description).toBe(
          recurringTransaction.description
        )

        const recurringCollection = await getRecurringTransactionsCollection()
        const updatedRecurring = await recurringCollection.findOne({
          _id: recurringTransaction._id,
        })

        expect(updatedRecurring?.lastGeneratedDate).toEqual(todayUTC)

        vi.useRealTimers()
      })

      it("should skip transaction when next occurrence is not today", async () => {
        const yesterdayUTC = localDateToUTCMidnight(new Date("2024-02-01"))

        const recurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: yesterdayUTC,
        }

        await insertTestRecurringTransaction(recurringTransaction)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-02T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(0)
        expect(data.createdIds).toHaveLength(0)
        expect(data.skippedCount).toBe(1)
        expect(data.skippedReason).toHaveLength(1)
        expect(data.skippedReason[0]).toEqual({
          id: recurringTransaction._id.toString(),
          reason: "notToday",
        })

        const transactionsCollection = await getTransactionsCollection()
        const transactions = await transactionsCollection
          .find({ userId: recurringTransaction.userId })
          .toArray()

        expect(transactions).toHaveLength(0)

        vi.useRealTimers()
      })

      it("should skip transaction when duplicate already exists", async () => {
        const todayUTC = localDateToUTCMidnight(new Date("2024-02-01"))
        const lastMonthUTC = localDateToUTCMidnight(new Date("2024-01-01"))

        const recurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: lastMonthUTC,
        }

        await insertTestRecurringTransaction(recurringTransaction)

        const existingTransaction: DBTransaction = {
          _id: new ObjectId(),
          userId: recurringTransaction.userId,
          type: recurringTransaction.type,
          categoryKey: recurringTransaction.categoryKey,
          amount: recurringTransaction.amount,
          currency: recurringTransaction.currency,
          description: recurringTransaction.description,
          date: todayUTC,
        }

        await insertTestTransaction(existingTransaction)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(0)
        expect(data.createdIds).toHaveLength(0)
        expect(data.skippedCount).toBe(1)
        expect(data.skippedReason).toHaveLength(1)
        expect(data.skippedReason[0]).toEqual({
          id: recurringTransaction._id.toString(),
          reason: "existing",
        })

        const transactionsCollection = await getTransactionsCollection()
        const transactions = await transactionsCollection
          .find({ userId: recurringTransaction.userId })
          .toArray()

        expect(transactions).toHaveLength(1)
        expect(transactions[0]._id.toString()).toBe(
          existingTransaction._id.toString()
        )

        const recurringCollection = await getRecurringTransactionsCollection()
        const updatedRecurring = await recurringCollection.findOne({
          _id: recurringTransaction._id,
        })

        expect(updatedRecurring?.lastGeneratedDate).toEqual(todayUTC)

        vi.useRealTimers()
      })

      it("should skip recurring transaction when user created a manual transaction with identical attributes", async () => {
        const todayUTC = localDateToUTCMidnight(new Date("2024-02-01"))
        const lastMonthUTC = localDateToUTCMidnight(new Date("2024-01-01"))

        const recurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId(),
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: lastMonthUTC,
        }

        await insertTestRecurringTransaction(recurringTransaction)

        // Manual transaction with identical fields
        const manualTransaction: DBTransaction = {
          _id: new ObjectId(),
          userId: recurringTransaction.userId,
          type: recurringTransaction.type,
          categoryKey: recurringTransaction.categoryKey,
          amount: recurringTransaction.amount,
          currency: recurringTransaction.currency,
          description: recurringTransaction.description,
          date: todayUTC,
        }

        await insertTestTransaction(manualTransaction)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(0)
        expect(data.createdIds).toHaveLength(0)
        expect(data.skippedCount).toBe(1)
        expect(data.skippedReason).toHaveLength(1)
        expect(data.skippedReason[0]).toEqual({
          id: recurringTransaction._id.toString(),
          reason: "existing",
        })

        const transactionsCollection = await getTransactionsCollection()
        const transactions = await transactionsCollection
          .find({ userId: recurringTransaction.userId })
          .toArray()

        expect(transactions).toHaveLength(1)
        expect(transactions[0]._id.toString()).toBe(
          manualTransaction._id.toString()
        )

        vi.useRealTimers()
      })

      it("should handle multiple recurring transactions correctly", async () => {
        const lastMonthUTC = localDateToUTCMidnight(new Date("2024-01-01"))
        const yesterdayUTC = localDateToUTCMidnight(new Date("2024-01-31"))

        const recurringTransaction1: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: lastMonthUTC, // Will generate on 2024-02-01
        }

        const recurringTransaction2: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId("691d58b68a6aa5c9e69aad22"),
          frequency: "daily",
          categoryKey: "business_freelance", // Different category to avoid duplicate check
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: yesterdayUTC, // Will generate on 2024-02-01
        }

        const recurringTransaction3: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId("691d58bfa688494d77dabe6d"),
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-15")),
          lastGeneratedDate: localDateToUTCMidnight(new Date("2024-01-15")), // Will generate on 2024-02-15, not today
        }

        await insertTestRecurringTransaction(recurringTransaction1)
        await insertTestRecurringTransaction(recurringTransaction2)
        await insertTestRecurringTransaction(recurringTransaction3)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(2)
        expect(data.createdIds).toHaveLength(2)
        expect(data.skippedCount).toBe(1)
        expect(data.skippedReason).toHaveLength(1)
        expect(data.skippedReason[0].reason).toBe("notToday")

        const transactionsCollection = await getTransactionsCollection()
        const transactions = await transactionsCollection
          .find({ userId: recurringTransaction1.userId })
          .toArray()

        expect(transactions).toHaveLength(2)
        expect(data.createdIds).toContain(transactions[0]._id.toString())
        expect(data.createdIds).toContain(transactions[1]._id.toString())

        vi.useRealTimers()
      })

      it("should only process active recurring transactions", async () => {
        const lastMonthUTC = localDateToUTCMidnight(new Date("2024-01-01"))

        const activeRecurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: lastMonthUTC, // Will generate on 2024-02-01
        }

        const inactiveRecurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId(),
          description: "Inactive Monthly Salary",
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          endDate: localDateToUTCMidnight(new Date("2024-01-15")), // Expired
          lastGeneratedDate: lastMonthUTC,
        }

        await insertTestRecurringTransaction(activeRecurringTransaction)
        await insertTestRecurringTransaction(inactiveRecurringTransaction)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(1)

        const transactionsCollection = await getTransactionsCollection()
        const transactions = await transactionsCollection
          .find({ userId: activeRecurringTransaction.userId })
          .toArray()

        expect(transactions).toHaveLength(1)
        expect(transactions[0].userId.toString()).toBe(
          activeRecurringTransaction.userId.toString()
        )

        vi.useRealTimers()
      })
    })

    describe("Edge cases", () => {
      it("should handle empty recurring transactions list", async () => {
        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(0)
        expect(data.createdIds).toHaveLength(0)
        expect(data.skippedCount).toBe(0)
        expect(new Date(data.timestamp).getTime()).toBeLessThanOrEqual(
          Date.now()
        )
      })

      it("should not process expired recurring transactions whose endDate has passed", async () => {
        const yesterdayUTC = localDateToUTCMidnight(new Date("2024-01-31"))

        const expiredRecurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId("691d58b68a6aa5c9e69aad22"),
          description: "Expired Monthly Salary",
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: localDateToUTCMidnight(new Date("2024-01-01")),
          endDate: yesterdayUTC, // Expired yesterday
        }

        const activeRecurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId("691d58bfa688494d77dabe6d"),
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: localDateToUTCMidnight(new Date("2024-01-01")),
          endDate: localDateToUTCMidnight(new Date("2024-12-31")), // Still active
        }

        await insertTestRecurringTransaction(expiredRecurringTransaction)
        await insertTestRecurringTransaction(activeRecurringTransaction)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(1)

        const transactionsCollection = await getTransactionsCollection()
        const expiredTx = await transactionsCollection.findOne({
          description: "Expired Monthly Salary",
        })
        const activeTx = await transactionsCollection.findOne({
          description: "Monthly Salary",
        })

        expect(expiredTx).toBeNull()
        expect(activeTx).toBeDefined()

        vi.useRealTimers()
      })

      it("should update lastGeneratedDate to endDate when expired recurring transaction has no remaining due dates", async () => {
        const yesterdayUTC = localDateToUTCMidnight(new Date("2024-01-31"))

        const expiredRecurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId("691d58b68a6aa5c9e69aad99"),
          description: "Expired Stale Recurring",
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: localDateToUTCMidnight(new Date("2024-01-01")),
          endDate: yesterdayUTC,
        }

        await insertTestRecurringTransaction(expiredRecurringTransaction)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)

        const recurringCollection = await getRecurringTransactionsCollection()
        const updated = await recurringCollection.findOne({
          _id: expiredRecurringTransaction._id,
        })
        expect(updated?.lastGeneratedDate).toEqual(yesterdayUTC)

        vi.useRealTimers()
      })

      it("should backfill expired recurring transactions whose endDate has passed when lastGeneratedDate was not set", async () => {
        const yesterdayUTC = localDateToUTCMidnight(new Date("2024-01-31"))

        const expiredUnprocessedTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId("691d58b68a6aa5c9e69aad23"),
          description: "Expired Unprocessed Salary",
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          endDate: yesterdayUTC,
        }

        await insertTestRecurringTransaction(expiredUnprocessedTransaction)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(1)

        const transactionsCollection = await getTransactionsCollection()
        const backfilledTx = await transactionsCollection.findOne({
          description: "Expired Unprocessed Salary",
        })

        expect(backfilledTx).toBeDefined()
        expect(backfilledTx?.date).toEqual(
          localDateToUTCMidnight(new Date("2024-01-01"))
        )

        vi.useRealTimers()
      })

      it("should process recurring transactions without end date", async () => {
        const activeRecurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId("691d58bfa688494d77dabe6d"),
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: localDateToUTCMidnight(new Date("2024-01-01")),
          endDate: undefined, // No end date
        }

        await insertTestRecurringTransaction(activeRecurringTransaction)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(1)

        vi.useRealTimers()
      })

      it("should backfill missed occurrences when cron was delayed", async () => {
        const startDateUTC = localDateToUTCMidnight(new Date("2024-02-01"))
        const lastGeneratedDateUTC = localDateToUTCMidnight(
          new Date("2024-02-01")
        )
        const recurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId("691d58bfa688494d77dabe7e"),
          frequency: "daily",
          startDate: startDateUTC,
          lastGeneratedDate: lastGeneratedDateUTC,
        }

        await insertTestRecurringTransaction(recurringTransaction)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-03T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(2)

        const transactionsCollection = await getTransactionsCollection()
        const createdTxs = await transactionsCollection
          .find({ userId: recurringTransaction.userId })
          .sort({ date: 1 })
          .toArray()

        expect(createdTxs).toHaveLength(2)
        expect(createdTxs[0].date).toEqual(
          localDateToUTCMidnight(new Date("2024-02-02"))
        )
        expect(createdTxs[1].date).toEqual(
          localDateToUTCMidnight(new Date("2024-02-03"))
        )

        const recurringCollection = await getRecurringTransactionsCollection()
        const updatedRec = await recurringCollection.findOne({
          _id: recurringTransaction._id,
        })
        expect(updatedRec?.lastGeneratedDate).toEqual(
          localDateToUTCMidnight(new Date("2024-02-03"))
        )

        vi.useRealTimers()
      })

      it("should not process recurring transactions belonging to banned users", async () => {
        await insertTestUser(mockDBBannedUser)

        const lastMonthUTC = localDateToUTCMidnight(new Date("2024-01-01"))

        const bannedUserRecurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId(),
          userId: mockDBBannedUser._id,
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: lastMonthUTC,
        }

        await insertTestRecurringTransaction(bannedUserRecurringTransaction)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(0)
        expect(data.createdIds).toHaveLength(0)

        const transactionsCollection = await getTransactionsCollection()
        const transactions = await transactionsCollection
          .find({ userId: mockDBBannedUser._id })
          .toArray()

        expect(transactions).toHaveLength(0)

        const recurringCollection = await getRecurringTransactionsCollection()
        const updatedRecurring = await recurringCollection.findOne({
          _id: bannedUserRecurringTransaction._id,
        })

        expect(updatedRecurring?.lastGeneratedDate).toEqual(lastMonthUTC)

        vi.useRealTimers()
      })

      it("should process recurring transactions belonging to users whose temporary ban has expired", async () => {
        const expiredBannedUser: DBUser = {
          ...mockDBBannedUser,
          _id: new ObjectId(),
          email: "expired-ban@gmail.com",
          username: "expiredbanuser",
          displayUsername: "expiredbanuser",
          banned: true,
          banExpires: new Date("2024-01-15T00:00:00.000Z"),
        }
        await insertTestUser(expiredBannedUser)

        const lastMonthUTC = localDateToUTCMidnight(new Date("2024-01-01"))
        const targetDateUTC = localDateToUTCMidnight(new Date("2024-02-01"))

        const expiredBannedUserRecurring: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId(),
          userId: expiredBannedUser._id,
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: lastMonthUTC,
        }

        await insertTestRecurringTransaction(expiredBannedUserRecurring)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(1)

        const transactionsCollection = await getTransactionsCollection()
        const transactions = await transactionsCollection
          .find({ userId: expiredBannedUser._id })
          .toArray()

        expect(transactions).toHaveLength(1)
        expect(transactions[0].date).toEqual(targetDateUTC)

        vi.useRealTimers()
      })

      it("should not process recurring transactions whose startDate is in the future", async () => {
        const tomorrowUTC = localDateToUTCMidnight(new Date("2024-02-02"))

        const futureRecurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId(),
          frequency: "daily",
          startDate: tomorrowUTC,
        }

        await insertTestRecurringTransaction(futureRecurringTransaction)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(0)
        expect(data.skippedCount).toBe(0)

        const transactionsCollection = await getTransactionsCollection()
        const txs = await transactionsCollection
          .find({ userId: futureRecurringTransaction.userId })
          .toArray()

        expect(txs).toHaveLength(0)

        vi.useRealTimers()
      })

      it("should backfill expired recurring transactions whose endDate has passed when lastGeneratedDate is before endDate", async () => {
        const startDateUTC = localDateToUTCMidnight(new Date("2024-01-01"))
        const lastGeneratedDateUTC = localDateToUTCMidnight(
          new Date("2024-01-02")
        )
        const endDateUTC = localDateToUTCMidnight(new Date("2024-01-04"))

        const expiredRecurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId(),
          frequency: "daily",
          startDate: startDateUTC,
          lastGeneratedDate: lastGeneratedDateUTC,
          endDate: endDateUTC,
        }

        await insertTestRecurringTransaction(expiredRecurringTransaction)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(2)

        const transactionsCollection = await getTransactionsCollection()
        const createdTxs = await transactionsCollection
          .find({ userId: expiredRecurringTransaction.userId })
          .sort({ date: 1 })
          .toArray()

        expect(createdTxs).toHaveLength(2)
        expect(createdTxs[0].date).toEqual(
          localDateToUTCMidnight(new Date("2024-01-03"))
        )
        expect(createdTxs[1].date).toEqual(
          localDateToUTCMidnight(new Date("2024-01-04"))
        )

        const recurringCollection = await getRecurringTransactionsCollection()
        const updatedRec = await recurringCollection.findOne({
          _id: expiredRecurringTransaction._id,
        })
        expect(updatedRec?.lastGeneratedDate).toEqual(endDateUTC)

        vi.useRealTimers()
      })

      it("should process recurring transactions in batches when exceeding MAX_TRANSACTIONS_PER_RUN", async () => {
        const yesterdayUTC = localDateToUTCMidnight(new Date("2024-01-31"))
        const count = 7

        for (let i = 0; i < count; i++) {
          const rec: DBRecurringTransaction = {
            ...mockDBRecurringTransaction,
            _id: new ObjectId(),
            description: `Batch Salary ${i}`,
            categoryKey:
              `category_${i}` as DBRecurringTransaction["categoryKey"],
            frequency: "daily",
            startDate: localDateToUTCMidnight(new Date("2024-01-01")),
            lastGeneratedDate: yesterdayUTC,
          }
          await insertTestRecurringTransaction(rec)
        }

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(7)
        expect(data.createdIds).toHaveLength(7)

        vi.useRealTimers()
      })

      it("should invalidate cache tags for affected users", async () => {
        const lastMonthUTC = localDateToUTCMidnight(new Date("2024-01-01"))

        const recurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId(),
          userId: new ObjectId(),
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: lastMonthUTC,
        }

        await insertTestRecurringTransaction(recurringTransaction)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        await GET(request)

        expect(updateTag).toHaveBeenCalledWith(
          `transactions-${recurringTransaction.userId}`
        )
        expect(updateTag).toHaveBeenCalledWith(
          `recurringTransactions-${recurringTransaction.userId}`
        )

        vi.useRealTimers()
      })

      it("should enqueue missing exchange rate when ensureExchangeRateForDate fails without failing the cron job", async () => {
        const todayUTC = localDateToUTCMidnight(new Date("2024-02-01"))
        const lastMonthUTC = localDateToUTCMidnight(new Date("2024-01-01"))

        const recurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId(),
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: lastMonthUTC,
        }

        await insertTestRecurringTransaction(recurringTransaction)

        const ensureSpy = vi
          .spyOn(exchangeRatesActions, "ensureExchangeRateForDate")
          .mockRejectedValueOnce(new Error("API rate limit exceeded"))
        const enqueueSpy = vi.spyOn(
          exchangeRatesActions,
          "enqueueMissingExchangeRateDate"
        )

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(1)
        expect(ensureSpy).toHaveBeenCalled()
        expect(enqueueSpy).toHaveBeenCalledWith(
          todayUTC,
          expect.objectContaining({ message: "API rate limit exceeded" })
        )

        ensureSpy.mockRestore()
        enqueueSpy.mockRestore()
        vi.useRealTimers()
      })

      it("should return 500 when database operation fails", async () => {
        const consoleSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {})
        const spy = vi
          .spyOn(collections, "getTransactionsCollection")
          .mockRejectedValueOnce(new Error("Connection error"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        expect(response.status).toBe(500)
        expect(await response.text()).toBe("Recurring transactions cron failed")

        spy.mockRestore()
        consoleSpy.mockRestore()
      })

      it("should rollback transaction insertions and not update lastGeneratedDate if an error occurs during batch processing", async () => {
        const consoleSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {})

        const startDateUTC = localDateToUTCMidnight(new Date("2024-02-01"))
        const rec: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId(),
          frequency: "daily",
          startDate: startDateUTC,
          lastGeneratedDate: startDateUTC,
        }
        await insertTestRecurringTransaction(rec)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-03T12:00:00.000Z"))

        const recurringCollection = await getRecurringTransactionsCollection()
        const transactionsCollection = await getTransactionsCollection()
        const spyUpdateOne = vi
          .spyOn(Object.getPrototypeOf(recurringCollection), "updateOne")
          .mockImplementation(function () {
            return Promise.reject(
              new Error("Simulated network failure on recurring updateOne")
            )
          })

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        expect(response.status).toBe(500)

        // Verify rollback: no transactions should exist for this user
        const txs = await transactionsCollection
          .find({ userId: rec.userId })
          .toArray()
        expect(txs).toHaveLength(0)

        // Verify lastGeneratedDate was NOT updated
        const foundRec = await recurringCollection.findOne({ _id: rec._id })
        expect(foundRec?.lastGeneratedDate).toEqual(startDateUTC)

        vi.useRealTimers()
        spyUpdateOne.mockRestore()
        consoleSpy.mockRestore()
      })

      it("should handle duplicate key error during insertMany gracefully", async () => {
        const lastMonthUTC = localDateToUTCMidnight(new Date("2024-01-01"))

        const recurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId(),
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: lastMonthUTC,
        }
        await insertTestRecurringTransaction(recurringTransaction)

        const transactionsCollection = await getTransactionsCollection()
        const duplicateError = new MongoServerError({
          message: "E11000 duplicate key error collection",
        })
        duplicateError.code = 11000

        const spyInsertMany = vi
          .spyOn(Object.getPrototypeOf(transactionsCollection), "insertMany")
          .mockImplementation(() => Promise.reject(duplicateError))

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(0)
        expect(data.createdIds).toHaveLength(0)
        expect(data.skippedCount).toBe(1)
        expect(data.skippedReason).toHaveLength(1)
        expect(data.skippedReason[0]).toEqual({
          id: recurringTransaction._id.toString(),
          reason: "existing",
        })

        expect(updateTag).toHaveBeenCalledWith(
          `transactions-${recurringTransaction.userId}`
        )
        expect(updateTag).toHaveBeenCalledWith(
          `recurringTransactions-${recurringTransaction.userId}`
        )

        spyInsertMany.mockRestore()
        vi.useRealTimers()
      })

      it("should return 500 when insertMany throws a non-duplicate generic error", async () => {
        const consoleSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {})
        const lastMonthUTC = localDateToUTCMidnight(new Date("2024-01-01"))

        const recurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId(),
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: lastMonthUTC,
        }
        await insertTestRecurringTransaction(recurringTransaction)

        const transactionsCollection = await getTransactionsCollection()
        const spyInsertMany = vi
          .spyOn(Object.getPrototypeOf(transactionsCollection), "insertMany")
          .mockImplementation(() =>
            Promise.reject(new Error("Unexpected insertMany error"))
          )

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        expect(response.status).toBe(500)
        expect(await response.text()).toBe("Recurring transactions cron failed")

        spyInsertMany.mockRestore()
        consoleSpy.mockRestore()
        vi.useRealTimers()
      })

      it("should handle partial backfill where one occurrence already exists and another is created", async () => {
        const startDateUTC = localDateToUTCMidnight(new Date("2024-02-01"))
        const rec: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId(),
          frequency: "daily",
          startDate: startDateUTC,
          lastGeneratedDate: startDateUTC,
        }
        await insertTestRecurringTransaction(rec)

        // Pre-insert transaction for 2024-02-02
        const existingTxDate = localDateToUTCMidnight(new Date("2024-02-02"))
        await insertTestTransaction({
          _id: new ObjectId(),
          userId: rec.userId,
          type: rec.type,
          categoryKey: rec.categoryKey,
          amount: rec.amount,
          currency: rec.currency,
          description: rec.description,
          date: existingTxDate,
        })

        // Current time: 2024-02-03 (due dates: 2024-02-02 and 2024-02-03)
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-03T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(1)
        expect(data.createdIds).toHaveLength(1)
        expect(data.skippedCount).toBe(1)
        expect(data.skippedReason).toHaveLength(1)
        expect(data.skippedReason[0]).toEqual({
          id: rec._id.toString(),
          reason: "existing",
        })

        const transactionsCollection = await getTransactionsCollection()
        const userTxs = await transactionsCollection
          .find({ userId: rec.userId })
          .sort({ date: 1 })
          .toArray()

        expect(userTxs).toHaveLength(2)
        expect(userTxs[0].date).toEqual(existingTxDate)
        expect(userTxs[1].date).toEqual(
          localDateToUTCMidnight(new Date("2024-02-03"))
        )

        const recurringCollection = await getRecurringTransactionsCollection()
        const updatedRec = await recurringCollection.findOne({ _id: rec._id })
        expect(updatedRec?.lastGeneratedDate).toEqual(
          localDateToUTCMidnight(new Date("2024-02-03"))
        )

        vi.useRealTimers()
      })

      it("should not process recurring transactions belonging to users whose temporary ban is still active", async () => {
        const activeBannedUser: DBUser = {
          ...mockDBBannedUser,
          _id: new ObjectId(),
          email: "active-ban@gmail.com",
          username: "activebanuser",
          displayUsername: "activebanuser",
          banned: true,
          banExpires: new Date("2024-02-15T00:00:00.000Z"),
        }
        await insertTestUser(activeBannedUser)

        const lastMonthUTC = localDateToUTCMidnight(new Date("2024-01-01"))
        const activeBannedUserRecurring: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId(),
          userId: activeBannedUser._id,
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: lastMonthUTC,
        }
        await insertTestRecurringTransaction(activeBannedUserRecurring)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(0)

        const transactionsCollection = await getTransactionsCollection()
        const transactions = await transactionsCollection
          .find({ userId: activeBannedUser._id })
          .toArray()
        expect(transactions).toHaveLength(0)

        vi.useRealTimers()
      })

      it("should process recurring transactions where endDate and lastGeneratedDate are explicitly null", async () => {
        const todayUTC = localDateToUTCMidnight(new Date("2024-02-01"))
        const recurringTransaction: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          _id: new ObjectId(),
          frequency: "monthly",
          startDate: todayUTC,
          endDate: null as unknown as Date,
          lastGeneratedDate: null as unknown as Date,
        }
        await insertTestRecurringTransaction(recurringTransaction)

        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"))

        const request = new NextRequest(cronEndpoint, {
          headers: {
            authorization: `Bearer ${cronSecret}`,
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(1)

        const recurringCollection = await getRecurringTransactionsCollection()
        const updatedRec = await recurringCollection.findOne({
          _id: recurringTransaction._id,
        })
        expect(updatedRec?.lastGeneratedDate).toEqual(todayUTC)

        vi.useRealTimers()
      })
    })
  })

  describe("Utils", () => {
    describe("getDueDates", () => {
      it("should return empty array when today is before start date", () => {
        const rec: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "daily",
          startDate: localDateToUTCMidnight(new Date("2024-02-10")),
        }
        const today = localDateToUTCMidnight(new Date("2024-02-09"))
        expect(getDueDates(rec, today)).toEqual([])
      })

      it("should return [todayUTC] when today is start date with no lastGeneratedDate", () => {
        const today = localDateToUTCMidnight(new Date("2024-02-10"))
        const rec: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "daily",
          startDate: today,
          lastGeneratedDate: undefined,
        }
        expect(getDueDates(rec, today)).toEqual([today])
      })

      it("should return empty array when lastGeneratedDate is already today", () => {
        const today = localDateToUTCMidnight(new Date("2024-02-10"))
        const rec: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "daily",
          startDate: localDateToUTCMidnight(new Date("2024-02-01")),
          lastGeneratedDate: today,
        }
        expect(getDueDates(rec, today)).toEqual([])
      })

      it("should backfill all missed daily occurrences up to today", () => {
        const rec: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "daily",
          startDate: localDateToUTCMidnight(new Date("2024-02-01")),
          lastGeneratedDate: localDateToUTCMidnight(new Date("2024-02-01")),
        }
        const today = localDateToUTCMidnight(new Date("2024-02-04"))
        const dueDates = getDueDates(rec, today)

        expect(dueDates).toEqual([
          localDateToUTCMidnight(new Date("2024-02-02")),
          localDateToUTCMidnight(new Date("2024-02-03")),
          localDateToUTCMidnight(new Date("2024-02-04")),
        ])
      })

      it("should not exceed endDate when backfilling", () => {
        const rec: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "daily",
          startDate: localDateToUTCMidnight(new Date("2024-02-01")),
          lastGeneratedDate: localDateToUTCMidnight(new Date("2024-02-01")),
          endDate: localDateToUTCMidnight(new Date("2024-02-02")),
        }
        const today = localDateToUTCMidnight(new Date("2024-02-04"))
        const dueDates = getDueDates(rec, today)

        expect(dueDates).toEqual([
          localDateToUTCMidnight(new Date("2024-02-02")),
        ])
      })

      it("should backfill from startDate when lastGeneratedDate is not set", () => {
        const rec: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "daily",
          startDate: localDateToUTCMidnight(new Date("2024-02-01")),
          lastGeneratedDate: undefined,
        }
        const today = localDateToUTCMidnight(new Date("2024-02-04"))
        const dueDates = getDueDates(rec, today)

        expect(dueDates).toEqual([
          localDateToUTCMidnight(new Date("2024-02-01")),
          localDateToUTCMidnight(new Date("2024-02-02")),
          localDateToUTCMidnight(new Date("2024-02-03")),
          localDateToUTCMidnight(new Date("2024-02-04")),
        ])
      })

      it("should calculate due dates correctly for weekly frequency", () => {
        const rec: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "weekly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: localDateToUTCMidnight(new Date("2024-01-01")),
        }
        const today = localDateToUTCMidnight(new Date("2024-01-16"))
        expect(getDueDates(rec, today)).toEqual([
          localDateToUTCMidnight(new Date("2024-01-08")),
          localDateToUTCMidnight(new Date("2024-01-15")),
        ])
      })

      it("should calculate due dates correctly for bi-weekly frequency", () => {
        const rec: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "bi-weekly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: localDateToUTCMidnight(new Date("2024-01-01")),
        }
        const today = localDateToUTCMidnight(new Date("2024-01-30"))
        expect(getDueDates(rec, today)).toEqual([
          localDateToUTCMidnight(new Date("2024-01-15")),
          localDateToUTCMidnight(new Date("2024-01-29")),
        ])
      })

      it("should clamp targetDay to end of month for monthly frequency on leap year", () => {
        const rec: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "monthly",
          startDate: localDateToUTCMidnight(new Date("2024-01-31")),
          lastGeneratedDate: localDateToUTCMidnight(new Date("2024-01-31")),
        }
        const today = localDateToUTCMidnight(new Date("2024-03-31"))
        expect(getDueDates(rec, today)).toEqual([
          localDateToUTCMidnight(new Date("2024-02-29")),
          localDateToUTCMidnight(new Date("2024-03-31")),
        ])
      })

      it("should calculate due dates correctly for quarterly frequency", () => {
        const rec: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "quarterly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: localDateToUTCMidnight(new Date("2024-01-01")),
        }
        const today = localDateToUTCMidnight(new Date("2024-07-02"))
        expect(getDueDates(rec, today)).toEqual([
          localDateToUTCMidnight(new Date("2024-04-01")),
          localDateToUTCMidnight(new Date("2024-07-01")),
        ])
      })

      it("should calculate due dates correctly for yearly frequency", () => {
        const rec: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "yearly",
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: localDateToUTCMidnight(new Date("2024-01-01")),
          endDate: undefined,
        }
        const today = localDateToUTCMidnight(new Date("2026-01-02"))
        expect(getDueDates(rec, today)).toEqual([
          localDateToUTCMidnight(new Date("2025-01-01")),
          localDateToUTCMidnight(new Date("2026-01-01")),
        ])
      })

      it("should calculate due dates correctly for random frequency with custom days", () => {
        const rec: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "random",
          randomEveryXDays: 3,
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: localDateToUTCMidnight(new Date("2024-01-01")),
        }
        const today = localDateToUTCMidnight(new Date("2024-01-08"))
        expect(getDueDates(rec, today)).toEqual([
          localDateToUTCMidnight(new Date("2024-01-04")),
          localDateToUTCMidnight(new Date("2024-01-07")),
        ])
      })

      it("should fallback randomEveryXDays to 1 when undefined or less than 1 in getDueDates", () => {
        const rec: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "random",
          randomEveryXDays: 0,
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: localDateToUTCMidnight(new Date("2024-01-01")),
        }
        const today = localDateToUTCMidnight(new Date("2024-01-03"))
        expect(getDueDates(rec, today)).toEqual([
          localDateToUTCMidnight(new Date("2024-01-02")),
          localDateToUTCMidnight(new Date("2024-01-03")),
        ])
      })

      it("should fallback randomEveryXDays to 1 when undefined in getDueDates", () => {
        const rec: DBRecurringTransaction = {
          ...mockDBRecurringTransaction,
          frequency: "random",
          randomEveryXDays: undefined,
          startDate: localDateToUTCMidnight(new Date("2024-01-01")),
          lastGeneratedDate: localDateToUTCMidnight(new Date("2024-01-01")),
        }
        const today = localDateToUTCMidnight(new Date("2024-01-03"))
        expect(getDueDates(rec, today)).toEqual([
          localDateToUTCMidnight(new Date("2024-01-02")),
          localDateToUTCMidnight(new Date("2024-01-03")),
        ])
      })
    })

    describe("getNextDate", () => {
      const baseRecurring: DBRecurringTransaction = {
        _id: new ObjectId(),
        userId: new ObjectId(),
        type: "outflow",
        categoryKey: "food_beverage",
        amount: Decimal128.fromString("100"),
        currency: "USD",
        description: "Subscription",
        frequency: "monthly",
        startDate: new Date("2026-01-10T00:00:00.000Z"),
      }

      it("should return start date if lastGeneratedDate is undefined and candidate >= todayUTC", () => {
        const todayUTC = new Date("2026-01-05T00:00:00.000Z")
        const result = getNextDate(baseRecurring, todayUTC)
        expect(result).toEqual(new Date("2026-01-10T00:00:00.000Z"))
      })

      it("should advance candidate until candidate >= todayUTC", () => {
        const todayUTC = new Date("2026-03-05T00:00:00.000Z")
        const result = getNextDate(baseRecurring, todayUTC)
        // Jan 10 -> Feb 10 -> Mar 10
        expect(result).toEqual(new Date("2026-03-10T00:00:00.000Z"))
      })

      it("should return next occurrence when within endDate", () => {
        const recWithEnd: DBRecurringTransaction = {
          ...baseRecurring,
          lastGeneratedDate: new Date("2026-02-10T00:00:00.000Z"),
          endDate: new Date("2026-04-15T00:00:00.000Z"),
        }
        const todayUTC = new Date("2026-02-15T00:00:00.000Z")
        const result = getNextDate(recWithEnd, todayUTC)
        expect(result).toEqual(new Date("2026-03-10T00:00:00.000Z"))
      })

      it("should return null when next candidate exceeds endDate", () => {
        const recEndingSoon: DBRecurringTransaction = {
          ...baseRecurring,
          lastGeneratedDate: new Date("2026-02-10T00:00:00.000Z"),
          endDate: new Date("2026-03-05T00:00:00.000Z"),
        }
        const todayUTC = new Date("2026-02-20T00:00:00.000Z")
        // Next candidate would be 2026-03-10, but endDate is 2026-03-05
        const result = getNextDate(recEndingSoon, todayUTC)
        expect(result).toBeNull()
      })

      it("should return null when todayUTC has already passed endDate", () => {
        const expiredRec: DBRecurringTransaction = {
          ...baseRecurring,
          lastGeneratedDate: new Date("2026-01-10T00:00:00.000Z"),
          endDate: new Date("2026-02-01T00:00:00.000Z"),
        }
        const todayUTC = new Date("2026-03-01T00:00:00.000Z")
        const result = getNextDate(expiredRec, todayUTC)
        expect(result).toBeNull()
      })

      it("should handle daily frequency with endDate", () => {
        const dailyRec: DBRecurringTransaction = {
          ...baseRecurring,
          frequency: "daily",
          startDate: new Date("2026-03-20T00:00:00.000Z"),
          lastGeneratedDate: new Date("2026-03-22T00:00:00.000Z"),
          endDate: new Date("2026-03-23T00:00:00.000Z"),
        }
        const todayUTC = new Date("2026-03-22T00:00:00.000Z")
        // Next is 2026-03-23, which equals endDate -> valid
        expect(getNextDate(dailyRec, todayUTC)).toEqual(
          new Date("2026-03-23T00:00:00.000Z")
        )

        // After 2026-03-23 is generated, next is 2026-03-24 which exceeds endDate -> null
        const afterGenerated: DBRecurringTransaction = {
          ...dailyRec,
          lastGeneratedDate: new Date("2026-03-23T00:00:00.000Z"),
        }
        expect(getNextDate(afterGenerated, todayUTC)).toBeNull()
      })

      it("should calculate next date for weekly frequency", () => {
        const weeklyRec: DBRecurringTransaction = {
          ...baseRecurring,
          frequency: "weekly",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          lastGeneratedDate: new Date("2026-01-01T00:00:00.000Z"),
        }
        const todayUTC = new Date("2026-01-05T00:00:00.000Z")
        expect(getNextDate(weeklyRec, todayUTC)).toEqual(
          new Date("2026-01-08T00:00:00.000Z")
        )
      })

      it("should calculate next date for bi-weekly frequency", () => {
        const biWeeklyRec: DBRecurringTransaction = {
          ...baseRecurring,
          frequency: "bi-weekly",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          lastGeneratedDate: new Date("2026-01-01T00:00:00.000Z"),
        }
        const todayUTC = new Date("2026-01-10T00:00:00.000Z")
        expect(getNextDate(biWeeklyRec, todayUTC)).toEqual(
          new Date("2026-01-15T00:00:00.000Z")
        )
      })

      it("should clamp targetDay to end of month for monthly frequency on leap year in getNextDate", () => {
        const leapRec: DBRecurringTransaction = {
          ...baseRecurring,
          frequency: "monthly",
          startDate: new Date("2024-01-31T00:00:00.000Z"),
          lastGeneratedDate: new Date("2024-01-31T00:00:00.000Z"),
        }
        const todayUTC = new Date("2024-02-01T00:00:00.000Z")
        expect(getNextDate(leapRec, todayUTC)).toEqual(
          new Date("2024-02-29T00:00:00.000Z")
        )
      })

      it("should calculate next date for quarterly frequency", () => {
        const quarterlyRec: DBRecurringTransaction = {
          ...baseRecurring,
          frequency: "quarterly",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          lastGeneratedDate: new Date("2026-01-01T00:00:00.000Z"),
        }
        const todayUTC = new Date("2026-02-01T00:00:00.000Z")
        expect(getNextDate(quarterlyRec, todayUTC)).toEqual(
          new Date("2026-04-01T00:00:00.000Z")
        )
      })

      it("should calculate next date for yearly frequency", () => {
        const yearlyRec: DBRecurringTransaction = {
          ...baseRecurring,
          frequency: "yearly",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          lastGeneratedDate: new Date("2026-01-01T00:00:00.000Z"),
        }
        const todayUTC = new Date("2026-02-01T00:00:00.000Z")
        expect(getNextDate(yearlyRec, todayUTC)).toEqual(
          new Date("2027-01-01T00:00:00.000Z")
        )
      })

      it("should calculate next date for random frequency with custom days", () => {
        const randomRec: DBRecurringTransaction = {
          ...baseRecurring,
          frequency: "random",
          randomEveryXDays: 4,
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          lastGeneratedDate: new Date("2026-01-01T00:00:00.000Z"),
        }
        const todayUTC = new Date("2026-01-03T00:00:00.000Z")
        expect(getNextDate(randomRec, todayUTC)).toEqual(
          new Date("2026-01-05T00:00:00.000Z")
        )
      })

      it("should fallback randomEveryXDays to 1 when undefined or less than 1 in getNextDate", () => {
        const randomRec: DBRecurringTransaction = {
          ...baseRecurring,
          frequency: "random",
          randomEveryXDays: -2,
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          lastGeneratedDate: new Date("2026-01-01T00:00:00.000Z"),
        }
        const todayUTC = new Date("2026-01-01T00:00:00.000Z")
        expect(getNextDate(randomRec, todayUTC)).toEqual(
          new Date("2026-01-02T00:00:00.000Z")
        )
      })

      it("should fallback randomEveryXDays to 1 when undefined in getNextDate", () => {
        const randomRec: DBRecurringTransaction = {
          ...baseRecurring,
          frequency: "random",
          randomEveryXDays: undefined,
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          lastGeneratedDate: new Date("2026-01-01T00:00:00.000Z"),
        }
        const todayUTC = new Date("2026-01-01T00:00:00.000Z")
        expect(getNextDate(randomRec, todayUTC)).toEqual(
          new Date("2026-01-02T00:00:00.000Z")
        )
      })
    })
  })
})
