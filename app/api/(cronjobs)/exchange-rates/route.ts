import type { NextRequest } from "next/server"

import {
  enqueueMissingExchangeRateDate,
  ensureExchangeRateForDate,
} from "@/actions/exchange-rates.actions"
import { serverEnv } from "@/env/server"
import {
  getExchangeRatesCollection,
  getMissingExchangeRatesCollection,
} from "@/lib/collections"
import { CURRENCIES } from "@/lib/currency"
import { addDays, normalizeToUTCMidnight } from "@/lib/date"

// Vercel Cron Jobs only trigger HTTP GET requests.
// [See official docs](https://vercel.com/docs/cron-jobs#how-cron-jobs-work)

const MAX_DATES_PER_RUN = 5

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${serverEnv.CRON_SECRET}`) {
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

    await missingRatesCollection.deleteMany({ retryCount: { $gt: 5 } })

    const queuedDocs = await missingRatesCollection
      .find({})
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
    for (const ms of datesToCheck) {
      const rates = existingMap.get(ms)
      const isMissing =
        !rates || nonUSDCurrencies.some((c) => rates[c] === undefined)
      if (isMissing) {
        missingDates.push(new Date(ms))
      }
    }

    missingDates.sort((a, b) => a.getTime() - b.getTime())
    const datesToSync = missingDates.slice(0, MAX_DATES_PER_RUN)

    let syncedCount = 0
    const errors: { date: string; error: string }[] = []

    const syncResults = await Promise.allSettled(
      datesToSync.map(async (d) => {
        try {
          await ensureExchangeRateForDate(d)
          await missingRatesCollection.deleteOne({ date: d })
          return { success: true, date: d }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error ?? "")
          await enqueueMissingExchangeRateDate(d, error)
          return {
            success: false,
            date: d,
            error: errorMsg,
          }
        }
      })
    )

    for (const res of syncResults) {
      if (res.status === "fulfilled") {
        if (res.value.success) {
          syncedCount++
        } else {
          errors.push({
            date: res.value.date.toISOString().split("T")[0] as string,
            error: res.value.error as string,
          })
        }
      } else {
        const errorMsg =
          res.reason instanceof Error
            ? res.reason.message
            : String(res.reason ?? "")
        errors.push({
          date: "unknown",
          error: errorMsg,
        })
      }
    }

    const remainingQueueCount = await missingRatesCollection.countDocuments()

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
