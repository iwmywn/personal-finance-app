import { headers } from "next/headers"
import { Collection, ObjectId } from "mongodb"

import {
  insertTestBudget,
  insertTestCategory,
  insertTestGoal,
  insertTestRecurringTransaction,
  insertTestTransaction,
  insertTestUser,
} from "@/tests/backend/helpers/database"
import {
  mockAuthenticatedAdmin,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from "@/tests/backend/mocks/session.mock"
import {
  mockAdminUser,
  mockBannedUser,
  mockDBAdminUser,
  mockDBBudget,
  mockDBCustomCategory,
  mockDBGoal,
  mockDBRecurringTransaction,
  mockDBTransaction,
  mockDBUser,
  mockUser,
  mockUsers,
} from "@/tests/shared/data"
import { deleteUser, getAdminData } from "@/actions/admin.actions"
import { auth } from "@/lib/auth"
import {
  getBudgetsCollection,
  getCategoriesCollection,
  getGoalsCollection,
  getRecurringTransactionsCollection,
  getTransactionsCollection,
  getUsersCollection,
} from "@/lib/collections"
import { connect } from "@/lib/db"
import type { User } from "@/lib/definitions"

type UserWithRole = NonNullable<
  Awaited<ReturnType<typeof auth.api.listUsers>>
>["users"][number]

const toUserWithRole = (u: User): UserWithRole => ({
  ...u,
  banned: u.banned ?? null,
})

describe("Admin", () => {
  describe("getAdminData", () => {
    it("should handle error when headers() throws", async () => {
      vi.mocked(headers).mockRejectedValueOnce(new Error("Headers unavailable"))

      const result = await getAdminData()

      expect(result.users).toBeUndefined()
      expect(result.stats).toBeUndefined()
      expect(result.error).toBe("Failed to list users! Please try again later.")
      expect(auth.api.listUsers).not.toHaveBeenCalled()
    })

    it("should return access denied error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await getAdminData()

      expect(result.users).toBeUndefined()
      expect(result.stats).toBeUndefined()
      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
      expect(auth.api.listUsers).not.toHaveBeenCalled()
    })

    it("should return access denied error when user is not an admin", async () => {
      mockAuthenticatedUser()

      const result = await getAdminData()

      expect(result.users).toBeUndefined()
      expect(result.stats).toBeUndefined()
      expect(result.error).toBe("Access denied! Admin privileges required.")
      expect(auth.api.listUsers).not.toHaveBeenCalled()
    })

    it("should handle error when auth.api.listUsers throws", async () => {
      mockAuthenticatedAdmin()
      vi.mocked(auth.api.listUsers).mockRejectedValueOnce(
        new Error("Better Auth service error")
      )

      const result = await getAdminData()

      expect(result.users).toBeUndefined()
      expect(result.stats).toBeUndefined()
      expect(result.error).toBe("Failed to list users! Please try again later.")
    })

    it("should handle null result from auth.api.listUsers", async () => {
      mockAuthenticatedAdmin()
      // @ts-expect-error - Testing null response
      vi.mocked(auth.api.listUsers).mockResolvedValueOnce(null)

      const result = await getAdminData()

      expect(result.users).toBeUndefined()
      expect(result.stats).toBeUndefined()
      expect(result.error).toBe("Failed to list users! Please try again later.")
    })

    it("should successfully return users and calculated admin stats", async () => {
      mockAuthenticatedAdmin()

      vi.mocked(headers).mockResolvedValue(new Headers())

      vi.mocked(auth.api.listUsers).mockResolvedValueOnce({
        users: mockUsers.map(toUserWithRole),
        total: mockUsers.length,
      })

      const result = await getAdminData()

      expect(result.error).toBeUndefined()
      expect(result.users).toEqual(mockUsers)
      expect(result.stats).toEqual({
        totalUsers: 4,
        activeUsers: 3,
        bannedUsers: 1,
        adminUsers: 1,
      })
      expect(auth.api.listUsers).toHaveBeenCalledWith({
        headers: expect.any(Headers),
        query: {
          sortBy: "createdAt",
          sortDirection: "desc",
        },
      })
    })

    it("should correctly calculate stats when all users are active", async () => {
      mockAuthenticatedAdmin()

      const activeUsers = [mockUser, mockAdminUser]
      vi.mocked(auth.api.listUsers).mockResolvedValueOnce({
        users: activeUsers.map(toUserWithRole),
        total: activeUsers.length,
      })

      const result = await getAdminData()

      expect(result.error).toBeUndefined()
      expect(result.users).toEqual(activeUsers)
      expect(result.stats).toEqual({
        totalUsers: 2,
        activeUsers: 2,
        bannedUsers: 0,
        adminUsers: 1,
      })
    })

    it("should correctly calculate stats when all users are banned", async () => {
      mockAuthenticatedAdmin()

      const bannedUsers: User[] = [
        mockBannedUser,
        { ...mockUser, id: "user-banned-2", banned: true },
      ]
      vi.mocked(auth.api.listUsers).mockResolvedValueOnce({
        users: bannedUsers.map(toUserWithRole),
        total: bannedUsers.length,
      })

      const result = await getAdminData()

      expect(result.error).toBeUndefined()
      expect(result.stats).toEqual({
        totalUsers: 2,
        activeUsers: 0,
        bannedUsers: 2,
        adminUsers: 0,
      })
    })

    it("should return empty stats when users array is empty", async () => {
      mockAuthenticatedAdmin()

      vi.mocked(auth.api.listUsers).mockResolvedValueOnce({
        users: [],
        total: 0,
      })

      const result = await getAdminData()

      expect(result.error).toBeUndefined()
      expect(result.users).toEqual([])
      expect(result.stats).toEqual({
        totalUsers: 0,
        activeUsers: 0,
        bannedUsers: 0,
        adminUsers: 0,
      })
    })
  })

  describe("deleteUser", () => {
    it("should return error when userId is invalid", async () => {
      const result = await deleteUser("invalid-id")

      expect(result.error).toBe("Invalid user ID!")
      expect(result.success).toBeUndefined()
    })

    it("should return error when not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await deleteUser(new ObjectId().toString())

      expect(result.error).toBe(
        "Access denied! Please refresh the page and try again."
      )
      expect(result.success).toBeUndefined()
    })

    it("should return error when user is not an admin", async () => {
      mockAuthenticatedUser()

      const result = await deleteUser(new ObjectId().toString())

      expect(result.error).toBe("Access denied! Admin privileges required.")
      expect(result.success).toBeUndefined()
    })

    it("should return error when admin attempts to delete own account", async () => {
      mockAuthenticatedAdmin()

      const result = await deleteUser(mockDBAdminUser._id.toString())

      expect(result.error).toBe("You cannot delete your own account!")
      expect(result.success).toBeUndefined()
    })

    it("should return error when target user is not found", async () => {
      mockAuthenticatedAdmin()

      const result = await deleteUser(new ObjectId().toString())

      expect(result.error).toBe("User not found!")
      expect(result.success).toBeUndefined()
    })

    it("should return error when admin attempts to delete another administrator account", async () => {
      mockAuthenticatedAdmin()

      const otherAdminId = new ObjectId()
      await insertTestUser({
        ...mockDBAdminUser,
        _id: otherAdminId,
        email: "otheradmin@gmail.com",
      })

      const result = await deleteUser(otherAdminId.toString())

      expect(result.error).toBe("Cannot delete another administrator account!")
      expect(result.success).toBeUndefined()
    })

    it("should cascade delete all user and auth data atomically", async () => {
      mockAuthenticatedAdmin()

      const targetUserId = new ObjectId()
      const db = await connect()

      await Promise.all([
        insertTestUser({ ...mockDBUser, _id: targetUserId }),
        insertTestTransaction({
          ...mockDBTransaction,
          userId: targetUserId,
        }),
        insertTestCategory({
          ...mockDBCustomCategory,
          userId: targetUserId,
        }),
        insertTestBudget({
          ...mockDBBudget,
          userId: targetUserId,
        }),
        insertTestGoal({
          ...mockDBGoal,
          userId: targetUserId,
        }),
        insertTestRecurringTransaction({
          ...mockDBRecurringTransaction,
          userId: targetUserId,
        }),
        db.collection("sessions").insertOne({
          userId: targetUserId.toString(),
          token: "session-token-123",
          expiresAt: new Date(),
        }),
        db.collection("accounts").insertOne({
          userId: targetUserId.toString(),
          providerId: "credential",
          accountId: "account-123",
        }),
      ])

      const result = await deleteUser(targetUserId.toString())

      expect(result.error).toBeUndefined()
      expect(result.success).toBe("User has been deleted.")

      const [
        usersColl,
        transactionsColl,
        categoriesColl,
        budgetsColl,
        goalsColl,
        recurringColl,
      ] = await Promise.all([
        getUsersCollection(),
        getTransactionsCollection(),
        getCategoriesCollection(),
        getBudgetsCollection(),
        getGoalsCollection(),
        getRecurringTransactionsCollection(),
      ])

      const [
        userCount,
        txCount,
        catCount,
        bgtCount,
        goalCount,
        recCount,
        sessionCount,
        accountCount,
      ] = await Promise.all([
        usersColl.countDocuments({ _id: targetUserId }),
        transactionsColl.countDocuments({ userId: targetUserId }),
        categoriesColl.countDocuments({ userId: targetUserId }),
        budgetsColl.countDocuments({ userId: targetUserId }),
        goalsColl.countDocuments({ userId: targetUserId }),
        recurringColl.countDocuments({ userId: targetUserId }),
        db.collection("sessions").countDocuments({
          $or: [{ userId: targetUserId }, { userId: targetUserId.toString() }],
        }),
        db.collection("accounts").countDocuments({
          $or: [{ userId: targetUserId }, { userId: targetUserId.toString() }],
        }),
      ])

      expect(userCount).toBe(0)
      expect(txCount).toBe(0)
      expect(catCount).toBe(0)
      expect(bgtCount).toBe(0)
      expect(goalCount).toBe(0)
      expect(recCount).toBe(0)
      expect(sessionCount).toBe(0)
      expect(accountCount).toBe(0)
    })

    it("should rollback all deletions if a failure occurs during transaction to prevent orphaned data", async () => {
      mockAuthenticatedAdmin()

      const targetUserId = new ObjectId()

      await Promise.all([
        insertTestUser({ ...mockDBUser, _id: targetUserId }),
        insertTestTransaction({
          ...mockDBTransaction,
          userId: targetUserId,
        }),
      ])

      const usersColl = await getUsersCollection()
      const transactionsColl = await getTransactionsCollection()

      const deleteOneSpy = vi
        .spyOn(Collection.prototype, "deleteOne")
        .mockRejectedValueOnce(new Error("Database connection interrupted"))

      const result = await deleteUser(targetUserId.toString())

      expect(result.error).toBe(
        "Failed to delete user! Please try again later."
      )
      expect(result.success).toBeUndefined()

      const userCount = await usersColl.countDocuments({ _id: targetUserId })
      const txCount = await transactionsColl.countDocuments({
        userId: targetUserId,
      })

      expect(userCount).toBe(1)
      expect(txCount).toBe(1)

      deleteOneSpy.mockRestore()
    })
  })
})
