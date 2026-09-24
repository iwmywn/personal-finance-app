import { updateTag } from "next/cache"
import type { NextRequest } from "next/server"

import {
  enqueueMissingExchangeRateDate,
  ensureExchangeRateForDate,
} from "@/actions/exchange-rates.actions"
import { serverEnv } from "@/env/server"
import {
  getRecurringTransactionsCollection,
  getTransactionsCollection,
  getUsersCollection,
} from "@/lib/collections"
import { normalizeToUTCMidnight } from "@/lib/date"
import type { DBRecurringTransaction } from "@/lib/definitions"
import { isDuplicateKeyError } from "@/lib/indexes"

import { getDueDates } from "./utils"

// Vercel Cron Jobs only trigger HTTP GET requests.
// [See official docs](https://vercel.com/docs/cron-jobs#how-cron-jobs-work)

const BATCH_SIZE = 5

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const [transactionsCollection, recurringCollection, usersCollection] =
      await Promise.all([
        getTransactionsCollection(),
        getRecurringTransactionsCollection(),
        getUsersCollection(),
      ])

    const bannedUsers = await usersCollection
      .find({ banned: true }, { projection: { _id: 1 } })
      .toArray()
    const bannedUserIds = bannedUsers.flatMap((u) => [u._id, u._id.toString()])

    const todayUTC = normalizeToUTCMidnight(new Date())

    const cursor = recurringCollection.find({
      ...(bannedUserIds.length > 0
        ? {
            userId: {
              $nin: bannedUserIds as unknown as DBRecurringTransaction["userId"][],
            },
          }
        : {}),
      $or: [
        { endDate: { $exists: false } },
        { endDate: null as unknown as Date },
        { endDate: { $gte: todayUTC } },
      ],
    })

    let createdCount = 0
    const createdIds: string[] = []
    const skippedReason: { id: string; reason: "notToday" | "existing" }[] = []
    const affectedUserIds = new Set<string>()
    const datesToEnsure = new Set<number>()

    let currentBatch: DBRecurringTransaction[] = []

    const processBatch = async (batch: DBRecurringTransaction[]) => {
      await Promise.all(
        batch.map(async (rec) => {
          const dueDates = getDueDates(rec, todayUTC)
          if (dueDates.length === 0) {
            skippedReason.push({ id: rec._id.toString(), reason: "notToday" })
            return
          }

          await Promise.all(
            dueDates.map(async (targetDate) => {
              const existingTransaction = await transactionsCollection.findOne({
                recurringId: rec._id,
                date: targetDate,
              })

              if (existingTransaction) {
                skippedReason.push({
                  id: rec._id.toString(),
                  reason: "existing",
                })
                affectedUserIds.add(rec.userId.toString())
                return
              }

              try {
                const insertResult = await transactionsCollection.insertOne({
                  userId: rec.userId,
                  type: rec.type,
                  categoryKey: rec.categoryKey,
                  amount: rec.amount,
                  currency: rec.currency,
                  description: rec.description,
                  date: targetDate,
                  recurringId: rec._id,
                })

                createdCount++
                createdIds.push(insertResult.insertedId.toString())
                affectedUserIds.add(rec.userId.toString())
                datesToEnsure.add(targetDate.getTime())
              } catch (error) {
                if (isDuplicateKeyError(error)) {
                  skippedReason.push({
                    id: rec._id.toString(),
                    reason: "existing",
                  })
                  affectedUserIds.add(rec.userId.toString())
                  return
                }
                throw error
              }
            })
          )

          const latestDate = dueDates[dueDates.length - 1]
          await recurringCollection.updateOne(
            { _id: rec._id },
            { $set: { lastGeneratedDate: latestDate } }
          )
        })
      )
    }

    for await (const rec of cursor) {
      currentBatch.push(rec)
      if (currentBatch.length >= BATCH_SIZE) {
        await processBatch(currentBatch)
        currentBatch = []
      }
    }

    if (currentBatch.length > 0) {
      await processBatch(currentBatch)
    }

    if (datesToEnsure.size > 0) {
      await Promise.allSettled(
        Array.from(datesToEnsure).map(async (ms) => {
          const d = new Date(ms)
          try {
            await ensureExchangeRateForDate(d)
          } catch (error) {
            await enqueueMissingExchangeRateDate(d, error)
          }
        })
      )
    }

    for (const userId of affectedUserIds) {
      updateTag(`transactions-${userId}`)
      updateTag(`recurringTransactions-${userId}`)
    }

    return Response.json({
      success: true,
      created: createdCount,
      createdIds,
      skippedCount: skippedReason.length,
      skippedReason,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("RECURRING TRANSACTIONS CRON ERROR:", error)
    return new Response("Recurring transactions cron failed", { status: 500 })
  }
}
