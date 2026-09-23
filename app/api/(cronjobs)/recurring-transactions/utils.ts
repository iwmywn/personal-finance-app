import {
  addDays,
  clampDayToMonth,
  isSameUTCDate,
  normalizeToUTCMidnight,
} from "@/lib/date"
import type {
  DBRecurringTransaction,
  RecurringTransaction,
} from "@/lib/definitions"

function nextMonthlyDate(lastGeneratedDateUTC: Date, startDateUTC: Date): Date {
  const y = lastGeneratedDateUTC.getUTCFullYear()
  const m = lastGeneratedDateUTC.getUTCMonth() + 1
  const targetDay = startDateUTC.getUTCDate()
  return new Date(Date.UTC(y, m, clampDayToMonth(y, m + 1, targetDay)))
}

function nextQuarterlyDate(
  lastGeneratedDateUTC: Date,
  startDateUTC: Date
): Date {
  const y = lastGeneratedDateUTC.getUTCFullYear()
  const m = lastGeneratedDateUTC.getUTCMonth() + 3
  const targetDay = startDateUTC.getUTCDate()
  return new Date(Date.UTC(y, m, clampDayToMonth(y, m + 1, targetDay)))
}

function nextYearlyDate(lastGeneratedDateUTC: Date, startDateUTC: Date): Date {
  const y = lastGeneratedDateUTC.getUTCFullYear() + 1
  const targetMonth = startDateUTC.getUTCMonth()
  const targetDay = startDateUTC.getUTCDate()
  return new Date(
    Date.UTC(y, targetMonth, clampDayToMonth(y, targetMonth + 1, targetDay))
  )
}

function stepNextDate(
  currentUTC: Date,
  frequency: DBRecurringTransaction["frequency"],
  startDateUTC: Date,
  randomEveryXDays?: number
): Date {
  switch (frequency) {
    case "daily":
      return addDays(currentUTC, 1)

    case "weekly":
      return addDays(currentUTC, 7)

    case "bi-weekly":
      return addDays(currentUTC, 14)

    case "monthly":
      return nextMonthlyDate(currentUTC, startDateUTC)

    case "quarterly":
      return nextQuarterlyDate(currentUTC, startDateUTC)

    case "yearly":
      return nextYearlyDate(currentUTC, startDateUTC)

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

  while (candidate < todayUTC && !isSameUTCDate(candidate, todayUTC)) {
    candidate = stepNextDate(
      candidate,
      rec.frequency,
      startUTC,
      rec.randomEveryXDays
    )
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

  if (todayUTC < startUTC) {
    return []
  }

  // If lastGeneratedDate is already today, or already reached endDate, nothing to generate
  if (rec.lastGeneratedDate) {
    const lastGen = normalizeToUTCMidnight(new Date(rec.lastGeneratedDate))
    if (isSameUTCDate(lastGen, todayUTC) || (endUTC && lastGen >= endUTC)) {
      return []
    }
  }

  // Backfill all missed occurrences up to todayUTC
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
    if (candidate.getTime() >= startUTC.getTime()) {
      dueDates.push(candidate)
    }

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
