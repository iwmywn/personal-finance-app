import { NextRequest } from "next/server"
import { Decimal128, ObjectId } from "mongodb"

import {
  insertTestRecurringTransaction,
  insertTestTransaction,
  insertTestUser,
} from "@/tests/backend/helpers/database"
import {
  mockDBBannedUser,
  mockDBRecurringTransaction,
} from "@/tests/shared/data"
import { GET } from "@/app/api/(cronjobs)/recurring-transactions/route"
import {
  getDueDates,
  getNextDate,
} from "@/app/api/(cronjobs)/recurring-transactions/utils"
import {
  getRecurringTransactionsCollection,
  getTransactionsCollection,
} from "@/lib/collections"
import { localDateToUTCMidnight } from "@/lib/date"
import type { DBRecurringTransaction, DBTransaction } from "@/lib/definitions"

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
          recurringId: recurringTransaction._id,
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

      it("should not skip recurring transaction when user created a manual transaction with identical attributes", async () => {
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

        // Manual transaction with identical fields but without recurringId
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
        expect(data.created).toBe(1)
        expect(data.skippedCount).toBe(0)

        const transactionsCollection = await getTransactionsCollection()
        const transactions = await transactionsCollection
          .find({ userId: recurringTransaction.userId })
          .toArray()

        expect(transactions).toHaveLength(2)

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

      it("should backfill missed occurrences and attach recurringId when cron was delayed", async () => {
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
        expect(createdTxs[0].recurringId?.toString()).toBe(
          recurringTransaction._id.toString()
        )
        expect(createdTxs[1].recurringId?.toString()).toBe(
          recurringTransaction._id.toString()
        )
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

      it("should not exceed MAX_ITERATIONS when startDate is far in the past", () => {
        const ancientRec: DBRecurringTransaction = {
          ...baseRecurring,
          frequency: "daily",
          startDate: new Date("1900-01-01T00:00:00.000Z"),
        }
        const todayUTC = new Date("2026-01-01T00:00:00.000Z")
        const result = getNextDate(ancientRec, todayUTC)
        expect(result).not.toBeNull()
      })
    })
  })
})
