import { Decimal128 } from "mongodb"

export function toDecimal128(value: string): Decimal128 {
  return Decimal128.fromString(value)
}

export function getActiveBanMongoFilter(now: Date = new Date()) {
  return {
    banned: true,
    $or: [
      { banExpires: null },
      { banExpires: { $exists: false } },
      { banExpires: { $gt: now } },
    ],
  }
}
