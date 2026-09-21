import "server-only"

import Decimal from "decimal.js"
import type { Decimal128 } from "mongodb"

import { serverEnv } from "@/env/server"
import {
  getExchangeRatesCollection,
  getMissingExchangeRatesCollection,
} from "@/lib/collections"
import { CURRENCIES } from "@/lib/currency"
import type { Currency } from "@/lib/currency"
import { normalizeToUTCMidnight } from "@/lib/date"
import type {
  DBExchangeRate,
  ExchangeRate,
  Transaction,
} from "@/lib/definitions"
import { convertAmountWithRates, toDecimal } from "@/lib/utils"

import { toDecimal128 } from "./utils"

export type DBRatesMap = Partial<Record<Exclude<Currency, "USD">, Decimal128>> &
  Record<string, Decimal128>
export type RatesMap = Partial<Record<Currency, Decimal>> &
  Record<string, Decimal>

export type CurrencyApiRateItem = {
  code: string
  value: number
}

export type CurrencyApiResponse = {
  meta: {
    last_updated_at: string
  }
  data: Record<string, CurrencyApiRateItem>
}

async function fetchCurrencyApiRatesForDate(dateStr: string) {
  const apiUrl = `https://api.currencyapi.com/v3/historical?apikey=${serverEnv.CURRENCY_API_SECRET}&currencies=${CURRENCIES.join(",")}&date=${dateStr}`

  const response = await fetch(apiUrl, {
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) {
    throw new Error(
      `Currency API returned status ${response.status} for date ${dateStr}`
    )
  }

  const result = (await response.json()) as CurrencyApiResponse
  return Object.fromEntries(
    Object.entries(result.data).map(([code, item]) => [code, item.value])
  )
}

export async function ensureExchangeRateForDate(date: Date): Promise<void> {
  const normalizedDate = normalizeToUTCMidnight(date)
  const collection = await getExchangeRatesCollection()
  const existing = await collection.findOne({ date: normalizedDate })

  const nonUSDCurrencies = CURRENCIES.filter((c) => c !== "USD")
  const missingCurrencies = nonUSDCurrencies.filter(
    (curr) => !existing?.rates || existing.rates[curr] === undefined
  )

  if (missingCurrencies.length === 0) return

  const dateStr = normalizedDate.toISOString().split("T")[0]
  const fetchedRates = await fetchCurrencyApiRatesForDate(dateStr)

  const updateFields: Record<string, Decimal128> = {}
  for (const [curr, rateVal] of Object.entries(fetchedRates)) {
    if (curr === "USD") continue
    updateFields[`rates.${curr}`] = toDecimal128(rateVal.toString())
  }

  if (Object.keys(updateFields).length > 0) {
    await collection.updateOne(
      { date: normalizedDate },
      { $set: updateFields },
      { upsert: true }
    )
  }
}

export async function enqueueMissingExchangeRateDate(
  date: Date,
  error?: unknown
): Promise<void> {
  const collection = await getMissingExchangeRatesCollection()
  const normalizedDate = normalizeToUTCMidnight(date)

  await collection.updateOne(
    { date: normalizedDate },
    {
      $setOnInsert: { createdAt: new Date() },
      $inc: { retryCount: 1 },
      $set: {
        lastError: error instanceof Error ? error.message : String(error ?? ""),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  )
}

async function fetchCandidateExchangeRates(
  minDate: Date,
  maxDate: Date
): Promise<ExchangeRate[]> {
  const collection = await getExchangeRatesCollection()

  const [inRangeRates, priorRate, afterRate] = await Promise.all([
    collection
      .find({ date: { $gte: minDate, $lte: maxDate } })
      .sort({ date: 1 })
      .toArray(),
    collection.findOne({ date: { $lte: minDate } }, { sort: { date: -1 } }),
    collection.findOne({ date: { $gte: maxDate } }, { sort: { date: 1 } }),
  ])

  let rawRates: DBExchangeRate[] = [
    ...(priorRate ? [priorRate] : []),
    ...inRangeRates,
    ...(afterRate ? [afterRate] : []),
  ]

  if (rawRates.length === 0) {
    const latestDoc = await collection.findOne({}, { sort: { date: -1 } })
    if (latestDoc) {
      rawRates = [latestDoc]
    }
  }

  const uniqueDocs = Array.from(
    new Map(rawRates.map((doc) => [doc.date.getTime(), doc])).values()
  ).sort((a, b) => a.date.getTime() - b.date.getTime())

  return uniqueDocs.map((doc) => {
    const rates: RatesMap = { USD: toDecimal("1") }
    for (const [curr, val] of Object.entries(doc.rates ?? {})) {
      if (val) rates[curr] = toDecimal(val.toString())
    }
    return {
      ...doc,
      _id: doc._id.toString(),
      rates,
    } as ExchangeRate
  })
}

function findNearestRate(rates: ExchangeRate[], txTime: number): ExchangeRate {
  let low = 0
  let high = rates.length - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const midTime = rates[mid].date.getTime()
    if (midTime === txTime) return rates[mid]
    if (midTime < txTime) low = mid + 1
    else high = mid - 1
  }

  if (high < 0) return rates[0]
  if (low >= rates.length) return rates[rates.length - 1]

  const diffHigh = Math.abs(rates[high].date.getTime() - txTime)
  const diffLow = Math.abs(rates[low].date.getTime() - txTime)

  return diffHigh <= diffLow ? rates[high] : rates[low]
}

export async function convertTransactionsToCurrency(
  transactions: Transaction[],
  targetCurrency: Currency
): Promise<Transaction[]> {
  if (transactions.length === 0) return transactions

  let minTimestamp = Infinity
  let maxTimestamp = -Infinity
  const timestamps = new Array<number>(transactions.length)
  for (let i = 0; i < transactions.length; i++) {
    const time = normalizeToUTCMidnight(
      new Date(transactions[i].date)
    ).getTime()
    timestamps[i] = time
    if (time < minTimestamp) minTimestamp = time
    if (time > maxTimestamp) maxTimestamp = time
  }
  const minDate = new Date(minTimestamp)
  const maxDate = new Date(maxTimestamp)

  const rates = await fetchCandidateExchangeRates(minDate, maxDate)
  if (rates.length === 0) return transactions

  return transactions.map((transaction, idx) => {
    let nearestRate = findNearestRate(rates, timestamps[idx])

    if (transaction.currency === targetCurrency) {
      const stringifiedRates = Object.fromEntries(
        Object.entries(nearestRate.rates ?? {}).map(([curr, dec]) => [
          curr,
          dec.toString(),
        ])
      ) as Record<Currency, string>

      return {
        ...transaction,
        originalAmount: transaction.originalAmount ?? transaction.amount,
        originalCurrency: transaction.originalCurrency ?? transaction.currency,
        rates: transaction.rates ?? stringifiedRates,
      }
    }

    let rateFromVal = nearestRate.rates?.[transaction.currency]
    let rateToVal = nearestRate.rates?.[targetCurrency]

    if ((!rateFromVal || !rateToVal) && rates.length > 1) {
      const fallbackRate = rates.find(
        (r) => r.rates?.[transaction.currency] && r.rates?.[targetCurrency]
      )
      if (fallbackRate) {
        nearestRate = fallbackRate
        rateFromVal = fallbackRate.rates?.[transaction.currency]
        rateToVal = fallbackRate.rates?.[targetCurrency]
      }
    }

    const stringifiedRates = Object.fromEntries(
      Object.entries(nearestRate.rates ?? {}).map(([curr, dec]) => [
        curr,
        dec.toString(),
      ])
    ) as Record<Currency, string>

    if (!rateFromVal || !rateToVal) {
      return {
        ...transaction,
        originalAmount: transaction.originalAmount ?? transaction.amount,
        originalCurrency: transaction.originalCurrency ?? transaction.currency,
        rates: transaction.rates ?? stringifiedRates,
      }
    }

    const convertedAmount = convertAmountWithRates(
      new Decimal(transaction.amount),
      transaction.currency,
      targetCurrency,
      nearestRate.rates
    )

    return {
      ...transaction,
      amount: convertedAmount.toString(),
      currency: targetCurrency,
      originalAmount: transaction.originalAmount ?? transaction.amount,
      originalCurrency: transaction.originalCurrency ?? transaction.currency,
      rates: stringifiedRates,
    }
  })
}
