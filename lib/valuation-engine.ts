import Decimal from "decimal.js"

import type { CategoryKey } from "@/lib/category"
import { resolveTransactionAmount } from "@/lib/currency"
import type { Currency } from "@/lib/currency"
import {
  getTodayInTimezone,
  isDateRangeOverlapping,
  normalizeToUTCMidnight,
} from "@/lib/date"
import type { Budget, Goal, Transaction } from "@/lib/definitions"

export type RollupHealth = "unstarted" | "on_track" | "warning" | "exceeded"
export type ScheduleStatus = "upcoming" | "active" | "expired"

export interface ValuationOptions {
  timeZone?: string
  asOfDate?: Date
  targetCurrency?: Currency
}

export interface BudgetValuation {
  budget: Budget
  allocated: Decimal
  spent: Decimal
  remaining: Decimal
  percentage: number
  status: ScheduleStatus
  health: RollupHealth
  unconvertedCount: number
  matchingTransactions: Transaction[]
}

export interface GoalValuation {
  goal: Goal
  target: Decimal
  accumulated: Decimal
  remaining: Decimal
  percentage: number
  status: ScheduleStatus
  health: RollupHealth
  unconvertedCount: number
  matchingTransactions: Transaction[]
}

export interface PeriodSummaryValuation {
  totalInflow: Decimal
  totalOutflow: Decimal
  balance: Decimal
  transactionCount: number
  inflowCount: number
  outflowCount: number
  unconvertedCount: number
}

export interface CategoryRollupValuation {
  categoryKey: CategoryKey
  count: number
  total: Decimal
  type: "inflow" | "outflow"
}

export interface QuickStatsValuation {
  currentMonthCount: number
  unconvertedCount: number
  highestTransaction: Transaction | null
  lowestTransaction: Transaction | null
  avgOutflow: Decimal | null
  savingsRate: Decimal | null
  popularCategory: CategoryKey[]
}

export interface BudgetFilterCriteria {
  filterMonth?: string
  filterYear?: string
  filterCategoryKey?: string
  filterHealth?: "all" | RollupHealth | string
  filterStatus?: "all" | ScheduleStatus | string
}

export interface GoalFilterCriteria {
  filterMonth?: string
  filterYear?: string
  filterCategoryKey?: string
  filterHealth?: "all" | RollupHealth | string
  filterStatus?: "all" | ScheduleStatus | string
}

function normalizeHealthFilter(filter?: string): RollupHealth | "all" {
  if (!filter || filter === "all") return "all"
  if (filter === "gray" || filter === "unstarted") return "unstarted"
  if (filter === "green" || filter === "on_track") return "on_track"
  if (filter === "yellow" || filter === "warning") return "warning"
  if (filter === "red" || filter === "exceeded") return "exceeded"
  return "all"
}

/**
 * Deep financial valuation and rollup engine.
 * Encapsulates date-windowing, multi-currency valuation, schedule tracking,
 * pure domain health states, and single-pass filtering with explicit timezone parity.
 */
export class FinancialRollupEngine {
  private readonly todayUTC: Date
  private readonly targetCurrency?: Currency

  constructor(
    private readonly transactions: Transaction[],
    options: ValuationOptions
  ) {
    this.todayUTC = options.asOfDate
      ? normalizeToUTCMidnight(options.asOfDate)
      : getTodayInTimezone(options.timeZone)
    this.targetCurrency = options.targetCurrency
  }

