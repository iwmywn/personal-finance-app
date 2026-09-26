import MiniSearch from "minisearch"

import { localDateToUTCMidnight } from "@/lib/date"
import type {
  Budget,
  Category,
  Goal,
  RecurringTransaction,
  Transaction,
  User,
} from "@/lib/definitions"
import { calculateBudgetsStats, calculateGoalsStats } from "@/lib/statistics"
import { progressColorClass } from "@/lib/utils"

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

export function isDateRangeOverlapping(
  start: Date,
  end: Date | null | undefined,
  filterMonth: number | null,
  filterYear: number | null
): boolean {
  if (!filterMonth && !filterYear) return true

  if (filterYear && filterMonth) {
    const filterStart = new Date(Date.UTC(filterYear, filterMonth - 1, 1))
    const filterEnd = new Date(Date.UTC(filterYear, filterMonth, 1) - 1)

    return (
      start.getTime() <= filterEnd.getTime() &&
      (!end || end.getTime() >= filterStart.getTime())
    )
  }

  if (filterYear) {
    const filterStart = new Date(Date.UTC(filterYear, 0, 1))
    const filterEnd = new Date(Date.UTC(filterYear + 1, 0, 1) - 1)

    return (
      start.getTime() <= filterEnd.getTime() &&
      (!end || end.getTime() >= filterStart.getTime())
    )
  }

  if (filterMonth) {
    if (!end) return true

    const durationMonths =
      (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      (end.getUTCMonth() - start.getUTCMonth())
    if (durationMonths >= 11) return true

    const startM = start.getUTCMonth() + 1
    const endM = end.getUTCMonth() + 1

    if (startM <= endM) {
      return filterMonth >= startM && filterMonth <= endM
    } else {
      return filterMonth >= startM || filterMonth <= endM
    }
  }

  return true
}

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
  transactions: Transaction[]
): Budget[] {
  const {
    filterMonth = "all",
    filterYear = "all",
    filterCategoryKey = "all",
    filterProgress = "all",
    filterStatus = "all",
  } = filters

  const parsedMonth = filterMonth === "all" ? null : parseInt(filterMonth)
  const parsedYear = filterYear === "all" ? null : parseInt(filterYear)

  let filteredBudgets = budgets.filter((budget) => {
    const budgetStartDateOnly = new Date(budget.startDate)
    const budgetEndDateOnly = new Date(budget.endDate)

    const overlaps = isDateRangeOverlapping(
      budgetStartDateOnly,
      budgetEndDateOnly,
      parsedMonth,
      parsedYear
    )

    const matchesCategory =
      filterCategoryKey === "all" || budget.categoryKey === filterCategoryKey

    return overlaps && matchesCategory
  })

  if (filterStatus !== "all" || filterProgress !== "all") {
    const budgetsWithStats = calculateBudgetsStats(
      filteredBudgets,
      transactions
    )

    filteredBudgets = budgetsWithStats.filter((budget) => {
      const matchesStatus =
        filterStatus === "all" || budget.status === filterStatus

      let matchesProgress = true
      if (filterProgress === "gray") {
        matchesProgress = budget.progressColorClass === progressColorClass.gray
      }
      if (filterProgress === "green") {
        matchesProgress = budget.progressColorClass === progressColorClass.green
      }
      if (filterProgress === "yellow") {
        matchesProgress =
          budget.progressColorClass === progressColorClass.yellow
      }
      if (filterProgress === "red") {
        matchesProgress = budget.progressColorClass === progressColorClass.red
      }

      return matchesStatus && matchesProgress
    })
  }

  return filteredBudgets
}

export function filterGoals(
  goals: Goal[],
  filters: Filters,
  transactions: Transaction[]
): Goal[] {
  const {
    searchTerm = "",
    filterMonth = "all",
    filterYear = "all",
    filterStatus = "all",
    filterProgress = "all",
    filterCategoryKey = "all",
  } = filters

  const parsedMonth = filterMonth === "all" ? null : parseInt(filterMonth)
  const parsedYear = filterYear === "all" ? null : parseInt(filterYear)

  const matchingIds = searchTerm
    ? searchWithMiniSearch(goals, searchTerm, ["name"])
    : null

  let filteredGoals = goals.filter((goal) => {
    const goalStartDateOnly = new Date(goal.startDate)
    const goalEndDateOnly = new Date(goal.endDate)

    const matchesSearch = matchingIds ? matchingIds.has(goal._id) : true

    const overlaps = isDateRangeOverlapping(
      goalStartDateOnly,
      goalEndDateOnly,
      parsedMonth,
      parsedYear
    )

    const matchesCategory =
      filterCategoryKey === "all" || goal.categoryKey === filterCategoryKey

    return matchesSearch && overlaps && matchesCategory
  })

  if (filterStatus !== "all" || filterProgress !== "all") {
    const goalsWithStats = calculateGoalsStats(filteredGoals, transactions)

    filteredGoals = goalsWithStats.filter((goal) => {
      const matchesStatus =
        filterStatus === "all" || goal.status === filterStatus

      let matchesProgress = true
      if (filterProgress === "gray") {
        matchesProgress = goal.progressColorClass === progressColorClass.gray
      } else if (filterProgress === "green") {
        matchesProgress = goal.progressColorClass === progressColorClass.green
      } else if (filterProgress === "yellow") {
        matchesProgress = goal.progressColorClass === progressColorClass.yellow
      } else if (filterProgress === "red") {
        matchesProgress = goal.progressColorClass === progressColorClass.red
      }

      return matchesStatus && matchesProgress
    })
  }

  return filteredGoals
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

    const isEnded = Boolean(endDateOnly && todayUTC > endDateOnly)

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && !isEnded) ||
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

  return users.filter((user) => {
    const matchesSearch = matchingIds ? matchingIds.has(user.id) : true

    const matchesRole = filterRole === "all" || user.role === filterRole

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && !Boolean(user.banned)) ||
      (filterStatus === "banned" && Boolean(user.banned))

    return matchesSearch && matchesRole && matchesStatus
  })
}
