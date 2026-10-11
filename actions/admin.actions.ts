"use server"

import { updateTag } from "next/cache"
import { headers } from "next/headers"
import { ObjectId } from "mongodb"
import { getExtracted } from "next-intl/server"

import { auth } from "@/lib/auth"
import {
  getBudgetsCollection,
  getCategoriesCollection,
  getGoalsCollection,
  getRecurringTransactionsCollection,
  getTransactionsCollection,
  getUsersCollection,
} from "@/lib/collections"
import { connect, withTransaction } from "@/lib/db"
import type { ActionResponse, User } from "@/lib/definitions"
import { isRateLimited, RATE_LIMIT_PRESETS } from "@/lib/rate-limit"
import { ADMIN_ROLE } from "@/lib/role"
import { isUserBanned } from "@/lib/utils"

import { getSession } from "./session.actions"
import { getActiveBanMongoFilter } from "./utils"

export type AdminStats = {
  totalUsers: number
  activeUsers: number
  bannedUsers: number
  adminUsers: number
}

export async function getAdminData(): Promise<{
  error?: string
  users?: User[]
  stats?: AdminStats
}> {
  const t = await getExtracted()

  try {
    const headersList = await headers()
    const { error, user, session } = await getSession(true)

    if (!user || !session) return { error }

    if (
      await isRateLimited(`admin:data:${user.id}`, RATE_LIMIT_PRESETS.NORMAL)
    ) {
      return {
        error: t("Too many requests! Please slow down and try again later."),
      }
    }

    // Note: Pagination is intentionally omitted here
    // as the current low volume of users does not require it.
    const result = await auth.api.listUsers({
      headers: headersList,
      query: {
        sortBy: "createdAt",
        sortDirection: "desc",
      },
    })

    if (!result)
      return { error: t("Failed to list users! Please try again later.") }

    const users = (result.users ?? []) as unknown as User[]
    const usersCollection = await getUsersCollection()
    const dbTotal = await usersCollection.countDocuments()

    const now = new Date()
    let totalUsers = result.total
    let bannedUsers = users.filter((u) => isUserBanned(u, now)).length
    let adminUsers = users.filter((u) => u.role === ADMIN_ROLE).length

    if (dbTotal > 0) {
      const [dbBanned, dbAdmins] = await Promise.all([
        usersCollection.countDocuments(getActiveBanMongoFilter(now)),
        usersCollection.countDocuments({ role: ADMIN_ROLE }),
      ])
      totalUsers = dbTotal
      bannedUsers = dbBanned
      adminUsers = dbAdmins
    }

    const activeUsers = Math.max(0, totalUsers - bannedUsers)

    const stats: AdminStats = {
      totalUsers,
      activeUsers,
      bannedUsers,
      adminUsers,
    }

    return { users, stats }
  } catch (error) {
    console.error("Error listing users:", error)
    return {
      error: t("Failed to list users! Please try again later."),
    }
  }
}

export async function deleteUser(userId: string): Promise<ActionResponse> {
  const t = await getExtracted()

  try {
    if (!ObjectId.isValid(userId)) {
      return {
        error: t("Invalid user ID!"),
      }
    }

    const { error, user, session } = await getSession(true)

    if (!user || !session) return { error }

    if (
      await isRateLimited(`admin:delete:${user.id}`, RATE_LIMIT_PRESETS.STRICT)
    ) {
      return {
        error: t("Too many requests! Please slow down and try again later."),
      }
    }

    if (user.id === userId) {
      return { error: t("You cannot delete your own account!") }
    }

    const userObjectId = new ObjectId(userId)
    const usersCollection = await getUsersCollection()
    const targetUser = await usersCollection.findOne({ _id: userObjectId })

    if (!targetUser) {
      return { error: t("User not found!") }
    }

    if (targetUser.role === "admin") {
      return { error: t("Cannot delete another administrator account!") }
    }

    const [
      transactionsCollection,
      categoriesCollection,
      budgetsCollection,
      goalsCollection,
      recurringCollection,
    ] = await Promise.all([
      getTransactionsCollection(),
      getCategoriesCollection(),
      getBudgetsCollection(),
      getGoalsCollection(),
      getRecurringTransactionsCollection(),
    ])

    await withTransaction(async (dbSession) => {
      await transactionsCollection.deleteMany(
        { userId: userObjectId },
        { session: dbSession }
      )
      await categoriesCollection.deleteMany(
        { userId: userObjectId },
        { session: dbSession }
      )
      await budgetsCollection.deleteMany(
        { userId: userObjectId },
        { session: dbSession }
      )
      await goalsCollection.deleteMany(
        { userId: userObjectId },
        { session: dbSession }
      )
      await recurringCollection.deleteMany(
        { userId: userObjectId },
        { session: dbSession }
      )

      const db = await connect()
      const userFilter = {
        $or: [{ userId: userObjectId }, { userId }],
      }

      const userVerifications = await db
        .collection("verifications")
        .find(
          { value: userId },
          { session: dbSession, projection: { identifier: 1 } }
        )
        .toArray()

      const attemptIdentifiers = userVerifications
        .map((doc) => doc.identifier)
        .filter(Boolean)
        .map((identifier) => `2fa-attempts-${identifier}`)

      await Promise.all([
        db
          .collection("sessions")
          .deleteMany(userFilter, { session: dbSession }),
        db
          .collection("accounts")
          .deleteMany(userFilter, { session: dbSession }),
        db
          .collection("twoFactors")
          .deleteMany(userFilter, { session: dbSession }),
        db.collection("verifications").deleteMany(
          {
            $or: [
              { value: userId },
              ...(attemptIdentifiers.length > 0
                ? [{ identifier: { $in: attemptIdentifiers } }]
                : []),
            ],
          },
          { session: dbSession }
        ),
      ])
      await usersCollection.deleteOne(
        { _id: userObjectId },
        { session: dbSession }
      )
    })

    updateTag(`transactions-${userId}`)
    updateTag(`categories-${userId}`)
    updateTag(`budgets-${userId}`)
    updateTag(`goals-${userId}`)
    updateTag(`recurringTransactions-${userId}`)

    return { success: t("User has been deleted.") }
  } catch (error) {
    console.error("Error deleting user:", error)
    return { error: t("Failed to delete user! Please try again later.") }
  }
}
