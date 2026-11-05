import { addDays, clampDayToMonth, normalizeToUTCMidnight } from "@/lib/date"
import type {
  DBRecurringTransaction,
  RecurringTransaction,
} from "@/lib/definitions"

export function addMonthsClamped(
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

export function stepNextDate(
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

/**
 * Calculates the next occurrence date for a recurring schedule after its last generated date.
 * Returns null if the schedule has ended or the next candidate exceeds endDate.
 */
export function getNextOccurrence(
  rec: DBRecurringTransaction | RecurringTransaction,
  asOfDate: Date = normalizeToUTCMidnight(new Date())
): Date | null {
  const todayUTC = normalizeToUTCMidnight(asOfDate)
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

  while (candidate.getTime() < todayUTC.getTime()) {
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

  if (endUTC && candidate.getTime() > endUTC.getTime()) {
    return null
  }

  return candidate
}

export const getNextDate = getNextOccurrence

/**
 * Calculates all due occurrence dates for a recurring schedule up to today/asOfDate.
 */
export function getDueOccurrences(
  rec: DBRecurringTransaction | RecurringTransaction,
  asOfDate: Date = normalizeToUTCMidnight(new Date())
): Date[] {
  const todayUTC = normalizeToUTCMidnight(asOfDate)
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

  while (candidate.getTime() <= effectiveEndUTC.getTime()) {
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

export const getDueDates = getDueOccurrences