  /**
   * Evaluates a single budget against realized outflow transactions.
   */
  evaluateBudget(budget: Budget): BudgetValuation {
    const startDateOnly = normalizeToUTCMidnight(new Date(budget.startDate))
    const endDateOnly = normalizeToUTCMidnight(new Date(budget.endDate))
    const budgetCurrency = budget.currency

    let spent = new Decimal(0)
    let unconvertedCount = 0
    const matchingTransactions: Transaction[] = []

    for (const t of this.transactions) {
      if (t.type !== "outflow" || t.categoryKey !== budget.categoryKey) {
        continue
      }

      const txDateOnly = normalizeToUTCMidnight(new Date(t.date))
      if (
        txDateOnly.getTime() < startDateOnly.getTime() ||
        txDateOnly.getTime() > endDateOnly.getTime()
      ) {
        continue
      }

      matchingTransactions.push(t)
      const amount = resolveTransactionAmount(t, budgetCurrency)
      if (amount !== null) {
        spent = spent.plus(amount)
      } else {
        unconvertedCount++
      }
    }

    const allocated = new Decimal(budget.allocatedAmount)
    const remaining = allocated.minus(spent)
    const percentage = allocated.equals(0)
      ? 0
      : spent.dividedBy(allocated).mul(100).toNumber()

    let status: ScheduleStatus
    if (endDateOnly.getTime() < this.todayUTC.getTime()) {
      status = "expired"
    } else if (startDateOnly.getTime() <= this.todayUTC.getTime()) {
      status = "active"
    } else {
      status = "upcoming"
    }

    const convertedCount = matchingTransactions.length - unconvertedCount

    let health: RollupHealth
    if (convertedCount === 0) {
      health = "unstarted"
    } else if (percentage < 75) {
      health = "on_track"
    } else if (percentage < 100) {
      health = "warning"
    } else {
      health = "exceeded"
    }

    return {
      budget,
      allocated,
      spent,
      remaining,
      percentage,
      status,
      health,
      unconvertedCount,
      matchingTransactions,
    }
  }

  /**
   * Evaluates multiple budgets in a single pass with optional filtering criteria.
   */
  evaluateBudgets(
    budgets: Budget[],
    filters?: BudgetFilterCriteria
  ): BudgetValuation[] {
    const parsedMonth =
      !filters?.filterMonth || filters.filterMonth === "all"
        ? null
        : parseInt(filters.filterMonth, 10)
    const parsedYear =
      !filters?.filterYear || filters.filterYear === "all"
        ? null
        : parseInt(filters.filterYear, 10)
    const expectedCategory =
      !filters?.filterCategoryKey || filters.filterCategoryKey === "all"
        ? null
        : filters.filterCategoryKey
    const expectedStatus =
      !filters?.filterStatus || filters.filterStatus === "all"
        ? null
        : filters.filterStatus
    const expectedHealth = normalizeHealthFilter(filters?.filterHealth)

    const results: BudgetValuation[] = []

    for (const budget of budgets) {
      if (expectedCategory && budget.categoryKey !== expectedCategory) {
        continue
      }

      if (parsedMonth !== null || parsedYear !== null) {
        const start = new Date(budget.startDate)
        const end = new Date(budget.endDate)
        if (!isDateRangeOverlapping(start, end, parsedMonth, parsedYear)) {
          continue
        }
      }

      const valuation = this.evaluateBudget(budget)

      if (expectedStatus && valuation.status !== expectedStatus) {
        continue
      }

      if (expectedHealth !== "all" && valuation.health !== expectedHealth) {
        continue
      }

      results.push(valuation)
    }

    return results
  }

