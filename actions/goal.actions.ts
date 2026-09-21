"use server"

import { cacheTag, updateTag } from "next/cache"
import { ObjectId } from "mongodb"
import { getExtracted } from "next-intl/server"

import { getGoalsCollection } from "@/lib/collections"
import type { ActionResponse, Goal } from "@/lib/definitions"
import { isDuplicateKeyError } from "@/lib/indexes"
import { getSchemas } from "@/schemas/server"
import type { GoalFormValues } from "@/schemas/types"

import { isValidUserCategory } from "./category.server"
import { getSession } from "./session.actions"
import { toDecimal128 } from "./utils"

export async function createGoal(
  values: GoalFormValues
): Promise<ActionResponse> {
  const t = await getExtracted()

  try {
    const { createGoalSchema } = await getSchemas()
    const parsedValues = createGoalSchema().safeParse(values)

    if (!parsedValues.success) {
      return { error: t("Invalid data!") }
    }

    const { error, user, session } = await getSession()

    if (!user || !session) {
      return { error }
    }

    const isValidCategory = await isValidUserCategory(
      user.id,
      parsedValues.data.categoryKey,
      "inflow"
    )

    if (!isValidCategory) {
      return { error: t("Invalid category!") }
    }

    const goalsCollection = await getGoalsCollection()

    await goalsCollection.insertOne({
      userId: new ObjectId(user.id),
      categoryKey: parsedValues.data.categoryKey,
      name: parsedValues.data.name,
      targetAmount: toDecimal128(parsedValues.data.targetAmount),
      currency: parsedValues.data.currency,
      startDate: parsedValues.data.startDate,
      endDate: parsedValues.data.endDate,
    })

    updateTag(`goals-${user.id}`)
    return { success: t("Goal has been created.") }
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { error: t("This goal already exists!") }
    }
    console.error("Error creating goal:", error)
    return { error: t("Failed to create goal! Please try again later.") }
  }
}

export async function updateGoal(
  goalId: string,
  values: GoalFormValues
): Promise<ActionResponse> {
  const t = await getExtracted()

  try {
    if (!ObjectId.isValid(goalId)) {
      return {
        error: t("Invalid goal ID!"),
      }
    }

    const { createGoalSchema } = await getSchemas()
    const parsedValues = createGoalSchema().safeParse(values)

    if (!parsedValues.success) {
      return { error: t("Invalid data!") }
    }

    const { error, user, session } = await getSession()

    if (!user || !session) {
      return { error }
    }

    const isValidCategory = await isValidUserCategory(
      user.id,
      parsedValues.data.categoryKey,
      "inflow"
    )

    if (!isValidCategory) {
      return { error: t("Invalid category!") }
    }

    const goalsCollection = await getGoalsCollection()
    const result = await goalsCollection.updateOne(
      { _id: new ObjectId(goalId), userId: new ObjectId(user.id) },
      {
        $set: {
          categoryKey: parsedValues.data.categoryKey,
          name: parsedValues.data.name,
          targetAmount: toDecimal128(parsedValues.data.targetAmount),
          currency: parsedValues.data.currency,
          startDate: parsedValues.data.startDate,
          endDate: parsedValues.data.endDate,
        },
      }
    )

    if (result.matchedCount === 0) {
      return {
        error: t("Goal not found or you don't have permission to edit!"),
      }
    }

    updateTag(`goals-${user.id}`)
    return { success: t("Goal has been updated.") }
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { error: t("This goal already exists!") }
    }
    console.error("Error updating goal:", error)
    return { error: t("Failed to update goal! Please try again later.") }
  }
}

export async function deleteGoal(goalId: string): Promise<ActionResponse> {
  const t = await getExtracted()

  try {
    if (!ObjectId.isValid(goalId)) {
      return {
        error: t("Invalid goal ID!"),
      }
    }

    const { error, user, session } = await getSession()

    if (!user || !session) {
      return { error }
    }

    const goalsCollection = await getGoalsCollection()
    const result = await goalsCollection.deleteOne({
      _id: new ObjectId(goalId),
      userId: new ObjectId(user.id),
    })

    if (result.deletedCount === 0) {
      return {
        error: t("Goal not found or you don't have permission to delete!"),
      }
    }

    updateTag(`goals-${user.id}`)
    return { success: t("Goal has been deleted.") }
  } catch (error) {
    console.error("Error deleting goal:", error)
    return { error: t("Failed to delete goal! Please try again later.") }
  }
}

export async function getGoals(): Promise<{
  error?: string
  goals?: Goal[]
}> {
  const { error, user, session } = await getSession()

  if (!user || !session) {
    return { error }
  }

  return getCachedGoals(user.id)
}

async function getCachedGoals(userId: string) {
  "use cache: private"
  cacheTag(`goals-${userId}`)

  const t = await getExtracted()

  try {
    const goalsCollection = await getGoalsCollection()
    const goals = await goalsCollection
      .find({ userId: new ObjectId(userId) })
      .sort({ startDate: -1, _id: -1 })
      .toArray()

    return {
      goals: goals.map((goal) => ({
        ...goal,
        _id: goal._id.toString(),
        userId: goal.userId.toString(),
        targetAmount: goal.targetAmount.toString(),
      })) as Goal[],
    }
  } catch (error) {
    console.error("Error fetching goals:", error)
    return {
      error: t("Failed to load goals! Please try again later."),
    }
  }
}
