import { ObjectId } from "mongodb"

import {
  insertTestBudget,
  insertTestCategory,
  insertTestGoal,
  insertTestRecurringTransaction,
  insertTestTransaction,
} from "@/tests/backend/helpers/database"
import { mockCategoryCollectionError } from "@/tests/backend/mocks/collections.mock"
import {
  mockAuthenticatedAsAnotherUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from "@/tests/backend/mocks/session.mock"
import {
  mockDBBudget,
  mockDBCustomCategory,
  mockDBGoal,
  mockDBRecurringTransaction,
  mockDBTransaction,
  mockDBUser,
  mockValidCategoryValues,
} from "@/tests/shared/data"
import {
  createCustomCategory,
  deleteCustomCategory,
  getCustomCategories,
  updateCustomCategory,
} from "@/actions/category.actions"
import { isValidUserCategory } from "@/actions/category.server"
import { getCategoriesCollection } from "@/lib/collections"

describe("Categories", async () => {
  describe("isValidUserCategory", () => {
    it("should return true for valid predefined categories with matching type", async () => {
      expect(
        await isValidUserCategory(
          mockDBUser._id.toString(),
          "salary_bonus",
          "inflow"
        )
      ).toBe(true)
      expect(
        await isValidUserCategory(
          mockDBUser._id.toString(),
          "food_beverage",
          "outflow"
        )
      ).toBe(true)
      expect(
        await isValidUserCategory(mockDBUser._id.toString(), "salary_bonus")
      ).toBe(true)
    })

    it("should return false for predefined categories with mismatched type", async () => {
      expect(
        await isValidUserCategory(
          mockDBUser._id.toString(),
          "salary_bonus",
          "outflow"
        )
      ).toBe(false)
      expect(
        await isValidUserCategory(
          mockDBUser._id.toString(),
          "food_beverage",
          "inflow"
        )
      ).toBe(false)
    })

    it("should return false for invalid category format or non-existent key", async () => {
      expect(
        await isValidUserCategory(mockDBUser._id.toString(), "non_existent_key")
      ).toBe(false)
      expect(
        await isValidUserCategory(mockDBUser._id.toString(), "12345")
      ).toBe(false)
    })

    it("should return false for custom category owned by another user", async () => {
      await insertTestCategory({
        ...mockDBCustomCategory,
        userId: new ObjectId("690d2cdc200d6a719f9a438e"),
      })
      expect(
        await isValidUserCategory(
          mockDBUser._id.toString(),
          mockDBCustomCategory._id.toString()
        )
      ).toBe(false)
    })

    it("should return false for custom category with mismatched type", async () => {
      await insertTestCategory(mockDBCustomCategory)
      expect(
        await isValidUserCategory(
          mockDBUser._id.toString(),
          mockDBCustomCategory._id.toString(),
          "inflow"
        )
      ).toBe(false)
    })

    it("should return true for custom category owned by user with matching type", async () => {
      await insertTestCategory(mockDBCustomCategory)
      expect(
        await isValidUserCategory(
          mockDBUser._id.toString(),
          mockDBCustomCategory._id.toString(),
          mockDBCustomCategory.type
        )
      ).toBe(true)
    })
  })

  describe("createCustomCategory", () => {
    it("should return error when data is invalid", async () => {
      // @ts-expect-error - Testing invalid data
      const result = await createCustomCategory({})

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid data!")
    })

    it("should return error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await createCustomCategory(mockValidCategoryValues)

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
    })

    it("should successfully create custom category", async () => {
      mockAuthenticatedUser()

      const result = await createCustomCategory(mockValidCategoryValues)
      const categoriesTransaction = await getCategoriesCollection()
      const addedCategory = await categoriesTransaction.findOne({
        userId: mockDBUser._id,
      })

      expect(addedCategory?.type).toBe("inflow")
      expect(addedCategory?.label).toBe("Salary")
      expect(addedCategory?.description).toBe("Monthly job inflow")
      expect(result.success).toBe("Category has been created.")
      expect(result.error).toBeUndefined()
    })

    it("should return error when category with same name exists", async () => {
      await insertTestCategory(mockDBCustomCategory)
      mockAuthenticatedUser()

      const result = await createCustomCategory({
        type: mockDBCustomCategory.type,
        label: mockDBCustomCategory.label,
        description: "Different description",
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("This category already exists!")
    })

    it("should prevent race condition when creating duplicate categories concurrently", async () => {
      mockAuthenticatedUser()

      const [firstResult, secondResult] = await Promise.all([
        createCustomCategory(mockValidCategoryValues),
        createCustomCategory(mockValidCategoryValues),
      ])

      const results = [firstResult, secondResult]
      const successCount = results.filter(
        (r) => r.success === "Category has been created."
      ).length
      const errorCount = results.filter(
        (r) => r.error === "This category already exists!"
      ).length

      expect(successCount).toBe(1)
      expect(errorCount).toBe(1)
    })

    it("should return error when database operation throws error", async () => {
      mockAuthenticatedUser()
      mockCategoryCollectionError()

      const result = await createCustomCategory(mockValidCategoryValues)

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Failed to create category! Please try again later."
      )
    })
  })

  describe("updateCustomCategory", () => {
    it("should return error with invalid category ID", async () => {
      mockAuthenticatedUser()

      const result = await updateCustomCategory(
        "invalid-id",
        mockValidCategoryValues
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid category ID!")
    })

    it("should return error when data is invalid", async () => {
      const result = await updateCustomCategory(
        mockDBCustomCategory._id.toString(),
        // @ts-expect-error - Testing invalid data
        {}
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid data!")
    })

    it("should return error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await updateCustomCategory(
        mockDBCustomCategory._id.toString(),
        mockValidCategoryValues
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
    })

    it("should return error when attempting to change category type", async () => {
      await insertTestCategory(mockDBCustomCategory)
      mockAuthenticatedUser()

      const result = await updateCustomCategory(
        mockDBCustomCategory._id.toString(),
        {
          type: "inflow",
          label: "Updated Label",
          description: "Updated description",
        }
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Category type cannot be changed!")
    })

    it("should return error when category not found", async () => {
      mockAuthenticatedUser()

      const result = await updateCustomCategory(
        mockDBCustomCategory._id.toString(),
        mockValidCategoryValues
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Category not found or you don't have permission to edit!"
      )
    })

    it("should return error when another user tries to update", async () => {
      await insertTestCategory(mockDBCustomCategory)
      mockAuthenticatedAsAnotherUser()

      const result = await updateCustomCategory(
        mockDBCustomCategory._id.toString(),
        {
          type: "outflow",
          label: "Hacked Label",
          description: "Hacked description",
        }
      )
      const categoriesCollection = await getCategoriesCollection()
      const unchangedCategory = await categoriesCollection.findOne({
        _id: mockDBCustomCategory._id,
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Category not found or you don't have permission to edit!"
      )
      expect(unchangedCategory?.label).toBe("Entertainment")
    })

    it("should successfully update custom category", async () => {
      await insertTestCategory(mockDBCustomCategory)
      mockAuthenticatedUser()

      const result = await updateCustomCategory(
        mockDBCustomCategory._id.toString(),
        {
          type: mockDBCustomCategory.type,
          label: "Updated Label",
          description: "Updated description",
        }
      )
      const categoriesCollection = await getCategoriesCollection()
      const updatedCategory = await categoriesCollection.findOne({
        _id: mockDBCustomCategory._id,
      })

      expect(updatedCategory?.type).toBe(mockDBCustomCategory.type)
      expect(updatedCategory?.label).toBe("Updated Label")
      expect(updatedCategory?.description).toBe("Updated description")
      expect(result.success).toBe("Category has been updated.")
      expect(result.error).toBeUndefined()
    })

    it("should return error when updating category causes duplicate key collision", async () => {
      await Promise.all([
        insertTestCategory(mockDBCustomCategory),
        insertTestCategory({
          ...mockDBCustomCategory,
          _id: new ObjectId("690d2e5f7d5c36bf6c82ff1f"),
          label: "Unique Category",
        }),
      ])
      mockAuthenticatedUser()

      const result = await updateCustomCategory("690d2e5f7d5c36bf6c82ff1f", {
        type: mockDBCustomCategory.type,
        label: mockDBCustomCategory.label,
        description: "Colliding label",
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("This category already exists!")
    })

    it("should prevent race condition when updating duplicate categories concurrently", async () => {
      await Promise.all([
        insertTestCategory({
          ...mockDBCustomCategory,
          _id: new ObjectId("690d2e5f7d5c36bf6c82ff1e"),
          label: "Unique Category 1",
        }),
        insertTestCategory({
          ...mockDBCustomCategory,
          _id: new ObjectId("690d2e5f7d5c36bf6c82ff1f"),
          label: "Unique Category 2",
        }),
      ])
      mockAuthenticatedUser()

      const targetValues = {
        type: mockDBCustomCategory.type,
        label: "Same Target Label",
        description: "Target description",
      }

      const [firstResult, secondResult] = await Promise.all([
        updateCustomCategory("690d2e5f7d5c36bf6c82ff1e", targetValues),
        updateCustomCategory("690d2e5f7d5c36bf6c82ff1f", targetValues),
      ])

      const results = [firstResult, secondResult]
      const successCount = results.filter(
        (r) => r.success === "Category has been updated."
      ).length
      const errorCount = results.filter(
        (r) => r.error === "This category already exists!"
      ).length

      expect(successCount).toBe(1)
      expect(errorCount).toBe(1)
    })

    it("should return error when database operation throws error", async () => {
      mockAuthenticatedUser()
      mockCategoryCollectionError()

      const result = await updateCustomCategory(
        mockDBCustomCategory._id.toString(),
        mockValidCategoryValues
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Failed to update category! Please try again later."
      )
    })
  })

  describe("deleteCustomCategory", () => {
    it("should return error with invalid category ID", async () => {
      mockAuthenticatedUser()

      const result = await deleteCustomCategory("invalid-id")

      expect(result.success).toBeUndefined()
      expect(result.error).toBe("Invalid category ID!")
    })

    it("should return error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await deleteCustomCategory(
        mockDBCustomCategory._id.toString()
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
    })

    it("should return error when category not found", async () => {
      mockAuthenticatedUser()

      const result = await deleteCustomCategory(
        mockDBCustomCategory._id.toString()
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Category not found or you don't have permission to delete!"
      )
    })

    it("should return error when another user tries to delete", async () => {
      await insertTestCategory(mockDBCustomCategory)
      mockAuthenticatedAsAnotherUser()

      const result = await deleteCustomCategory(
        mockDBCustomCategory._id.toString()
      )
      const categoriesCollection = await getCategoriesCollection()
      const unchangedCategory = await categoriesCollection.findOne({
        _id: mockDBCustomCategory._id,
      })

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Category not found or you don't have permission to delete!"
      )
      expect(unchangedCategory).not.toBe(null)
    })

    it("should return error when categories have associated transactions, budgets, or goals", async () => {
      const category1 = {
        ...mockDBCustomCategory,
        _id: new ObjectId("691ac8b98629369bb1da9214"),
        label: "Entertainment 1",
      }
      const category2 = {
        ...mockDBCustomCategory,
        _id: new ObjectId("691ac8c4fb168bfba59615c8"),
        label: "Entertainment 2",
      }
      const category3 = {
        ...mockDBCustomCategory,
        _id: new ObjectId("691ac8cd3cf60fa9f018a37c"),
        label: "Entertainment 3",
      }
      const category4 = {
        ...mockDBCustomCategory,
        _id: new ObjectId("691da72dc1d54fad20174ab6"),
        label: "Entertainment 4",
      }

      await Promise.all([
        insertTestCategory(category1),
        insertTestCategory(category2),
        insertTestCategory(category3),
        insertTestCategory(category4),

        insertTestTransaction({
          ...mockDBTransaction,
          categoryKey: category1._id.toString(),
        }),
        insertTestBudget({
          ...mockDBBudget,
          categoryKey: category2._id.toString(),
        }),
        insertTestGoal({
          ...mockDBGoal,
          categoryKey: category3._id.toString(),
        }),
        insertTestRecurringTransaction({
          ...mockDBRecurringTransaction,
          categoryKey: category4._id.toString(),
        }),
      ])

      mockAuthenticatedUser()

      const [result1, result2, result3, result4] = await Promise.all([
        deleteCustomCategory(category1._id.toString()),
        deleteCustomCategory(category2._id.toString()),
        deleteCustomCategory(category3._id.toString()),
        deleteCustomCategory(category4._id.toString()),
      ])

      expect(result1.success).toBeUndefined()
      expect(result1.error).toBe(
        "Cannot delete category. There are 1 transactions using this category. Please delete those transactions first."
      )

      expect(result2.success).toBeUndefined()
      expect(result2.error).toBe(
        "Cannot delete category. There are 1 budgets using this category. Please delete those budgets first."
      )

      expect(result3.success).toBeUndefined()
      expect(result3.error).toBe(
        "Cannot delete category. There are 1 goals using this category. Please delete those goals first."
      )

      expect(result4.success).toBeUndefined()
      expect(result4.error).toBe(
        "Cannot delete category. There are 1 recurring transactions using this category. Please delete those recurring transactions first."
      )
    })

    it("should successfully delete custom category", async () => {
      await insertTestCategory(mockDBCustomCategory)
      mockAuthenticatedUser()

      const result = await deleteCustomCategory(
        mockDBCustomCategory._id.toString()
      )
      const categoriesTransaction = await getCategoriesCollection()
      const deletedCategory = await categoriesTransaction.findOne({
        _id: mockDBCustomCategory._id,
      })

      expect(deletedCategory).toBe(null)
      expect(result.success).toBe("Category has been deleted.")
      expect(result.error).toBeUndefined()
    })

    it("should return error when database operation throws error", async () => {
      await insertTestCategory(mockDBCustomCategory)
      mockAuthenticatedUser()
      mockCategoryCollectionError()
      // same for mockTransactionCollectionError, mockBudgetCollectionError, mockGoalCollectionError

      const result = await deleteCustomCategory(
        mockDBCustomCategory._id.toString()
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe(
        "Failed to delete category! Please try again later."
      )
    })
  })

  describe("getCustomCategories", () => {
    it("should return error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await getCustomCategories()

      expect(result.customCategories).toBeUndefined()
      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
    })

    it("should return empty categories list", async () => {
      mockAuthenticatedUser()

      const result = await getCustomCategories()

      expect(result.customCategories).toEqual([])
      expect(result.error).toBeUndefined()
    })

    it("should return categories list", async () => {
      await insertTestCategory(mockDBCustomCategory)
      mockAuthenticatedUser()

      const result = await getCustomCategories()

      expect(result.customCategories).toHaveLength(1)
      expect(result.customCategories?.[0].label).toBe("Entertainment")
      expect(result.error).toBeUndefined()
    })

    it("should return categories sorted by _id descending", async () => {
      const category1 = {
        ...mockDBCustomCategory,
        _id: new ObjectId("68f732914e63e5aa249cc173"),
        label: "Entertainment 1",
      }
      const category2 = {
        ...mockDBCustomCategory,
        _id: new ObjectId("68f732914e63e5aa249cc174"),
        label: "Entertainment 2",
      }
      const category3 = {
        ...mockDBCustomCategory,
        _id: new ObjectId("68f732914e63e5aa249cc175"),
        label: "Entertainment 3",
      }

      await Promise.all([
        insertTestCategory(category1),
        insertTestCategory(category2),
        insertTestCategory(category3),
      ])
      mockAuthenticatedUser()

      const result = await getCustomCategories()

      expect(result.customCategories).toHaveLength(3)
      // Should be sorted by _id descending
      expect(result.customCategories?.[0]._id).toBe("68f732914e63e5aa249cc175")
      expect(result.customCategories?.[1]._id).toBe("68f732914e63e5aa249cc174")
      expect(result.customCategories?.[2]._id).toBe("68f732914e63e5aa249cc173")
      expect(result.error).toBeUndefined()
    })

    it("should return error when database operation throws error", async () => {
      mockAuthenticatedUser()
      mockCategoryCollectionError()

      const result = await getCustomCategories()

      expect(result.customCategories).toBeUndefined()
      expect(result.error).toBe(
        "Failed to load custom categories! Please try again later."
      )
    })
  })
})