  /**
   * Evaluates a single savings goal against realized inflow transactions.
   */
  evaluateGoal(goal: Goal): GoalValuation {
    const startDateOnly = normalizeToUTCMidnight(new Date(goal.startDate))
    const endDateOnly = normalizeToUTCMidnight(new Date(goal.endDate))
    const goalCurrency = goal.currency

    let accumulated = new Decimal(0)
    let unconvertedCount = 0
    const matchingTransactions: Transaction[] = []

    for (const t of this.transactions) {
      if (t.type !== "inflow" || t.categoryKey !== goal.categoryKey) {
        continue
      }

      const txDateOnly = normalizeToUTCMidnight(new Date(t.date))
      if (
        txDateOnly.getTime() < startDateOnly.getTime() ||
        txDateOnly.getTime() > endDateOnly.getTime()
      ) {
        continue
      }

      matchingTransactions.push(t)
      const amount = resolveTransactionAmount(t, goalCurrency)
      if (amount !== null) {
        accumulated = accumulated.plus(amount)
      } else {
        unconvertedCount++
      }
    }

    const target = new Decimal(goal.targetAmount)
    const remaining = target.minus(accumulated)
    const percentage = target.equals(0)
      ? 0
      : accumulated.dividedBy(target).mul(100).toNumber()

    let status: ScheduleStatus
    if (endDateOnly.getTime() < this.todayUTC.getTime()) {
      status = "expired"
    } else if (startDateOnly.getTime() <= this.todayUTC.getTime()) {
      status = "active"
    } else {
      status = "upcoming"
    }

    const convertedCount = matchingTransactions.length - unconvertedCount

    let health: RollupHealth
    if (convertedCount === 0) {
      health = "unstarted"
    } else if (percentage >= 100) {
      health = "on_track"
    } else if (percentage >= 75) {
      health = "warning"
    } else {
      health = "exceeded"
    }

    return {
      goal,
      target,
      accumulated,
      remaining,
      percentage,
      status,
      health,
      unconvertedCount,
      matchingTransactions,
    }
  }

  /**
   * Evaluates multiple goals in a single pass with optional filtering criteria.
   */
  evaluateGoals(goals: Goal[], filters?: GoalFilterCriteria): GoalValuation[] {
    const parsedMonth =
      !filters?.filterMonth || filters.filterMonth === "all"
        ? null
        : parseInt(filters.filterMonth, 10)
    const parsedYear =
      !filters?.filterYear || filters.filterYear === "all"
        ? null
        : parseInt(filters.filterYear, 10)
    const expectedCategory =
      !filters?.filterCategoryKey || filters.filterCategoryKey === "all"
        ? null
        : filters.filterCategoryKey
    const expectedStatus =
      !filters?.filterStatus || filters.filterStatus === "all"
        ? null
        : filters.filterStatus
    const expectedHealth = normalizeHealthFilter(filters?.filterHealth)

    const results: GoalValuation[] = []

    for (const goal of goals) {
      if (expectedCategory && goal.categoryKey !== expectedCategory) {
        continue
      }

      if (parsedMonth !== null || parsedYear !== null) {
        const start = new Date(goal.startDate)
        const end = new Date(goal.endDate)
        if (!isDateRangeOverlapping(start, end, parsedMonth, parsedYear)) {
          continue
        }
      }

      const valuation = this.evaluateGoal(goal)

      if (expectedStatus && valuation.status !== expectedStatus) {
        continue
      }

      if (expectedHealth !== "all" && valuation.health !== expectedHealth) {
        continue
      }

      results.push(valuation)
    }

    return results
  }

  /**
   * Evaluates period summary statistics (total inflow, outflow, balance, counts).
   */
  evaluatePeriodSummary(): PeriodSummaryValuation {
    let totalInflow = new Decimal(0)
    let totalOutflow = new Decimal(0)
    let inflowCount = 0
    let outflowCount = 0
    let unconvertedCount = 0
    let transactionCount = 0

    for (const t of this.transactions) {
      const amount = resolveTransactionAmount(t, this.targetCurrency)
      if (amount === null) {
        unconvertedCount++
        continue
      }

      transactionCount++
      if (t.type === "inflow") {
        totalInflow = totalInflow.plus(amount)
        inflowCount++
      } else if (t.type === "outflow") {
        totalOutflow = totalOutflow.plus(amount)
        outflowCount++
      }
    }

    return {
      totalInflow,
      totalOutflow,
      balance: totalInflow.minus(totalOutflow),
      transactionCount,
      inflowCount,
      outflowCount,
      unconvertedCount,
    }
  }

