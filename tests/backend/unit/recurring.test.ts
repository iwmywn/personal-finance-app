import { ObjectId } from "mongodb"

import { insertTestRecurringTransaction } from "@/tests/backend/helpers/database"
import { mockRecurringTransactionCollectionError } from "@/tests/backend/mocks/collections.mock"
import {
  mockAuthenticatedAsAnotherUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from "@/tests/backend/mocks/session.mock"
import {
  mockDBRecurringTransaction,
  mockDBUser,
  mockValidRecurringTransactionValues,
} from "@/tests/shared/data"
import {
  createRecurringTransaction,
  deleteRecurringTransaction,
  getRecurringTransactions,
} from "@/actions/recurring.actions"
import { getRecurringTransactionsCollection } from "@/lib/collections"
import { localDateToUTCMidnight } from "@/lib/date"

describe("Recurring Transactions", async () => {
  beforeEach(() => {
    // mock time to 2024-06-01 to ensure endDate 2024-12-31 is in the future
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-01T12:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("createRecurringTransaction", () => {
    it("should return error when data is invalid", async () => {
      // @ts-expect-error - Testing invalid data
      const result = await createRecurringTransaction({})

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid data!")
    })

    it("should return error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await createRecurringTransaction(
        mockValidRecurringTransactionValues
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
    })

    it("should return error when recurring transaction already exists", async () => {
      await insertTestRecurringTransaction(mockDBRecurringTransaction)
      mockAuthenticatedUser()

      const result = await createRecurringTransaction({
        type: mockDBRecurringTransaction.type,
        categoryKey: mockDBRecurringTransaction.categoryKey,
        amount: mockDBRecurringTransaction.amount.toString(),
        currency: mockDBRecurringTransaction.currency,
        description: mockDBRecurringTransaction.description,
        frequency: mockDBRecurringTransaction.frequency,
        randomEveryXDays: mockDBRecurringTransaction.randomEveryXDays,
        startDate: mockDBRecurringTransaction.startDate,
        endDate: mockDBRecurringTransaction.endDate,
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("This recurring transaction already exists!")
    })

    it("should return error when categoryKey is invalid or does not belong to user", async () => {
      mockAuthenticatedUser()

      const result = await createRecurringTransaction({
        ...mockValidRecurringTransactionValues,
        categoryKey: "non-existent-or-invalid-key",
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid category!")
    })

    it("should return error when recurring transaction type does not match category type", async () => {
      mockAuthenticatedUser()

      const result = await createRecurringTransaction({
        ...mockValidRecurringTransactionValues,
        type: "outflow",
        categoryKey: "business_freelance",
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid category!")
    })

    it("should successfully create recurring transaction with monthly frequency", async () => {
      mockAuthenticatedUser()

      const result = await createRecurringTransaction(
        mockValidRecurringTransactionValues
      )
      const recurringCollection = await getRecurringTransactionsCollection()
      const addedRecurring = await recurringCollection.findOne({
        userId: mockDBUser._id,
      })

      expect(addedRecurring?.type).toBe("inflow")
      expect(addedRecurring?.categoryKey).toBe("business_freelance")
      expect(addedRecurring?.amount.toString()).toBe("2500000")
      expect(addedRecurring?.description).toBe("Freelance project payment")
      expect(addedRecurring?.frequency).toBe("monthly")
      expect(addedRecurring?.startDate.toISOString()).toBe(
        "2024-02-01T00:00:00.000Z"
      )
      expect(addedRecurring?.endDate?.toISOString()).toBe(
        "2024-12-31T00:00:00.000Z"
      )
      expect(result.success).toBe("Recurring transaction has been created.")
      expect(result.error).toBeUndefined()
    })

    it("should successfully create recurring transaction with weekly frequency", async () => {
      mockAuthenticatedUser()

      const result = await createRecurringTransaction({
        ...mockValidRecurringTransactionValues,
        frequency: "weekly",
      })
      const recurringCollection = await getRecurringTransactionsCollection()
      const addedRecurring = await recurringCollection.findOne({
        userId: mockDBUser._id,
        frequency: "weekly",
      })

      expect(addedRecurring?.frequency).toBe("weekly")
      expect(result.success).toBe("Recurring transaction has been created.")
      expect(result.error).toBeUndefined()
    })

    it("should successfully create recurring transaction with bi-weekly frequency", async () => {
      mockAuthenticatedUser()

      const result = await createRecurringTransaction({
        ...mockValidRecurringTransactionValues,
        frequency: "bi-weekly",
      })
      const recurringCollection = await getRecurringTransactionsCollection()
      const addedRecurring = await recurringCollection.findOne({
        userId: mockDBUser._id,
        frequency: "bi-weekly",
      })

      expect(addedRecurring?.frequency).toBe("bi-weekly")
      expect(result.success).toBe("Recurring transaction has been created.")
      expect(result.error).toBeUndefined()
    })

    it("should successfully create recurring transaction with random frequency", async () => {
      mockAuthenticatedUser()

      const result = await createRecurringTransaction({
        ...mockValidRecurringTransactionValues,
        frequency: "random",
        randomEveryXDays: 3,
      })
      const recurringCollection = await getRecurringTransactionsCollection()
      const addedRecurring = await recurringCollection.findOne({
        userId: mockDBUser._id,
        frequency: "random",
      })

      expect(addedRecurring?.frequency).toBe("random")
      expect(addedRecurring?.randomEveryXDays).toBe(3)
      expect(result.success).toBe("Recurring transaction has been created.")
      expect(result.error).toBeUndefined()
    })

    it("should prevent race condition when creating duplicate recurring transactions concurrently", async () => {
      mockAuthenticatedUser()

      const [firstResult, secondResult] = await Promise.all([
        createRecurringTransaction(mockValidRecurringTransactionValues),
        createRecurringTransaction(mockValidRecurringTransactionValues),
      ])

      const results = [firstResult, secondResult]
      const successCount = results.filter(
        (r) => r.success === "Recurring transaction has been created."
      ).length
      const errorCount = results.filter(
        (r) => r.error === "This recurring transaction already exists!"
      ).length

      expect(successCount).toBe(1)
      expect(errorCount).toBe(1)
    })

    it("should return error when database operation throws error", async () => {
      mockAuthenticatedUser()
      mockRecurringTransactionCollectionError()

      const result = await createRecurringTransaction(
        mockValidRecurringTransactionValues
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Failed to create recurring transaction! Please try again later."
      )
    })
  })

  describe("deleteRecurringTransaction", () => {
    it("should return error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await deleteRecurringTransaction(
        mockDBRecurringTransaction._id.toString()
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
    })

    it("should return error with invalid recurring ID", async () => {
      mockAuthenticatedUser()

      const result = await deleteRecurringTransaction("invalid-id")

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid recurring transaction ID!")
    })

    it("should return error when recurring transaction not found", async () => {
      mockAuthenticatedUser()

      const result = await deleteRecurringTransaction(
        mockDBRecurringTransaction._id.toString()
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Recurring transaction not found or you don't have permission to delete!"
      )
    })

    it("should return error when another user tries to delete", async () => {
      await insertTestRecurringTransaction(mockDBRecurringTransaction)
      mockAuthenticatedAsAnotherUser()

      const result = await deleteRecurringTransaction(
        mockDBRecurringTransaction._id.toString()
      )
      const recurringCollection = await getRecurringTransactionsCollection()
      const unchangedRecurring = await recurringCollection.findOne({
        _id: mockDBRecurringTransaction._id,
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Recurring transaction not found or you don't have permission to delete!"
      )
      expect(unchangedRecurring).not.toBe(null)
    })

    it("should successfully delete recurring transaction", async () => {
      await insertTestRecurringTransaction(mockDBRecurringTransaction)
      mockAuthenticatedUser()

      const result = await deleteRecurringTransaction(
        mockDBRecurringTransaction._id.toString()
      )
      const recurringCollection = await getRecurringTransactionsCollection()
      const deletedRecurring = await recurringCollection.findOne({
        _id: mockDBRecurringTransaction._id,
      })

      expect(deletedRecurring).toBe(null)
      expect(result.success).toBe("Recurring transaction has been deleted.")
      expect(result.error).toBeUndefined()
    })

    it("should return error when database operation throws error", async () => {
      mockAuthenticatedUser()
      mockRecurringTransactionCollectionError()

      const result = await deleteRecurringTransaction(
        mockDBRecurringTransaction._id.toString()
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Failed to delete recurring transaction! Please try again later."
      )
    })
  })

  describe("getRecurringTransactions", () => {
    it("should return error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await getRecurringTransactions()

      expect(result.recurringTransactions).toBeUndefined()
      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
    })

    it("should return empty recurring transactions list", async () => {
      mockAuthenticatedUser()

      const result = await getRecurringTransactions()

      expect(result.recurringTransactions).toEqual([])
      expect(result.error).toBeUndefined()
    })

    it("should return recurring transactions list", async () => {
      await insertTestRecurringTransaction(mockDBRecurringTransaction)
      mockAuthenticatedUser()

      const result = await getRecurringTransactions()

      expect(result.recurringTransactions).toHaveLength(1)
      expect(result.recurringTransactions?.[0].description).toBe(
        "Monthly Salary"
      )
      expect(result.recurringTransactions?.[0].amount).toBe("5000000")
      expect(result.error).toBeUndefined()
    })

    it("should return recurring transactions sorted by startDate and _id descending", async () => {
      const recurring1 = {
        ...mockDBRecurringTransaction,
        _id: new ObjectId("68f73357357d93dcbaae8106"),
        description: "Monthly Salary 1",
        startDate: localDateToUTCMidnight(new Date("2024-01-15")),
      }
      const recurring2 = {
        ...mockDBRecurringTransaction,
        _id: new ObjectId("68f73357357d93dcbaae8107"),
        description: "Monthly Salary 2",
        startDate: localDateToUTCMidnight(new Date("2024-01-15")),
      }
      const recurring3 = {
        ...mockDBRecurringTransaction,
        _id: new ObjectId("68f73357357d93dcbaae8108"),
        description: "Monthly Salary 3",
        startDate: localDateToUTCMidnight(new Date("2024-02-15")),
      }

      await Promise.all([
        insertTestRecurringTransaction(recurring1),
        insertTestRecurringTransaction(recurring2),
        insertTestRecurringTransaction(recurring3),
      ])
      mockAuthenticatedUser()

      const result = await getRecurringTransactions()

      expect(result.recurringTransactions).toHaveLength(3)
      // Should be sorted by startDate descendinghen _id descending
      expect(result.recurringTransactions?.[0].startDate.toISOString()).toBe(
        "2024-02-15T00:00:00.000Z"
      )
      expect(result.recurringTransactions?.[1]._id).toBe(
        "68f73357357d93dcbaae8107"
      )
      expect(result.recurringTransactions?.[2]._id).toBe(
        "68f73357357d93dcbaae8106"
      )
      expect(result.error).toBeUndefined()
    })

    it("should return error when database operation throws error", async () => {
      mockAuthenticatedUser()
      mockRecurringTransactionCollectionError()

      const result = await getRecurringTransactions()

      expect(result.recurringTransactions).toBeUndefined()
      expect(result.error).toBe(
        "Failed to load recurring transactions! Please try again later."
      )
    })
  })
})
