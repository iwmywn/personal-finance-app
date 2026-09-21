"use server"

import { isIP } from "node:net"
import { cacheLife, cacheTag } from "next/cache"

import { getSession } from "./session.actions"

function isPrivateOrLocalIP(ip: string): boolean {
  if (
    ip === "0000:0000:0000:0000:0000:0000:0000:0000" ||
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.")
  ) {
    return true
  }
  if (ip.startsWith("172.")) {
    const parts = ip.split(".")
    if (parts.length >= 2) {
      const second = Number.parseInt(parts[1], 10)
      if (second >= 16 && second <= 31) return true
    }
  }
  return false
}

async function fetchLocationCached(ipAddress: string) {
  "use cache: remote"
  cacheTag(`location-${ipAddress}`)
  cacheLife({ expire: 120 })

  try {
    const response = await fetch(
      `https://ipwho.is/${encodeURIComponent(ipAddress)}`,
      { signal: AbortSignal.timeout(4000) }
    )
    if (!response.ok) return null
    const data = await response.json()

    if (data.success) {
      const parts: string[] = []
      if (data.region) parts.push(data.region)
      if (data.country) parts.push(data.country)

      return parts.length > 0 ? parts.join(", ") : null
    }

    return null
  } catch (error) {
    console.error("Error fetching location from IP: ", error)
    return null
  }
}

export async function getLocationFromIP(ipAddress: string | null | undefined) {
  const { user, session } = await getSession()
  if (!user || !session) return null

  if (!ipAddress) return null
  if (isPrivateOrLocalIP(ipAddress)) {
    return "Local"
  }

  if (!isIP(ipAddress)) return null

  return fetchLocationCached(ipAddress)
}
