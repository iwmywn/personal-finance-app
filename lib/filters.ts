import MiniSearch from "minisearch"

import { isDateRangeOverlapping, localDateToUTCMidnight } from "@/lib/date"
import type {
  Budget,
  Category,
  Goal,
  RecurringTransaction,
  Transaction,
  User,
} from "@/lib/definitions"
import { isUserBanned } from "@/lib/utils"
import { FinancialRollupEngine } from "@/lib/valuation-engine"

type Filters = {
  searchTerm?: string
  selectedDate?: Date | null
  dateRange?: {
    from?: Date | null
    to?: Date | null
  }
  filterMonth?: string
  filterYear?: string
  filterType?: string
  filterCategoryKey?: string
  filterProgress?: string
  filterStatus?: string
  filterRole?: string
  todayUTC?: Date
}

function searchWithMiniSearch<T extends Record<string, unknown>>(
  documents: T[],
  searchTerm: string,
  fields: string[],
  idField: string = "_id"
): Set<string> {
  const normalizedSearchTerm = searchTerm.trim()

  if (!normalizedSearchTerm) {
    return new Set(documents.map((doc) => String(doc[idField])))
  }

  const miniSearch = new MiniSearch({
    idField,
    fields,
    storeFields: [idField],
    searchOptions: {
      prefix: true,
      combineWith: "AND",
    },
  })

  miniSearch.addAll(documents)

  const results = miniSearch.search(normalizedSearchTerm)

  return new Set(results.map((result) => String(result[idField])))
}

export { isDateRangeOverlapping } from "@/lib/date"

export function filterTransactions(
  transactions: Transaction[],
  filters: Filters
): Transaction[] {
  const {
    searchTerm = "",
    selectedDate,
    dateRange = {},
    filterMonth = "all",
    filterYear = "all",
    filterType = "all",
    filterCategoryKey = "all",
  } = filters

  const parsedMonth = filterMonth === "all" ? null : parseInt(filterMonth)
  const parsedYear = filterYear === "all" ? null : parseInt(filterYear)

  const matchingIds = searchTerm
    ? searchWithMiniSearch(transactions, searchTerm, ["description"])
    : null

  const selectedDateUTC = selectedDate
    ? localDateToUTCMidnight(selectedDate)
    : null
  const fromUTC = dateRange.from ? localDateToUTCMidnight(dateRange.from) : null
  const toUTC = dateRange.to ? localDateToUTCMidnight(dateRange.to) : null

  return transactions.filter((transaction) => {
    const matchesSearch = matchingIds ? matchingIds.has(transaction._id) : true

    const transactionDateOnly = new Date(transaction.date)

    const matchesSelectedDate = selectedDateUTC
      ? transactionDateOnly.getTime() === selectedDateUTC.getTime()
      : true

    const matchesDateRange =
      (!fromUTC || transactionDateOnly.getTime() >= fromUTC.getTime()) &&
      (!toUTC || transactionDateOnly.getTime() <= toUTC.getTime())

    const matchesMonth =
      !parsedMonth || transactionDateOnly.getUTCMonth() + 1 === parsedMonth

    const matchesYear =
      !parsedYear || transactionDateOnly.getUTCFullYear() === parsedYear

    const matchesType = filterType === "all" || transaction.type === filterType

    const matchesCategory =
      filterCategoryKey === "all" ||
      transaction.categoryKey === filterCategoryKey

    return (
      matchesSearch &&
      matchesSelectedDate &&
      matchesDateRange &&
      matchesMonth &&
      matchesYear &&
      matchesType &&
      matchesCategory
    )
  })
}

export function filterCustomCategories(
  categories: Category[],
  filters: Filters
): Category[] {
  const { searchTerm = "", filterType = "all" } = filters

  const matchingIds = searchTerm
    ? searchWithMiniSearch(categories, searchTerm, ["label"])
    : null

  return categories.filter((category) => {
    const matchesType = filterType === "all" || category.type === filterType

    const matchesSearch = matchingIds ? matchingIds.has(category._id) : true

    return matchesType && matchesSearch
  })
}

