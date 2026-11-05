import type { NextRequest } from "next/server"

import { verifyCronAuth } from "@/lib/cron"
import { reconcileMissingRatesQueue } from "@/lib/currency-engine"

// Vercel Cron Jobs only trigger HTTP GET requests.
// [See official docs](https://vercel.com/docs/cron-jobs#how-cron-jobs-work)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!verifyCronAuth(authHeader)) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const result = await reconcileMissingRatesQueue()
    return Response.json(result)
  } catch (error) {
    console.error("EXCHANGE RATES CRON ERROR:", error)
    return new Response("Exchange rates cron failed", { status: 500 })
  }
}
