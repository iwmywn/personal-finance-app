import { updateTag } from "next/cache"
import type { NextRequest } from "next/server"

import {
  enqueueMissingExchangeRateDate,
  ensureExchangeRateForDate,
} from "@/actions/exchange-rates.actions"
import { getActiveBanMongoFilter } from "@/actions/utils"
import {
  getRecurringTransactionsCollection,
  getTransactionsCollection,
  getUsersCollection,
} from "@/lib/collections"
import { verifyCronAuth } from "@/lib/cron"
import { normalizeToUTCMidnight } from "@/lib/date"
import { withTransaction } from "@/lib/db"
import type { DBRecurringTransaction } from "@/lib/definitions"
import { isDuplicateKeyError } from "@/lib/indexes"

import { getDueDates } from "./utils"

// Vercel Cron Jobs only trigger HTTP GET requests.
// [See official docs](https://vercel.com/docs/cron-jobs#how-cron-jobs-work)

const MAX_TRANSACTIONS_PER_RUN = 5

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!verifyCronAuth(authHeader)) {
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
      .find(getActiveBanMongoFilter(), { projection: { _id: 1 } })
      .toArray()
    const bannedUserIds = bannedUsers.flatMap((u) => [u._id, u._id.toString()])

    const todayUTC = normalizeToUTCMidnight(new Date())

    /**
     * Query candidate recurring transactions to process:
     * - Exclude schedules belonging to banned users.
     * - Only process schedules whose start date has arrived (startDate <= todayUTC).
     * - Match active schedules (no endDate or endDate >= todayUTC).
     * - Match expired schedules that still have pending occurrences to backfill
     *   (lastGeneratedDate is unset/null or lastGeneratedDate < endDate).
     */
    const cursor = recurringCollection.find({
      ...(bannedUserIds.length > 0
        ? {
            userId: {
              $nin: bannedUserIds as unknown as DBRecurringTransaction["userId"][],
            },
          }
        : {}),
      startDate: { $lte: todayUTC },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null as unknown as Date },
        { endDate: { $gte: todayUTC } },
        {
          $and: [
            { endDate: { $lt: todayUTC } },
            {
              $or: [
                { lastGeneratedDate: { $exists: false } },
                { lastGeneratedDate: null as unknown as Date },
                { $expr: { $lt: ["$lastGeneratedDate", "$endDate"] } },
              ],
            },
          ],
        },
      ],
    })

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
            if (
              rec.endDate &&
              normalizeToUTCMidnight(rec.endDate).getTime() < todayUTC.getTime()
            ) {
              await recurringCollection.updateOne(
                { _id: rec._id },
                {
                  $set: {
                    lastGeneratedDate: normalizeToUTCMidnight(rec.endDate),
                  },
                }
              )
              affectedUserIds.add(rec.userId.toString())
            }
            return
          }

          const scheduleCreatedIds: string[] = []
          const scheduleDatesToEnsure: number[] = []

          await withTransaction(async (dbSession) => {
            const existingTxDocs = await transactionsCollection
              .find(
                {
                  userId: rec.userId,
                  type: rec.type,
                  categoryKey: rec.categoryKey,
                  amount: rec.amount,
                  currency: rec.currency,
                  description: rec.description,
                  date: { $in: dueDates },
                },
                { session: dbSession }
              )
              .toArray()

            const existingDateSet = new Set(
              existingTxDocs.map((tx) => tx.date.getTime())
            )

            for (const targetDate of dueDates) {
              if (existingDateSet.has(targetDate.getTime())) {
                skippedReason.push({
                  id: rec._id.toString(),
                  reason: "existing",
                })
                affectedUserIds.add(rec.userId.toString())
              }
            }

            const datesToInsert = dueDates.filter(
              (targetDate) => !existingDateSet.has(targetDate.getTime())
            )

            if (datesToInsert.length > 0) {
              const transactionDocs = datesToInsert.map((targetDate) => ({
                userId: rec.userId,
                type: rec.type,
                categoryKey: rec.categoryKey,
                amount: rec.amount,
                currency: rec.currency,
                description: rec.description,
                date: targetDate,
              }))

              try {
                const insertResult = await transactionsCollection.insertMany(
                  transactionDocs,
                  { session: dbSession }
                )

                const insertedIds = Object.values(insertResult.insertedIds).map(
                  (id) => id.toString()
                )
                scheduleCreatedIds.push(...insertedIds)
                for (const targetDate of datesToInsert) {
                  scheduleDatesToEnsure.push(targetDate.getTime())
                }
              } catch (error) {
                if (isDuplicateKeyError(error)) {
                  skippedReason.push({
                    id: rec._id.toString(),
                    reason: "existing",
                  })
                  affectedUserIds.add(rec.userId.toString())
                  const latestDate = dueDates[dueDates.length - 1]
                  await recurringCollection.updateOne(
                    { _id: rec._id },
                    { $set: { lastGeneratedDate: latestDate } },
                    { session: dbSession }
                  )
                  return
                }
                throw error
              }
            }

            const latestDate = dueDates[dueDates.length - 1]
            await recurringCollection.updateOne(
              { _id: rec._id },
              { $set: { lastGeneratedDate: latestDate } },
              { session: dbSession }
            )
          })

          if (scheduleCreatedIds.length > 0) {
            createdIds.push(...scheduleCreatedIds)
            affectedUserIds.add(rec.userId.toString())
            for (const ms of scheduleDatesToEnsure) {
              datesToEnsure.add(ms)
            }
          }
        })
      )
    }

    for await (const rec of cursor) {
      currentBatch.push(rec)
      if (currentBatch.length >= MAX_TRANSACTIONS_PER_RUN) {
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
      created: createdIds.length,
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
