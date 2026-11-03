import { createHmac } from "node:crypto"

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function decodeBase32(encoded: string): Uint8Array {
  const cleaned = encoded.replace(/=+$/, "").toUpperCase()
  let bits = 0
  let value = 0
  const output: number[] = []

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i])
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${cleaned[i]}`)
    }
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }

  return new Uint8Array(output)
}

export function generateTotpCode(
  secret: string | Uint8Array,
  timestampMs: number = Date.now(),
  periodSeconds: number = 30,
  digits: number = 6
): string {
  const counter = Math.floor(timestampMs / (periodSeconds * 1000))
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigUInt64BE(BigInt(counter), 0)

  const keyBytes =
    typeof secret === "string"
      ? Buffer.from(secret, "utf8")
      : Buffer.from(secret)

  const hmacResult = createHmac("sha1", keyBytes).update(counterBuffer).digest()
  const offset = hmacResult[hmacResult.length - 1] & 0x0f
  const binaryCode =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff)

  return (binaryCode % 10 ** digits).toString().padStart(digits, "0")
}

export function generateTotpFromBase32(
  base32Secret: string,
  timestampMs: number = Date.now()
): string {
  return generateTotpCode(decodeBase32(base32Secret), timestampMs)
}
