import { ObjectId } from "mongodb"

import { insertTestBudget } from "@/tests/backend/helpers/database"
import { mockBudgetCollectionError } from "@/tests/backend/mocks/collections.mock"
import {
  mockAuthenticatedAsAnotherUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from "@/tests/backend/mocks/session.mock"
import {
  mockDBBudget,
  mockDBUser,
  mockUser,
  mockValidBudgetValues,
} from "@/tests/shared/data"
import {
  createBudget,
  deleteBudget,
  getBudgets,
  updateBudget,
} from "@/actions/budget.actions"
import { getBudgetsCollection } from "@/lib/collections"
import { localDateToUTCMidnight } from "@/lib/date"
import { triggerRateLimit } from "@/lib/rate-limit"

describe("Budgets", async () => {
  describe("createBudget", () => {
    it("should return error when data is invalid", async () => {
      // @ts-expect-error - Testing invalid data
      const result = await createBudget({})

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid data!")
    })

    it("should return error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await createBudget(mockValidBudgetValues)

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
    })

    it("should return error when rate limit is exceeded", async () => {
      mockAuthenticatedUser()
      await triggerRateLimit(`budget:${mockUser.id}`)

      const result = await createBudget(mockValidBudgetValues)

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Too many requests! Please slow down and try again later."
      )
    })

    it("should return error when categoryKey is invalid or does not belong to user", async () => {
      mockAuthenticatedUser()

      const result = await createBudget({
        ...mockValidBudgetValues,
        categoryKey: "non-existent-or-invalid-key",
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid category!")
    })

    it("should return error when budget category is not an outflow category", async () => {
      mockAuthenticatedUser()

      const result = await createBudget({
        ...mockValidBudgetValues,
        categoryKey: "salary_bonus",
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid category!")
    })

    it("should successfully create budget", async () => {
      mockAuthenticatedUser()

      const result = await createBudget(mockValidBudgetValues)
      const budgetsCollection = await getBudgetsCollection()
      const addedBudget = await budgetsCollection.findOne({
        userId: mockDBUser._id,
      })

      expect(addedBudget?.categoryKey).toBe("food_beverage")
      expect(addedBudget?.allocatedAmount.toString()).toBe("1000000")
      expect(addedBudget?.startDate.toISOString()).toBe(
        "2024-01-01T00:00:00.000Z"
      )
      expect(addedBudget?.endDate.toISOString()).toBe(
        "2024-01-31T00:00:00.000Z"
      )
      expect(result.success).toBe("Budget has been created.")
      expect(result.error).toBeUndefined()
    })

    it("should return error when budget already exists", async () => {
      await insertTestBudget(mockDBBudget)
      mockAuthenticatedUser()

      const result = await createBudget({
        categoryKey: mockDBBudget.categoryKey,
        currency: mockDBBudget.currency,
        allocatedAmount: "2000000",
        startDate: mockDBBudget.startDate,
        endDate: mockDBBudget.endDate,
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("This budget already exists!")
    })

    it("should prevent race condition when creating duplicate budgets concurrently", async () => {
      mockAuthenticatedUser()

      const [firstResult, secondResult] = await Promise.all([
        createBudget(mockValidBudgetValues),
        createBudget(mockValidBudgetValues),
      ])

      const results = [firstResult, secondResult]
      const successCount = results.filter(
        (r) => r.success === "Budget has been created."
      ).length
      const errorCount = results.filter(
        (r) => r.error === "This budget already exists!"
      ).length

      expect(successCount).toBe(1)
      expect(errorCount).toBe(1)
    })

    it("should return error when database operation throws error", async () => {
      mockAuthenticatedUser()
      mockBudgetCollectionError()

      const result = await createBudget(mockValidBudgetValues)

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Failed to create budget! Please try again later."
      )
    })
  })

  describe("updateBudget", () => {
    it("should return error with invalid budget ID", async () => {
      mockAuthenticatedUser()

      const result = await updateBudget("invalid-id", mockValidBudgetValues)

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid budget ID!")
    })

    it("should return error when data is invalid", async () => {
      // @ts-expect-error - Testing invalid data
      const result = await updateBudget(mockDBBudget._id.toString(), {})

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid data!")
    })

    it("should return error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await updateBudget(
        mockDBBudget._id.toString(),
        mockValidBudgetValues
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
    })

    it("should return error when rate limit is exceeded", async () => {
      mockAuthenticatedUser()
      await triggerRateLimit(`budget:${mockUser.id}`)

      const result = await updateBudget(
        mockDBBudget._id.toString(),
        mockValidBudgetValues
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Too many requests! Please slow down and try again later."
      )
    })

    it("should return error when categoryKey is invalid or does not belong to user", async () => {
      mockAuthenticatedUser()

      const result = await updateBudget(mockDBBudget._id.toString(), {
        ...mockValidBudgetValues,
        categoryKey: "non-existent-or-invalid-key",
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid category!")
    })

    it("should return error when budget category is not an outflow category", async () => {
      mockAuthenticatedUser()

      const result = await updateBudget(mockDBBudget._id.toString(), {
        ...mockValidBudgetValues,
        categoryKey: "salary_bonus",
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid category!")
    })

    it("should return error when budget not found", async () => {
      mockAuthenticatedUser()

      const result = await updateBudget(
        mockDBBudget._id.toString(),
        mockValidBudgetValues
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Budget not found or you don't have permission to edit!"
      )
    })

    it("should return error when another user tries to update", async () => {
      await insertTestBudget(mockDBBudget)
      mockAuthenticatedAsAnotherUser()

      const result = await updateBudget(mockDBBudget._id.toString(), {
        categoryKey: "transportation",
        allocatedAmount: "9999999",
        currency: "VND",
        startDate: localDateToUTCMidnight(new Date("2024-02-01")),
        endDate: localDateToUTCMidnight(new Date("2024-02-29")),
      })
      const budgetsCollection = await getBudgetsCollection()
      const unchangedBudget = await budgetsCollection.findOne({
        _id: mockDBBudget._id,
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Budget not found or you don't have permission to edit!"
      )
      expect(unchangedBudget?.allocatedAmount.toString()).toBe("1000000")
    })

    it("should successfully update budget", async () => {
      await Promise.all([
        insertTestBudget(mockDBBudget),
        insertTestBudget({
          ...mockDBBudget,
          _id: new ObjectId("690ec0c23f50e19549bd7e52"),
          currency: "USD",
        }),
      ])
      mockAuthenticatedUser()

      const result = await updateBudget(mockDBBudget._id.toString(), {
        categoryKey: "transportation",
        allocatedAmount: "2000000",
        currency: "VND",
        startDate: localDateToUTCMidnight(new Date("2024-02-01")),
        endDate: localDateToUTCMidnight(new Date("2024-02-29")),
      })
      const budgetsCollection = await getBudgetsCollection()
      const updatedBudget = await budgetsCollection.findOne({
        _id: mockDBBudget._id,
      })
      const unrelatedBudget = await budgetsCollection.findOne({
        _id: new ObjectId("690ec0c23f50e19549bd7e52"),
      })

      expect(updatedBudget?.categoryKey).toBe("transportation")
      expect(updatedBudget?.allocatedAmount.toString()).toBe("2000000")
      expect(updatedBudget?.startDate.toISOString()).toBe(
        "2024-02-01T00:00:00.000Z"
      )
      expect(updatedBudget?.endDate.toISOString()).toBe(
        "2024-02-29T00:00:00.000Z"
      )
      expect(unrelatedBudget?.categoryKey).toBe("food_beverage")
      expect(unrelatedBudget?.allocatedAmount.toString()).toBe("1000000")
      expect(unrelatedBudget?.startDate.toISOString()).toBe(
        "2024-01-01T00:00:00.000Z"
      )
      expect(unrelatedBudget?.endDate.toISOString()).toBe(
        "2024-01-31T00:00:00.000Z"
      )
      expect(result.success).toBe("Budget has been updated.")
      expect(result.error).toBeUndefined()
    })

    it("should return error when updating budget causes duplicate key collision", async () => {
      await Promise.all([
        insertTestBudget(mockDBBudget),
        insertTestBudget({
          ...mockDBBudget,
          _id: new ObjectId("690ec0c23f50e19549bd7e52"),
          currency: "USD",
        }),
      ])
      mockAuthenticatedUser()

      const result = await updateBudget("690ec0c23f50e19549bd7e52", {
        categoryKey: mockDBBudget.categoryKey,
        currency: "VND",
        allocatedAmount: mockDBBudget.allocatedAmount.toString(),
        startDate: mockDBBudget.startDate,
        endDate: mockDBBudget.endDate,
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("This budget already exists!")
    })

    it("should prevent race condition when updating duplicate budgets concurrently", async () => {
      await Promise.all([
        insertTestBudget({
          ...mockDBBudget,
          _id: new ObjectId("690ec0c23f50e19549bd7e51"),
          currency: "USD",
        }),
        insertTestBudget({
          ...mockDBBudget,
          _id: new ObjectId("690ec0c23f50e19549bd7e52"),
          currency: "JPY",
        }),
      ])
      mockAuthenticatedUser()

      const targetValues = {
        categoryKey: mockDBBudget.categoryKey,
        currency: "VND" as const,
        allocatedAmount: mockDBBudget.allocatedAmount.toString(),
        startDate: mockDBBudget.startDate,
        endDate: mockDBBudget.endDate,
      }

      const [firstResult, secondResult] = await Promise.all([
        updateBudget("690ec0c23f50e19549bd7e51", targetValues),
        updateBudget("690ec0c23f50e19549bd7e52", targetValues),
      ])

      const results = [firstResult, secondResult]
      const successCount = results.filter(
        (r) => r.success === "Budget has been updated."
      ).length
      const errorCount = results.filter(
        (r) => r.error === "This budget already exists!"
      ).length

      expect(successCount).toBe(1)
      expect(errorCount).toBe(1)
    })

    it("should return error when database operation throws error", async () => {
      mockAuthenticatedUser()
      mockBudgetCollectionError()

      const result = await updateBudget(
        mockDBBudget._id.toString(),
        mockValidBudgetValues
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Failed to update budget! Please try again later."
      )
    })
  })

  describe("deleteBudget", () => {
    it("should return error with invalid budget ID", async () => {
      mockAuthenticatedUser()

      const result = await deleteBudget("invalid-id")

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid budget ID!")
    })

    it("should return error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await deleteBudget(mockDBBudget._id.toString())

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
    })

    it("should return error when rate limit is exceeded", async () => {
      mockAuthenticatedUser()
      await triggerRateLimit(`budget:${mockUser.id}`)

      const result = await deleteBudget(mockDBBudget._id.toString())

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Too many requests! Please slow down and try again later."
      )
    })

    it("should return error when budget not found", async () => {
      mockAuthenticatedUser()

      const result = await deleteBudget(mockDBBudget._id.toString())

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Budget not found or you don't have permission to delete!"
      )
    })

    it("should return error when another user tries to delete", async () => {
      await insertTestBudget(mockDBBudget)
      mockAuthenticatedAsAnotherUser()

      const result = await deleteBudget(mockDBBudget._id.toString())
      const budgetsCollection = await getBudgetsCollection()
      const unchangedBudget = await budgetsCollection.findOne({
        _id: mockDBBudget._id,
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Budget not found or you don't have permission to delete!"
      )
      expect(unchangedBudget).not.toBe(null)
    })

    it("should successfully delete budget", async () => {
      await insertTestBudget(mockDBBudget)
      mockAuthenticatedUser()

      const result = await deleteBudget(mockDBBudget._id.toString())
      const budgetsCollection = await getBudgetsCollection()
      const deletedBudget = await budgetsCollection.findOne({
        _id: mockDBBudget._id,
      })

      expect(deletedBudget).toBe(null)
      expect(result.success).toBe("Budget has been deleted.")
      expect(result.error).toBeUndefined()
    })

    it("should return error when database operation throws error", async () => {
      mockAuthenticatedUser()
      mockBudgetCollectionError()

      const result = await deleteBudget(mockDBBudget._id.toString())

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Failed to delete budget! Please try again later."
      )
    })
  })

  describe("getBudgets", () => {
    it("should return error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await getBudgets()

      expect(result.budgets).toBeUndefined()
      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
    })

    it("should return empty budgets list", async () => {
      mockAuthenticatedUser()

      const result = await getBudgets()

      expect(result.budgets).toEqual([])
      expect(result.error).toBeUndefined()
    })

    it("should return budgets list", async () => {
      await insertTestBudget(mockDBBudget)
      mockAuthenticatedUser()

      const result = await getBudgets()

      expect(result.budgets).toHaveLength(1)
      expect(result.budgets?.[0].categoryKey).toBe("food_beverage")
      expect(result.budgets?.[0].allocatedAmount).toBe("1000000")
      expect(result.error).toBeUndefined()
    })

    it("should return budgets sorted by startDate and _id descending", async () => {
      const budget1 = {
        ...mockDBBudget,
        _id: new ObjectId("68f795d4bdcc3c9a30717988"),
        startDate: localDateToUTCMidnight(new Date("2024-01-01")),
      }
      const budget2 = {
        ...mockDBBudget,
        _id: new ObjectId("68f795d4bdcc3c9a30717989"),
        categoryKey: "transportation",
        startDate: localDateToUTCMidnight(new Date("2024-01-01")),
      }
      const budget3 = {
        ...mockDBBudget,
        _id: new ObjectId("68f795d4bdcc3c9a30717990"),
        startDate: localDateToUTCMidnight(new Date("2024-02-01")),
      }

      await Promise.all([
        insertTestBudget(budget1),
        insertTestBudget(budget2),
        insertTestBudget(budget3),
      ])
      mockAuthenticatedUser()

      const result = await getBudgets()

      expect(result.budgets).toHaveLength(3)
      // Should be sorted by startDate descending, then _id descending
      expect(result.budgets?.[0].startDate.toISOString()).toBe(
        "2024-02-01T00:00:00.000Z"
      )
      expect(result.budgets?.[1]._id).toBe("68f795d4bdcc3c9a30717989")
      expect(result.budgets?.[2]._id).toBe("68f795d4bdcc3c9a30717988")
      expect(result.error).toBeUndefined()
    })

    it("should return error when database operation throws error", async () => {
      mockAuthenticatedUser()
      mockBudgetCollectionError()

      const result = await getBudgets()

      expect(result.budgets).toBeUndefined()
      expect(result.error).toBe(
        "Failed to load budgets! Please try again later."
      )
    })
  })
})
