import { ObjectId } from "mongodb"

import { insertTestGoal } from "@/tests/backend/helpers/database"
import { mockGoalCollectionError } from "@/tests/backend/mocks/collections.mock"
import {
  mockAuthenticatedAsAnotherUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from "@/tests/backend/mocks/session.mock"
import {
  mockDBGoal,
  mockDBUser,
  mockUser,
  mockValidGoalValues,
} from "@/tests/shared/data"
import {
  createGoal,
  deleteGoal,
  getGoals,
  updateGoal,
} from "@/actions/goal.actions"
import { getGoalsCollection } from "@/lib/collections"
import { localDateToUTCMidnight } from "@/lib/date"
import { triggerRateLimit } from "@/lib/rate-limit"

describe("Goals", async () => {
  describe("createGoal", () => {
    it("should return error when data is invalid", async () => {
      // @ts-expect-error - Testing invalid data
      const result = await createGoal({})

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid data!")
    })

    it("should return error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await createGoal(mockValidGoalValues)

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
    })

    it("should return error when rate limit is exceeded", async () => {
      mockAuthenticatedUser()
      await triggerRateLimit(`goal:${mockUser.id}`)

      const result = await createGoal(mockValidGoalValues)

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Too many requests! Please slow down and try again later."
      )
    })

    it("should return error when categoryKey is invalid or does not belong to user", async () => {
      mockAuthenticatedUser()

      const result = await createGoal({
        ...mockValidGoalValues,
        categoryKey: "non-existent-or-invalid-key",
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid category!")
    })

    it("should return error when goal category is not an inflow category", async () => {
      mockAuthenticatedUser()

      const result = await createGoal({
        ...mockValidGoalValues,
        categoryKey: "food_beverage",
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid category!")
    })

    it("should successfully create goal", async () => {
      mockAuthenticatedUser()

      const result = await createGoal(mockValidGoalValues)
      const goalsCollection = await getGoalsCollection()
      const addedGoal = await goalsCollection.findOne({
        userId: mockDBUser._id,
      })

      expect(addedGoal?.categoryKey).toBe("salary_bonus")
      expect(addedGoal?.name).toBe("buy a motorbike")
      expect(addedGoal?.targetAmount.toString()).toBe("50000000")
      expect(addedGoal?.startDate.toISOString()).toBe(
        "2024-01-01T00:00:00.000Z"
      )
      expect(addedGoal?.endDate.toISOString()).toBe("2024-12-31T00:00:00.000Z")
      expect(result.success).toBe("Goal has been created.")
      expect(result.error).toBeUndefined()
    })

    it("should allow creating multiple goals in same category and timeframe with different names", async () => {
      await insertTestGoal(mockDBGoal)
      mockAuthenticatedUser()

      const result = await createGoal({
        categoryKey: mockDBGoal.categoryKey,
        currency: mockDBGoal.currency,
        name: "buy a second vehicle",
        targetAmount: "30000000",
        startDate: mockDBGoal.startDate,
        endDate: mockDBGoal.endDate,
      })

      expect(result.success).toBe("Goal has been created.")
      expect(result.error).toBeUndefined()
    })

    it("should return error when goal already exists", async () => {
      await insertTestGoal(mockDBGoal)
      mockAuthenticatedUser()

      const result = await createGoal({
        categoryKey: mockDBGoal.categoryKey,
        currency: mockDBGoal.currency,
        name: mockDBGoal.name,
        targetAmount: "2000000",
        startDate: mockDBGoal.startDate,
        endDate: mockDBGoal.endDate,
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("This goal already exists!")
    })

    it("should prevent race condition when creating duplicate goals concurrently", async () => {
      mockAuthenticatedUser()

      const [firstResult, secondResult] = await Promise.all([
        createGoal(mockValidGoalValues),
        createGoal(mockValidGoalValues),
      ])

      const results = [firstResult, secondResult]
      const successCount = results.filter(
        (r) => r.success === "Goal has been created."
      ).length
      const errorCount = results.filter(
        (r) => r.error === "This goal already exists!"
      ).length

      expect(successCount).toBe(1)
      expect(errorCount).toBe(1)
    })

    it("should return error when database operation throws error", async () => {
      mockAuthenticatedUser()
      mockGoalCollectionError()

      const result = await createGoal(mockValidGoalValues)

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Failed to create goal! Please try again later."
      )
    })
  })

  describe("updateGoal", () => {
    it("should return error with invalid goal ID", async () => {
      mockAuthenticatedUser()

      const result = await updateGoal("invalid-id", mockValidGoalValues)

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid goal ID!")
    })

    it("should return error when data is invalid", async () => {
      // @ts-expect-error - Testing invalid data
      const result = await updateGoal(mockDBGoal._id.toString(), {})

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid data!")
    })

    it("should return error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await updateGoal(
        mockDBGoal._id.toString(),
        mockValidGoalValues
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
    })

    it("should return error when rate limit is exceeded", async () => {
      mockAuthenticatedUser()
      await triggerRateLimit(`goal:${mockUser.id}`)

      const result = await updateGoal(
        mockDBGoal._id.toString(),
        mockValidGoalValues
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Too many requests! Please slow down and try again later."
      )
    })

    it("should return error when categoryKey is invalid or does not belong to user", async () => {
      mockAuthenticatedUser()

      const result = await updateGoal(mockDBGoal._id.toString(), {
        ...mockValidGoalValues,
        categoryKey: "non-existent-or-invalid-key",
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid category!")
    })

    it("should return error when goal category is not an inflow category", async () => {
      mockAuthenticatedUser()

      const result = await updateGoal(mockDBGoal._id.toString(), {
        ...mockValidGoalValues,
        categoryKey: "housing",
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid category!")
    })

    it("should return error when goal not found", async () => {
      mockAuthenticatedUser()

      const result = await updateGoal(
        mockDBGoal._id.toString(),
        mockValidGoalValues
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Goal not found or you don't have permission to edit!"
      )
    })

    it("should return error when another user tries to update", async () => {
      await insertTestGoal(mockDBGoal)
      mockAuthenticatedAsAnotherUser()

      const result = await updateGoal(mockDBGoal._id.toString(), {
        categoryKey: "salary_bonus",
        name: "Hacked goal",
        targetAmount: "9999999",
        currency: "VND",
        startDate: localDateToUTCMidnight(new Date("2024-01-01")),
        endDate: localDateToUTCMidnight(new Date("2025-12-31")),
      })
      const goalsCollection = await getGoalsCollection()
      const unchangedGoal = await goalsCollection.findOne({
        _id: mockDBGoal._id,
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Goal not found or you don't have permission to edit!"
      )
      expect(unchangedGoal?.name).toBe("buy a motorbike")
    })

    it("should successfully update goal", async () => {
      await Promise.all([
        insertTestGoal(mockDBGoal),
        insertTestGoal({
          ...mockDBGoal,
          _id: new ObjectId("690d2e5f7d5c36bf6c82ff1f"),
          currency: "USD",
        }),
      ])
      mockAuthenticatedUser()

      const result = await updateGoal(mockDBGoal._id.toString(), {
        categoryKey: "investment_passive",
        name: "Mua nhà",
        targetAmount: "2000000000",
        currency: "VND",
        startDate: localDateToUTCMidnight(new Date("2024-01-01")),
        endDate: localDateToUTCMidnight(new Date("2025-12-31")),
      })
      const goalsCollection = await getGoalsCollection()
      const updatedGoal = await goalsCollection.findOne({
        _id: mockDBGoal._id,
      })
      const unrelatedGoal = await goalsCollection.findOne({
        _id: new ObjectId("690d2e5f7d5c36bf6c82ff1f"),
      })

      expect(updatedGoal?.categoryKey).toBe("investment_passive")
      expect(updatedGoal?.name).toBe("Mua nhà")
      expect(updatedGoal?.targetAmount.toString()).toBe("2000000000")
      expect(updatedGoal?.startDate.toISOString()).toBe(
        "2024-01-01T00:00:00.000Z"
      )
      expect(updatedGoal?.endDate.toISOString()).toBe(
        "2025-12-31T00:00:00.000Z"
      )
      expect(unrelatedGoal?.categoryKey).toBe("salary_bonus")
      expect(unrelatedGoal?.name).toBe("buy a motorbike")
      expect(result.success).toBe("Goal has been updated.")
      expect(result.error).toBeUndefined()
    })

    it("should return error when updating goal causes duplicate key collision", async () => {
      await Promise.all([
        insertTestGoal(mockDBGoal),
        insertTestGoal({
          ...mockDBGoal,
          _id: new ObjectId("690d2e5f7d5c36bf6c82ff1f"),
          currency: "USD",
        }),
      ])
      mockAuthenticatedUser()

      const result = await updateGoal("690d2e5f7d5c36bf6c82ff1f", {
        categoryKey: mockDBGoal.categoryKey,
        name: mockDBGoal.name,
        currency: "VND",
        targetAmount: mockDBGoal.targetAmount.toString(),
        startDate: mockDBGoal.startDate,
        endDate: mockDBGoal.endDate,
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("This goal already exists!")
    })

    it("should prevent race condition when updating duplicate goals concurrently", async () => {
      await Promise.all([
        insertTestGoal({
          ...mockDBGoal,
          _id: new ObjectId("690d2e5f7d5c36bf6c82ff1e"),
          currency: "USD",
        }),
        insertTestGoal({
          ...mockDBGoal,
          _id: new ObjectId("690d2e5f7d5c36bf6c82ff1f"),
          currency: "JPY",
        }),
      ])
      mockAuthenticatedUser()

      const targetValues = {
        categoryKey: mockDBGoal.categoryKey,
        name: "Target Goal",
        currency: "VND" as const,
        targetAmount: mockDBGoal.targetAmount.toString(),
        startDate: mockDBGoal.startDate,
        endDate: mockDBGoal.endDate,
      }

      const [firstResult, secondResult] = await Promise.all([
        updateGoal("690d2e5f7d5c36bf6c82ff1e", targetValues),
        updateGoal("690d2e5f7d5c36bf6c82ff1f", targetValues),
      ])

      const results = [firstResult, secondResult]
      const successCount = results.filter(
        (r) => r.success === "Goal has been updated."
      ).length
      const errorCount = results.filter(
        (r) => r.error === "This goal already exists!"
      ).length

      expect(successCount).toBe(1)
      expect(errorCount).toBe(1)
    })

    it("should return error when database operation throws error", async () => {
      mockAuthenticatedUser()
      mockGoalCollectionError()

      const result = await updateGoal(
        mockDBGoal._id.toString(),
        mockValidGoalValues
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Failed to update goal! Please try again later."
      )
    })
  })

  describe("deleteGoal", () => {
    it("should return error with invalid goal ID", async () => {
      mockAuthenticatedUser()

      const result = await deleteGoal("invalid-id")

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid goal ID!")
    })

    it("should return error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await deleteGoal(mockDBGoal._id.toString())

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
    })

    it("should return error when rate limit is exceeded", async () => {
      mockAuthenticatedUser()
      await triggerRateLimit(`goal:${mockUser.id}`)

      const result = await deleteGoal(mockDBGoal._id.toString())

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Too many requests! Please slow down and try again later."
      )
    })

    it("should return error when goal not found", async () => {
      mockAuthenticatedUser()

      const result = await deleteGoal(mockDBGoal._id.toString())

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Goal not found or you don't have permission to delete!"
      )
    })

    it("should return error when another user tries to delete", async () => {
      await insertTestGoal(mockDBGoal)
      mockAuthenticatedAsAnotherUser()

      const result = await deleteGoal(mockDBGoal._id.toString())
      const goalsCollection = await getGoalsCollection()
      const unchangedGoal = await goalsCollection.findOne({
        _id: mockDBGoal._id,
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Goal not found or you don't have permission to delete!"
      )
      expect(unchangedGoal).not.toBe(null)
    })

    it("should successfully delete goal", async () => {
      await insertTestGoal(mockDBGoal)
      mockAuthenticatedUser()

      const result = await deleteGoal(mockDBGoal._id.toString())
      const goalsCollection = await getGoalsCollection()
      const deletedGoal = await goalsCollection.findOne({
        _id: mockDBGoal._id,
      })

      expect(deletedGoal).toBe(null)
      expect(result.success).toBe("Goal has been deleted.")
      expect(result.error).toBeUndefined()
    })

    it("should return error when database operation throws error", async () => {
      mockAuthenticatedUser()
      mockGoalCollectionError()

      const result = await deleteGoal(mockDBGoal._id.toString())

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Failed to delete goal! Please try again later."
      )
    })
  })

  describe("getGoals", () => {
    it("should return error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await getGoals()

      expect(result.goals).toBeUndefined()
      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
    })

    it("should return empty goals list", async () => {
      mockAuthenticatedUser()

      const result = await getGoals()

      expect(result.goals).toEqual([])
      expect(result.error).toBeUndefined()
    })

    it("should return goals list", async () => {
      await insertTestGoal(mockDBGoal)
      mockAuthenticatedUser()

      const result = await getGoals()

      expect(result.goals).toHaveLength(1)
      expect(result.goals?.[0].name).toBe("buy a motorbike")
      expect(result.goals?.[0].targetAmount).toBe("50000000")
      expect(result.goals?.[0].categoryKey).toBe("salary_bonus")
      expect(result.error).toBeUndefined()
    })

    it("should return goals sorted by startDate and _id descending", async () => {
      const goal1 = {
        ...mockDBGoal,
        _id: new ObjectId("68f896e5cda4897217a05a2d"),
        startDate: localDateToUTCMidnight(new Date("2024-01-01")),
      }
      const goal2 = {
        ...mockDBGoal,
        _id: new ObjectId("68f896e5cda4897217a05a2e"),
        categoryKey: "business_freelance",
        startDate: localDateToUTCMidnight(new Date("2024-01-01")),
      }
      const goal3 = {
        ...mockDBGoal,
        _id: new ObjectId("68f896e5cda4897217a05a2f"),
        startDate: localDateToUTCMidnight(new Date("2024-02-01")),
      }

      await Promise.all([
        insertTestGoal(goal1),
        insertTestGoal(goal2),
        insertTestGoal(goal3),
      ])
      mockAuthenticatedUser()

      const result = await getGoals()

      expect(result.goals).toHaveLength(3)
      // Should be sorted by startDate descending, then _id descending
      expect(result.goals?.[0].startDate.toISOString()).toBe(
        "2024-02-01T00:00:00.000Z"
      )
      expect(result.goals?.[1]._id).toBe("68f896e5cda4897217a05a2e")
      expect(result.goals?.[2]._id).toBe("68f896e5cda4897217a05a2d")
      expect(result.error).toBeUndefined()
    })

    it("should return error when database operation throws error", async () => {
      mockAuthenticatedUser()
      mockGoalCollectionError()

      const result = await getGoals()

      expect(result.goals).toBeUndefined()
      expect(result.error).toBe("Failed to load goals! Please try again later.")
    })
  })
})
