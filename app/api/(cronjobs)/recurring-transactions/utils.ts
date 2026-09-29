import { addDays, clampDayToMonth, normalizeToUTCMidnight } from "@/lib/date"
import type {
  DBRecurringTransaction,
  RecurringTransaction,
} from "@/lib/definitions"

function addMonthsClamped(
  currentUTC: Date,
  months: number,
  targetDay: number
): Date {
  const nextMonth = currentUTC.getUTCMonth() + months
  const targetYear = currentUTC.getUTCFullYear() + Math.floor(nextMonth / 12)
  const targetMonthIndex = ((nextMonth % 12) + 12) % 12
  return new Date(
    Date.UTC(
      targetYear,
      targetMonthIndex,
      clampDayToMonth(targetYear, targetMonthIndex + 1, targetDay)
    )
  )
}

function stepNextDate(
  currentUTC: Date,
  frequency: DBRecurringTransaction["frequency"],
  startDateUTC: Date,
  randomEveryXDays?: number
): Date {
  const targetDay = startDateUTC.getUTCDate()
  switch (frequency) {
    case "daily":
      return addDays(currentUTC, 1)

    case "weekly":
      return addDays(currentUTC, 7)

    case "bi-weekly":
      return addDays(currentUTC, 14)

    case "monthly":
      return addMonthsClamped(currentUTC, 1, targetDay)

    case "quarterly":
      return addMonthsClamped(currentUTC, 3, targetDay)

    case "yearly":
      return addMonthsClamped(currentUTC, 12, targetDay)

    case "random": {
      const days =
        typeof randomEveryXDays === "number" && randomEveryXDays >= 1
          ? randomEveryXDays
          : 1
      return addDays(currentUTC, days)
    }
  }
}

export function getNextDate(
  rec: DBRecurringTransaction | RecurringTransaction,
  todayUTC: Date
): Date | null {
  const startUTC = normalizeToUTCMidnight(new Date(rec.startDate))
  const endUTC = rec.endDate
    ? normalizeToUTCMidnight(new Date(rec.endDate))
    : null

  let candidate = rec.lastGeneratedDate
    ? stepNextDate(
        normalizeToUTCMidnight(new Date(rec.lastGeneratedDate)),
        rec.frequency,
        startUTC,
        rec.randomEveryXDays
      )
    : startUTC

  const MAX_ITERATIONS = 366
  let iterations = 0

  while (
    candidate.getTime() < todayUTC.getTime() &&
    iterations < MAX_ITERATIONS
  ) {
    const next = stepNextDate(
      candidate,
      rec.frequency,
      startUTC,
      rec.randomEveryXDays
    )
    if (next.getTime() <= candidate.getTime()) {
      break
    }
    candidate = next
    iterations++
  }

  if (endUTC && candidate.getTime() > endUTC.getTime()) {
    return null
  }

  return candidate
}

export function getDueDates(
  rec: DBRecurringTransaction,
  todayUTC: Date
): Date[] {
  const startUTC = normalizeToUTCMidnight(new Date(rec.startDate))
  const endUTC = rec.endDate
    ? normalizeToUTCMidnight(new Date(rec.endDate))
    : null

  const effectiveEndUTC = endUTC && endUTC < todayUTC ? endUTC : todayUTC
  const dueDates: Date[] = []

  let candidate = rec.lastGeneratedDate
    ? stepNextDate(
        normalizeToUTCMidnight(new Date(rec.lastGeneratedDate)),
        rec.frequency,
        startUTC,
        rec.randomEveryXDays
      )
    : startUTC

  const MAX_OCCURRENCES = 366
  while (
    candidate.getTime() <= effectiveEndUTC.getTime() &&
    dueDates.length < MAX_OCCURRENCES
  ) {
    dueDates.push(candidate)

    const next = stepNextDate(
      candidate,
      rec.frequency,
      startUTC,
      rec.randomEveryXDays
    )
    if (next.getTime() <= candidate.getTime()) {
      break
    }
    candidate = next
  }

  return dueDates
}
