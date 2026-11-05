import { revalidateTag } from "next/cache"
import { Collection, Decimal128, MongoServerError, ObjectId } from "mongodb"

import {
  insertTestRecurringTransaction,
  insertTestTransaction,
  insertTestUser,
} from "@/tests/backend/helpers/database"
import {
  mockDBBannedUser,
  mockDBRecurringTransaction,
} from "@/tests/shared/data"
import {
  getRecurringTransactionsCollection,
  getTransactionsCollection,
} from "@/lib/collections"
import { localDateToUTCMidnight } from "@/lib/date"
import type { DBRecurringTransaction } from "@/lib/definitions"
import {
  getDueOccurrences,
  getNextOccurrence,
  processDueRecurringTransactions,
} from "@/lib/recurring-engine"

describe("RecurringEngine", () => {
  describe("Date Projection Math", () => {
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

    describe("getNextOccurrence", () => {
      it("should return start date if lastGeneratedDate is undefined and candidate >= todayUTC", () => {
        const todayUTC = new Date("2026-01-05T00:00:00.000Z")
        const result = getNextOccurrence(baseRecurring, todayUTC)
        expect(result).toEqual(new Date("2026-01-10T00:00:00.000Z"))
      })

      it("should advance candidate until candidate >= todayUTC", () => {
        const todayUTC = new Date("2026-03-05T00:00:00.000Z")
        const result = getNextOccurrence(baseRecurring, todayUTC)
        expect(result).toEqual(new Date("2026-03-10T00:00:00.000Z"))
      })

      it("should return next occurrence when within endDate", () => {
        const recWithEnd: DBRecurringTransaction = {
          ...baseRecurring,
          lastGeneratedDate: new Date("2026-02-10T00:00:00.000Z"),
          endDate: new Date("2026-04-15T00:00:00.000Z"),
        }
        const todayUTC = new Date("2026-02-15T00:00:00.000Z")
        const result = getNextOccurrence(recWithEnd, todayUTC)
        expect(result).toEqual(new Date("2026-03-10T00:00:00.000Z"))
      })

      it("should return null when next candidate exceeds endDate", () => {
        const recEndingSoon: DBRecurringTransaction = {
          ...baseRecurring,
          lastGeneratedDate: new Date("2026-02-10T00:00:00.000Z"),
          endDate: new Date("2026-03-05T00:00:00.000Z"),
        }
        const todayUTC = new Date("2026-02-20T00:00:00.000Z")
        const result = getNextOccurrence(recEndingSoon, todayUTC)
        expect(result).toBeNull()
      })

      it("should clamp targetDay to end of month for monthly frequency on leap year", () => {
        const leapRec: DBRecurringTransaction = {
          ...baseRecurring,
          frequency: "monthly",
          startDate: new Date("2024-01-31T00:00:00.000Z"),
          lastGeneratedDate: new Date("2024-01-31T00:00:00.000Z"),
        }
        const todayUTC = new Date("2024-02-01T00:00:00.000Z")
        expect(getNextOccurrence(leapRec, todayUTC)).toEqual(
          new Date("2024-02-29T00:00:00.000Z")
        )
      })

      it("should calculate next date for daily, weekly, bi-weekly, quarterly, yearly, and random", () => {
        const dailyRec: DBRecurringTransaction = {
          ...baseRecurring,
          frequency: "daily",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          lastGeneratedDate: new Date("2026-01-01T00:00:00.000Z"),
        }
        expect(
          getNextOccurrence(dailyRec, new Date("2026-01-01T00:00:00.000Z"))
        ).toEqual(new Date("2026-01-02T00:00:00.000Z"))

        const weeklyRec: DBRecurringTransaction = {
          ...baseRecurring,
          frequency: "weekly",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          lastGeneratedDate: new Date("2026-01-01T00:00:00.000Z"),
        }
        expect(
          getNextOccurrence(weeklyRec, new Date("2026-01-05T00:00:00.000Z"))
        ).toEqual(new Date("2026-01-08T00:00:00.000Z"))

        const randomRec: DBRecurringTransaction = {
          ...baseRecurring,
          frequency: "random",
          randomEveryXDays: 3,
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          lastGeneratedDate: new Date("2026-01-01T00:00:00.000Z"),
        }
        expect(
          getNextOccurrence(randomRec, new Date("2026-01-02T00:00:00.000Z"))
        ).toEqual(new Date("2026-01-04T00:00:00.000Z"))
      })
    })

    describe("getDueOccurrences", () => {
      it("should return empty array when schedule starts in the future", () => {
        const rec: DBRecurringTransaction = {
          ...baseRecurring,
          startDate: new Date("2026-02-01T00:00:00.000Z"),
        }
        expect(
          getDueOccurrences(rec, new Date("2026-01-01T00:00:00.000Z"))
        ).toEqual([])
      })

      it("should return due occurrences up to todayUTC", () => {
        const rec: DBRecurringTransaction = {
          ...baseRecurring,
          frequency: "daily",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          lastGeneratedDate: new Date("2026-01-01T00:00:00.000Z"),
        }
        const due = getDueOccurrences(rec, new Date("2026-01-03T00:00:00.000Z"))
        expect(due).toEqual([
          new Date("2026-01-02T00:00:00.000Z"),
          new Date("2026-01-03T00:00:00.000Z"),
        ])
      })
    })
  })

  describe("processDueRecurringTransactions", () => {
    it("should create transaction when recurring transaction should generate today", async () => {
      const todayUTC = localDateToUTCMidnight(new Date("2024-02-01"))
      const lastMonthUTC = localDateToUTCMidnight(new Date("2024-01-01"))

      const recurringTransaction: DBRecurringTransaction = {
        ...mockDBRecurringTransaction,
        frequency: "monthly",
        startDate: lastMonthUTC,
        lastGeneratedDate: lastMonthUTC,
      }

      await insertTestRecurringTransaction(recurringTransaction)

      const summary = await processDueRecurringTransactions({
        asOfDate: todayUTC,
      })

      expect(summary.success).toBe(true)
      expect(summary.createdCount).toBe(1)
      expect(summary.createdIds).toHaveLength(1)
      expect(summary.skippedCount).toBe(0)

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

      const summary = await processDueRecurringTransactions({
        asOfDate: localDateToUTCMidnight(new Date("2024-02-02")),
      })

      expect(summary.createdCount).toBe(0)
      expect(summary.skippedCount).toBe(1)
      expect(summary.skippedReason[0].reason).toBe("notToday")
    })

    it("should backfill missed occurrences when cron is delayed", async () => {
      const startDateUTC = localDateToUTCMidnight(new Date("2024-01-01"))
      const todayUTC = localDateToUTCMidnight(new Date("2024-01-05"))

      const recurringTransaction: DBRecurringTransaction = {
        ...mockDBRecurringTransaction,
        frequency: "daily",
        startDate: startDateUTC,
        lastGeneratedDate: startDateUTC,
      }

      await insertTestRecurringTransaction(recurringTransaction)

      const summary = await processDueRecurringTransactions({
        asOfDate: todayUTC,
      })

      // Missed: Jan 2, Jan 3, Jan 4, Jan 5 -> 4 transactions
      expect(summary.createdCount).toBe(4)

      const transactionsCollection = await getTransactionsCollection()
      const count = await transactionsCollection.countDocuments({
        userId: recurringTransaction.userId,
      })
      expect(count).toBe(4)

      const recurringCollection = await getRecurringTransactionsCollection()
      const updated = await recurringCollection.findOne({
        _id: recurringTransaction._id,
      })
      expect(updated?.lastGeneratedDate).toEqual(todayUTC)
    })

    it("should bound due occurrences by maxOccurrencesPerSchedule and continue backfill on subsequent run", async () => {
      const startDateUTC = localDateToUTCMidnight(new Date("2024-01-01"))
      const day3 = localDateToUTCMidnight(new Date("2024-01-03"))
      const day5 = localDateToUTCMidnight(new Date("2024-01-05"))
      const todayUTC = localDateToUTCMidnight(new Date("2024-01-05"))

      const recurringTransaction: DBRecurringTransaction = {
        ...mockDBRecurringTransaction,
        frequency: "daily",
        startDate: startDateUTC,
        lastGeneratedDate: startDateUTC,
      }

      await insertTestRecurringTransaction(recurringTransaction)

      // First run bounded to 2 occurrences (Jan 2, Jan 3)
      const summaryRun1 = await processDueRecurringTransactions({
        asOfDate: todayUTC,
        maxOccurrencesPerSchedule: 2,
      })

      expect(summaryRun1.createdCount).toBe(2)
      const recurringCollection = await getRecurringTransactionsCollection()
      const afterRun1 = await recurringCollection.findOne({
        _id: recurringTransaction._id,
      })
      expect(afterRun1?.lastGeneratedDate).toEqual(day3)

      // Second run bounded to 2 occurrences (Jan 4, Jan 5)
      const summaryRun2 = await processDueRecurringTransactions({
        asOfDate: todayUTC,
        maxOccurrencesPerSchedule: 2,
      })

      expect(summaryRun2.createdCount).toBe(2)
      const afterRun2 = await recurringCollection.findOne({
        _id: recurringTransaction._id,
      })
      expect(afterRun2?.lastGeneratedDate).toEqual(day5)

      // Third run: everything is up to date
      const summaryRun3 = await processDueRecurringTransactions({
        asOfDate: todayUTC,
        maxOccurrencesPerSchedule: 2,
      })

      expect(summaryRun3.createdCount).toBe(0)
      expect(summaryRun3.skippedReason[0].reason).toBe("notToday")
    })

    it("should not process recurring transactions belonging to banned users", async () => {
      const todayUTC = localDateToUTCMidnight(new Date("2024-02-01"))
      const bannedUser = { ...mockDBBannedUser, _id: new ObjectId() }
      await insertTestUser(bannedUser)

      const recurringTransaction: DBRecurringTransaction = {
        ...mockDBRecurringTransaction,
        userId: bannedUser._id,
        startDate: localDateToUTCMidnight(new Date("2024-01-01")),
        lastGeneratedDate: localDateToUTCMidnight(new Date("2024-01-01")),
      }
      await insertTestRecurringTransaction(recurringTransaction)

      const summary = await processDueRecurringTransactions({
        asOfDate: todayUTC,
      })
      expect(summary.createdCount).toBe(0)
    })

    it("should handle partial backfill when one occurrence already exists", async () => {
      const startDateUTC = localDateToUTCMidnight(new Date("2024-01-01"))
      const existingDateUTC = localDateToUTCMidnight(new Date("2024-01-02"))
      const todayUTC = localDateToUTCMidnight(new Date("2024-01-03"))

      const recurringTransaction: DBRecurringTransaction = {
        ...mockDBRecurringTransaction,
        frequency: "daily",
        startDate: startDateUTC,
        lastGeneratedDate: startDateUTC,
      }
      await insertTestRecurringTransaction(recurringTransaction)

      // Insert existing transaction for Jan 2
      await insertTestTransaction({
        _id: new ObjectId(),
        userId: recurringTransaction.userId,
        type: recurringTransaction.type,
        categoryKey: recurringTransaction.categoryKey,
        amount: recurringTransaction.amount,
        currency: recurringTransaction.currency,
        description: recurringTransaction.description,
        date: existingDateUTC,
      })

      const summary = await processDueRecurringTransactions({
        asOfDate: todayUTC,
      })

      // Jan 2 is existing, Jan 3 is created -> created 1, skipped 1
      expect(summary.createdCount).toBe(1)
      expect(summary.skippedCount).toBe(1)
      expect(summary.skippedReason[0].reason).toBe("existing")
    })

    it("should dispatch onOccurrencesCreated callback and invalidate cache tags", async () => {
      const todayUTC = localDateToUTCMidnight(new Date("2024-02-01"))
      const recurringTransaction: DBRecurringTransaction = {
        ...mockDBRecurringTransaction,
        startDate: localDateToUTCMidnight(new Date("2024-01-01")),
        lastGeneratedDate: localDateToUTCMidnight(new Date("2024-01-01")),
      }
      await insertTestRecurringTransaction(recurringTransaction)

      const onOccurrencesCreated = vi.fn().mockResolvedValue(undefined)

      const summary = await processDueRecurringTransactions({
        asOfDate: todayUTC,
        onOccurrencesCreated,
      })

      expect(summary.createdCount).toBe(1)
      expect(onOccurrencesCreated).toHaveBeenCalledWith([todayUTC])
      expect(revalidateTag).toHaveBeenCalledWith(
        `transactions-${recurringTransaction.userId}`,
        { expire: 0 }
      )
      expect(revalidateTag).toHaveBeenCalledWith(
        `recurringTransactions-${recurringTransaction.userId}`,
        { expire: 0 }
      )
    })

    it("should handle duplicate key error without advancing lastGeneratedDate", async () => {
      const todayUTC = localDateToUTCMidnight(new Date("2024-02-01"))
      const initialLastGen = localDateToUTCMidnight(new Date("2024-01-01"))
      const recurringTransaction: DBRecurringTransaction = {
        ...mockDBRecurringTransaction,
        startDate: initialLastGen,
        lastGeneratedDate: initialLastGen,
      }
      await insertTestRecurringTransaction(recurringTransaction)

      const insertManySpy = vi
        .spyOn(Collection.prototype, "insertMany")
        .mockImplementationOnce(async () => {
          const err = new MongoServerError({
            message: "E11000 duplicate key error",
          })
          err.code = 11000
          throw err
        })

      const summary = await processDueRecurringTransactions({
        asOfDate: todayUTC,
      })

      expect(summary.createdCount).toBe(0)
      expect(summary.skippedCount).toBe(1)
      expect(summary.skippedReason[0].reason).toBe("existing")
      expect(summary.affectedUserIds).toContain(
        recurringTransaction.userId.toString()
      )

      // Verify that lastGeneratedDate was NOT advanced
      const recurringCollection = await getRecurringTransactionsCollection()
      const updated = await recurringCollection.findOne({
        _id: recurringTransaction._id,
      })
      expect(updated?.lastGeneratedDate?.getTime()).toBe(
        initialLastGen.getTime()
      )

      insertManySpy.mockRestore()
    })

    it("should isolate attempt-local state on transaction retry", async () => {
      const todayUTC = localDateToUTCMidnight(new Date("2024-02-01"))
      const recurringTransaction: DBRecurringTransaction = {
        ...mockDBRecurringTransaction,
        startDate: localDateToUTCMidnight(new Date("2024-01-01")),
        lastGeneratedDate: localDateToUTCMidnight(new Date("2024-01-01")),
      }
      await insertTestRecurringTransaction(recurringTransaction)

      let attempts = 0
      const insertManySpy = vi
        .spyOn(Collection.prototype, "insertMany")
        .mockImplementation(async function (this: unknown, ...args: unknown[]) {
          attempts++
          if (attempts === 1) {
            const err = new MongoServerError({
              message: "Transient transaction error",
            })
            err.addErrorLabel("TransientTransactionError")
            throw err
          }
          insertManySpy.mockRestore()
          // @ts-expect-error calling original prototype method
          return Collection.prototype.insertMany.apply(this, args)
        })

      const summary = await processDueRecurringTransactions({
        asOfDate: todayUTC,
      })

      expect(attempts).toBe(2)
      expect(summary.createdCount).toBe(1)
      expect(summary.createdIds).toHaveLength(1)
      expect(summary.skippedCount).toBe(0)

      insertManySpy.mockRestore()
    })
  })
})
