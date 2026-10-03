import { updateTag } from "next/cache"
import type { NextRequest } from "next/server"

import {
  enqueueMissingExchangeRateDate,
  ensureExchangeRateForDate,
} from "@/actions/exchange-rates.actions"
import {
  getExchangeRatesCollection,
  getMissingExchangeRatesCollection,
  getTransactionsCollection,
} from "@/lib/collections"
import { verifyCronAuth } from "@/lib/cron"
import { CURRENCIES } from "@/lib/currency"
import { addDays, normalizeToUTCMidnight } from "@/lib/date"

// Vercel Cron Jobs only trigger HTTP GET requests.
// [See official docs](https://vercel.com/docs/cron-jobs#how-cron-jobs-work)

const MAX_DATES_PER_RUN = 5

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!verifyCronAuth(authHeader)) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const [missingRatesCollection, exchangeRatesCollection] = await Promise.all(
      [getMissingExchangeRatesCollection(), getExchangeRatesCollection()]
    )

    const now = new Date()
    const todayUTC = normalizeToUTCMidnight(now)
    const yesterdayUTC = addDays(todayUTC, -1)

    const datesToCheck = new Set<number>()
    datesToCheck.add(yesterdayUTC.getTime())

    // Only process queued docs that have not failed 6 times
    const queuedDocs = await missingRatesCollection
      .find({
        status: { $ne: "failed" },
        $or: [{ retryCount: { $lt: 6 } }, { retryCount: { $exists: false } }],
      })
      .sort({ createdAt: 1 })
      .limit(MAX_DATES_PER_RUN)
      .toArray()

    for (const doc of queuedDocs) {
      if (doc?.date) {
        datesToCheck.add(normalizeToUTCMidnight(new Date(doc.date)).getTime())
      }
    }

    const nonUSDCurrencies = CURRENCIES.filter((c) => c !== "USD")
    const checkDateObjs = Array.from(datesToCheck).map((ms) => new Date(ms))

    const existingRates = await exchangeRatesCollection
      .find({
        date: { $in: checkDateObjs },
      })
      .toArray()

    const existingMap = new Map(
      existingRates.map((r) => [r.date.getTime(), r.rates])
    )

    const missingDates: Date[] = []
    const resolvedDates: Date[] = []
    for (const ms of datesToCheck) {
      const rates = existingMap.get(ms)
      const isMissing =
        !rates || nonUSDCurrencies.some((c) => rates[c] === undefined)
      if (isMissing) {
        missingDates.push(new Date(ms))
      } else {
        resolvedDates.push(new Date(ms))
      }
    }

    // Clean up any queued records whose exchange rates are already fully resolved
    if (resolvedDates.length > 0) {
      await missingRatesCollection.deleteMany({
        date: { $in: resolvedDates },
      })
    }

    missingDates.sort((a, b) => a.getTime() - b.getTime())
    const datesToSync = missingDates.slice(0, MAX_DATES_PER_RUN)

    let syncedCount = 0
    const successfullySyncedDates: Date[] = []
    const errors: { date: string; error: string }[] = []

    type SyncItemResult =
      | { success: true; date: Date }
      | { success: false; date: Date; error: string }

    const syncResults = await Promise.allSettled(
      datesToSync.map(async (d): Promise<SyncItemResult> => {
        try {
          await ensureExchangeRateForDate(d)
          await missingRatesCollection.deleteOne({ date: d })
          return { success: true, date: d }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error ?? "")
          await enqueueMissingExchangeRateDate(d, error, true)
          return {
            success: false,
            date: d,
            error: errorMsg,
          }
        }
      })
    )

    for (let i = 0; i < syncResults.length; i++) {
      const res = syncResults[i]
      const dateStr = datesToSync[i].toISOString().split("T")[0] as string
      if (res.status === "fulfilled") {
        if (res.value.success) {
          syncedCount++
          successfullySyncedDates.push(res.value.date)
        } else {
          errors.push({
            date: dateStr,
            error: res.value.error,
          })
        }
      } else {
        const errorMsg =
          res.reason instanceof Error
            ? res.reason.message
            : String(res.reason ?? "")
        errors.push({
          date: dateStr,
          error: errorMsg,
        })
      }
    }

    // Invalidate transactions cache for all users having transactions on synced dates
    if (successfullySyncedDates.length > 0) {
      const transactionsCollection = await getTransactionsCollection()
      const affectedTransactions = await transactionsCollection
        .find(
          { date: { $in: successfullySyncedDates } },
          { projection: { userId: 1 } }
        )
        .toArray()

      const affectedUserIds = new Set<string>()
      for (const tx of affectedTransactions) {
        if (tx.userId) {
          affectedUserIds.add(tx.userId.toString())
        }
      }
      for (const userId of affectedUserIds) {
        updateTag(`transactions-${userId}`)
      }
    }

    // Mark any dates that just reached retryCount >= 6 as failed
    await missingRatesCollection.updateMany(
      { retryCount: { $gte: 6 }, status: { $ne: "failed" } },
      { $set: { status: "failed", failedAt: new Date() } }
    )

    const remainingQueueCount = await missingRatesCollection.countDocuments({
      status: { $ne: "failed" },
    })

    return Response.json({
      success: true,
      checkedCount: datesToCheck.size,
      missingCount: missingDates.length,
      batchCount: datesToSync.length,
      syncedCount,
      remainingCount: remainingQueueCount,
      errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("EXCHANGE RATES CRON ERROR:", error)
    return new Response("Exchange rates cron failed", { status: 500 })
  }
}
