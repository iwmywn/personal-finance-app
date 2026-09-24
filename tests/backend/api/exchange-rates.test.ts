import { NextRequest } from "next/server"
import { ObjectId } from "mongodb"

import { insertTestMissingExchangeRate } from "@/tests/backend/helpers/database"
import { GET } from "@/app/api/(cronjobs)/exchange-rates/route"
import {
  getExchangeRatesCollection,
  getMissingExchangeRatesCollection,
} from "@/lib/collections"
import { normalizeToUTCMidnight } from "@/lib/date"

const cronSecret = "test-cron-secret"
const cronEndpoint = "http://localhost/api/exchange-rates"

describe("Exchange Rates Cron Job", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("Authorization", () => {
    it("should return 401 when authorization header is missing", async () => {
      const request = new NextRequest(cronEndpoint)
      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(await response.text()).toBe("Unauthorized")
    })

    it("should return 401 when authorization header has invalid token", async () => {
      const request = new NextRequest(cronEndpoint, {
        headers: {
          authorization: "Bearer wrong-secret",
        },
      })
      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(await response.text()).toBe("Unauthorized")
    })
  })

  describe("Cron execution", () => {
    it("should fetch rates for yesterday when no rates exist", async () => {
      const mockRatesResponse = {
        meta: { last_updated_at: "2024-03-10T23:59:59Z" },
        data: {
          CNY: { code: "CNY", value: 7.18 },
          JPY: { code: "JPY", value: 147.2 },
          KRW: { code: "KRW", value: 1320.5 },
          USD: { code: "USD", value: 1 },
          VND: { code: "VND", value: 24600 },
        },
      }

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockRatesResponse,
      } as Response)

      const request = new NextRequest(cronEndpoint, {
        headers: {
          authorization: `Bearer ${cronSecret}`,
        },
      })

      const response = await GET(request)
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.syncedCount).toBeGreaterThanOrEqual(1)
      expect(fetchSpy).toHaveBeenCalledTimes(1)

      const now = new Date()
      const todayUTC = normalizeToUTCMidnight(now)
      const yesterdayUTC = new Date(todayUTC.getTime() - 24 * 60 * 60 * 1000)

      const exchangeRatesCollection = await getExchangeRatesCollection()
      const saved = await exchangeRatesCollection.findOne({
        date: yesterdayUTC,
      })

      expect(saved).not.toBeNull()
      expect(saved?.rates.VND?.toString()).toBe("24600")
      expect(saved?.rates.CNY?.toString()).toBe("7.18")
    })

    it("should fetch missing rates for queued dates from missingExchangeRates", async () => {
      const pastDate = new Date("2024-01-15T00:00:00Z")
      await insertTestMissingExchangeRate({
        _id: new ObjectId(),
        date: pastDate,
        createdAt: new Date(),
        retryCount: 0,
      })

      const mockRatesResponse = {
        meta: { last_updated_at: "2024-01-15T23:59:59Z" },
        data: {
          CNY: { code: "CNY", value: 7.15 },
          JPY: { code: "JPY", value: 145.0 },
          KRW: { code: "KRW", value: 1300.0 },
          USD: { code: "USD", value: 1 },
          VND: { code: "VND", value: 24500 },
        },
      }

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockRatesResponse,
      } as Response)

      const request = new NextRequest(cronEndpoint, {
        headers: {
          authorization: `Bearer ${cronSecret}`,
        },
      })

      const response = await GET(request)
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.success).toBe(true)

      const exchangeRatesCollection = await getExchangeRatesCollection()
      const savedPast = await exchangeRatesCollection.findOne({
        date: pastDate,
      })

      expect(savedPast).not.toBeNull()
      expect(savedPast?.rates.VND?.toString()).toBe("24500")

      const missingRatesCollection = await getMissingExchangeRatesCollection()
      const inQueue = await missingRatesCollection.findOne({
        date: pastDate,
      })
      expect(inQueue).toBeNull()
    })

    it("should handle API failure gracefully without returning 500", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response)

      const request = new NextRequest(cronEndpoint, {
        headers: {
          authorization: `Bearer ${cronSecret}`,
        },
      })

      const response = await GET(request)
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.errors.length).toBeGreaterThan(0)
    })

    it("should remove records that have been retried more than 5 times", async () => {
      const oldPoisonDate = new Date("1970-01-01T00:00:00Z")
      await insertTestMissingExchangeRate({
        _id: new ObjectId(),
        date: oldPoisonDate,
        createdAt: new Date(),
        retryCount: 6,
      })

      const request = new NextRequest(cronEndpoint, {
        headers: {
          authorization: `Bearer ${cronSecret}`,
        },
      })

      const response = await GET(request)
      expect(response.status).toBe(200)

      const missingRatesCollection = await getMissingExchangeRatesCollection()
      const poisonDoc = await missingRatesCollection.findOne({
        date: oldPoisonDate,
      })
      expect(poisonDoc).toBeNull()
    })
  })
})