  /**
   * Evaluates category-level breakdown totals.
   */
  evaluateCategoryBreakdown(): CategoryRollupValuation[] {
    const categoryMap = new Map<
      string,
      { total: Decimal; count: number; type: "inflow" | "outflow" }
    >()

    for (const t of this.transactions) {
      const amount = resolveTransactionAmount(t, this.targetCurrency)
      if (amount === null) continue

      const existing = categoryMap.get(t.categoryKey)
      if (existing) {
        existing.total = existing.total.plus(amount)
        existing.count++
      } else {
        categoryMap.set(t.categoryKey, {
          total: amount,
          count: 1,
          type: t.type,
        })
      }
    }

    const results: CategoryRollupValuation[] = []
    for (const [categoryKey, data] of categoryMap.entries()) {
      results.push({
        categoryKey,
        count: data.count,
        total: data.total,
        type: data.type,
      })
    }

    return results.sort((a, b) => {
      if (b.total.greaterThan(a.total)) return 1
      if (b.total.lessThan(a.total)) return -1
      return 0
    })
  }

  /**
   * Evaluates month-to-date quick stats (highest, lowest, avg outflow, savings rate, popular categories).
   */
  evaluateQuickStats(): QuickStatsValuation {
    const currentMonth = this.todayUTC.getUTCMonth()
    const currentYear = this.todayUTC.getUTCFullYear()

    const currentMonthItems: { t: Transaction; amount: Decimal }[] = []
    let unconvertedCount = 0

    for (const t of this.transactions) {
      const date = new Date(t.date)
      if (
        date.getUTCMonth() !== currentMonth ||
        date.getUTCFullYear() !== currentYear
      ) {
        continue
      }

      const amount = resolveTransactionAmount(t, this.targetCurrency)
      if (amount !== null) {
        currentMonthItems.push({ t, amount })
      } else {
        unconvertedCount++
      }
    }

    const currentMonthCount = currentMonthItems.length
    if (currentMonthCount === 0) {
      return {
        currentMonthCount: 0,
        unconvertedCount,
        highestTransaction: null,
        lowestTransaction: null,
        avgOutflow: null,
        savingsRate: null,
        popularCategory: [],
      }
    }

    let highestItem = currentMonthItems[0]
    let lowestItem = currentMonthItems[0]
    let totalInflow = new Decimal(0)
    let totalOutflow = new Decimal(0)
    let outflowCount = 0
    const categorySums: Record<string, Decimal> = {}

    for (const item of currentMonthItems) {
      const { t, amount } = item

      if (amount.greaterThan(highestItem.amount)) {
        highestItem = item
      }
      if (amount.lessThan(lowestItem.amount)) {
        lowestItem = item
      }

      if (t.type === "inflow") {
        totalInflow = totalInflow.plus(amount)
      } else if (t.type === "outflow") {
        totalOutflow = totalOutflow.plus(amount)
        outflowCount++
        categorySums[t.categoryKey] = (
          categorySums[t.categoryKey] || new Decimal(0)
        ).plus(amount)
      }
    }

    const avgOutflow =
      outflowCount > 0 ? totalOutflow.dividedBy(outflowCount) : null

    const savingsRate = totalInflow.greaterThan(0)
      ? totalInflow
          .minus(totalOutflow)
          .dividedBy(totalInflow)
          .mul(100)
          .toDecimalPlaces(1)
      : totalOutflow.greaterThan(0)
        ? new Decimal(-100)
        : new Decimal(0)

    const maxTotal = Object.values(categorySums).reduce(
      (max, val) => (val.greaterThan(max) ? val : max),
      new Decimal(0)
    )

    const popularCategory = maxTotal.greaterThan(0)
      ? Object.entries(categorySums).reduce<CategoryKey[]>(
          (acc, [key, total]) => {
            if (total.equals(maxTotal)) acc.push(key as CategoryKey)
            return acc
          },
          []
        )
      : []

    return {
      currentMonthCount,
      unconvertedCount,
      highestTransaction: highestItem.t,
      lowestTransaction: lowestItem.t,
      avgOutflow,
      savingsRate,
      popularCategory,
    }
  }
}
