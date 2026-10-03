import { createParser } from "nuqs"

import { parseDateParts, serializeLocalDate } from "./date"

export const parseAsLocalDate = createParser({
  parse: (queryValue: string) => {
    const parts = parseDateParts(queryValue)
    if (!parts) return null
    const date = new Date(parts.year, parts.month - 1, parts.day)
    return isNaN(date.getTime()) ? null : date
  },
  serialize: serializeLocalDate,
  eq: (a: Date, b: Date) => serializeLocalDate(a) === serializeLocalDate(b),
})