export function filterBudgets(
  budgets: Budget[],
  filters: Filters,
  transactions: Transaction[],
  timeZone?: string
): Budget[] {
  const engine = new FinancialRollupEngine(transactions, {
    timeZone,
    asOfDate: filters.todayUTC,
  })

  const valuations = engine.evaluateBudgets(budgets, {
    filterMonth: filters.filterMonth,
    filterYear: filters.filterYear,
    filterCategoryKey: filters.filterCategoryKey,
    filterStatus: filters.filterStatus,
    filterHealth: filters.filterProgress,
  })

  return valuations.map((v) => v.budget)
}

export function filterGoals(
  goals: Goal[],
  filters: Filters,
  transactions: Transaction[],
  timeZone?: string
): Goal[] {
  const { searchTerm = "" } = filters
  const matchingIds = searchTerm
    ? searchWithMiniSearch(goals, searchTerm, ["name"])
    : null

  const searchFilteredGoals = matchingIds
    ? goals.filter((g) => matchingIds.has(g._id))
    : goals

  const engine = new FinancialRollupEngine(transactions, {
    timeZone,
    asOfDate: filters.todayUTC,
  })

  const valuations = engine.evaluateGoals(searchFilteredGoals, {
    filterMonth: filters.filterMonth,
    filterYear: filters.filterYear,
    filterCategoryKey: filters.filterCategoryKey,
    filterStatus: filters.filterStatus,
    filterHealth: filters.filterProgress,
  })

  return valuations.map((v) => v.goal)
}

export function filterRecurringTransactions(
  recurringTransactions: RecurringTransaction[],
  filters: Filters
): RecurringTransaction[] {
  const {
    searchTerm = "",
    filterMonth = "all",
    filterYear = "all",
    filterType = "all",
    filterCategoryKey = "all",
    filterStatus = "all",
  } = filters

  const parsedMonth = filterMonth === "all" ? null : parseInt(filterMonth)
  const parsedYear = filterYear === "all" ? null : parseInt(filterYear)

  const matchingIds = searchTerm
    ? searchWithMiniSearch(recurringTransactions, searchTerm, ["description"])
    : null

  const todayUTC = filters.todayUTC ?? localDateToUTCMidnight(new Date())

  return recurringTransactions.filter((recurring) => {
    const matchesSearch = matchingIds ? matchingIds.has(recurring._id) : true

    const startDateOnly = new Date(recurring.startDate)
    const endDateOnly = recurring.endDate ? new Date(recurring.endDate) : null

    const overlaps = isDateRangeOverlapping(
      startDateOnly,
      endDateOnly,
      parsedMonth,
      parsedYear
    )

    const matchesType = filterType === "all" || recurring.type === filterType

    const matchesCategory =
      filterCategoryKey === "all" || recurring.categoryKey === filterCategoryKey

    const isUpcoming = startDateOnly > todayUTC
    const isEnded = Boolean(endDateOnly && todayUTC > endDateOnly)
    const isActive = !isUpcoming && !isEnded

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && isActive) ||
      (filterStatus === "upcoming" && isUpcoming) ||
      (filterStatus === "inactive" && isEnded)

    return (
      matchesSearch &&
      overlaps &&
      matchesType &&
      matchesCategory &&
      matchesStatus
    )
  })
}

export function filterUsers(users: User[], filters: Filters): User[] {
  const { searchTerm = "", filterRole = "all", filterStatus = "all" } = filters

  const matchingIds = searchTerm
    ? searchWithMiniSearch(
        users,
        searchTerm,
        ["name", "email", "username"],
        "id"
      )
    : null

  const now = new Date()

  return users.filter((user) => {
    const matchesSearch = matchingIds ? matchingIds.has(user.id) : true

    const matchesRole = filterRole === "all" || user.role === filterRole

    const banned = isUserBanned(user, now)

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && !banned) ||
      (filterStatus === "banned" && banned)

    return matchesSearch && matchesRole && matchesStatus
  })
}
