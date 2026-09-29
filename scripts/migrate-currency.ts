import type { ObjectId } from "mongodb"
import { Decimal128, MongoClient } from "mongodb"

import { CURRENCIES } from "../lib/currency.ts"

type ExchangeRateDoc = {
  _id: ObjectId
  date: Date
  rates?: Record<string, Decimal128>
}

type CurrencyApiResponse = {
  meta: {
    last_updated_at: string
  }
  data: Record<string, { code: string; value: number }>
}

async function migrate() {
  const dbUri = process.env.DB_URI
  const dbName = process.env.DB_NAME
  const apiKey = process.env.CURRENCY_API_SECRET

  if (!dbUri || !dbName || !apiKey) {
    console.error(
      "Missing DB_URI, DB_NAME, or CURRENCY_API_SECRET in .env file"
    )
    process.exit(1)
  }

  const client = new MongoClient(dbUri)

  try {
    console.log("Starting exchange rate migration with CurrencyAPI...")
    await client.connect()
    const collection = client
      .db(dbName)
      .collection<ExchangeRateDoc>("exchangeRates")

    const docs = await collection.find({}).sort({ date: 1 }).toArray()
    if (docs.length === 0) {
      console.log("No exchange rate records found in database to migrate.")
      return
    }

    const nonUSDCurrencies = CURRENCIES.filter((c) => c !== "USD")
    const docsWithMissingRates = docs.filter((doc) =>
      nonUSDCurrencies.some(
        (curr) => !doc.rates || doc.rates[curr] === undefined
      )
    )

    if (docsWithMissingRates.length === 0) {
      console.log("All currencies in CURRENCIES are up to date!")
      return
    }

    console.log(
      `Found ${docsWithMissingRates.length} records with missing currency rates.`
    )

    const currenciesParam = CURRENCIES.join(",")
    let updatedCount = 0

    for (const doc of docsWithMissingRates) {
      const dateStr = doc.date.toISOString().split("T")[0]
      console.log(`Fetching exchange rates for date ${dateStr}...`)

      const url = `https://api.currencyapi.com/v3/historical?apikey=${apiKey}&currencies=${currenciesParam}&date=${dateStr}`
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        console.error(
          `CurrencyAPI error for ${dateStr}: ${response.status} ${response.statusText}`
        )
        continue
      }

      const ratesData = (await response.json()) as CurrencyApiResponse
      const updateFields: Record<string, Decimal128> = {}

      for (const [code, item] of Object.entries(ratesData.data)) {
        if (code === "USD") continue
        updateFields[`rates.${code}`] = Decimal128.fromString(
          item.value.toString()
        )
      }

      if (Object.keys(updateFields).length > 0) {
        await collection.updateOne({ _id: doc._id }, { $set: updateFields })
        updatedCount++
      }

      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    console.log(`Successfully updated ${updatedCount} exchange rate records.`)
  } catch (error) {
    console.error("Migration failed:", error)
  } finally {
    await client.close()
  }
}

migrate()
