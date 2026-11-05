import type { CategoryKey } from "@/lib/category"
import type { Currency } from "@/lib/currency"
import { getTodayInTimezone, normalizeToUTCMidnight } from "@/lib/date"
import type { Budget, Goal, Transaction } from "@/lib/definitions"
import { getRollupHealthClass } from "@/lib/utils"
import { FinancialRollupEngine } from "@/lib/valuation-engine"
import type { RollupHealth } from "@/lib/valuation-engine"

export * from "@/lib/valuation-engine"

export function getCurrentMonthTransactions(
  transactions: Transaction[],
  today?: Date,
  timeZone?: string
): Transaction[] {
  const todayUTC = today
    ? normalizeToUTCMidnight(today)
    : getTodayInTimezone(timeZone)
  const currentMonth = todayUTC.getUTCMonth()
  const currentYear = todayUTC.getUTCFullYear()

  return transactions.filter((t) => {
    const date = new Date(t.date)
    return (
      date.getUTCMonth() === currentMonth &&
      date.getUTCFullYear() === currentYear
    )
  })
}

export type QuickStats = {
  currentMonthCount: number
  unconvertedCount: number
  highestTransaction: Transaction | null
  lowestTransaction: Transaction | null
  avgOutflow: string | null
  savingsRate: string | null
  popularCategory: CategoryKey[]
}

export function calculateQuickStats(
  transactions: Transaction[],
  today?: Date,
  targetCurrency?: Currency,
  timeZone?: string
): QuickStats {
  const engine = new FinancialRollupEngine(transactions, {
    asOfDate: today,
    targetCurrency,
    timeZone,
  })
  const stats = engine.evaluateQuickStats()

  return {
    currentMonthCount: stats.currentMonthCount,
    unconvertedCount: stats.unconvertedCount,
    highestTransaction: stats.highestTransaction,
    lowestTransaction: stats.lowestTransaction,
    avgOutflow: stats.avgOutflow ? stats.avgOutflow.toString() : null,
    savingsRate: stats.savingsRate ? stats.savingsRate.toString() : null,
    popularCategory: stats.popularCategory,
  }
}

export interface SummaryStats {
  totalInflow: string
  totalOutflow: string
  balance: string
  transactionCount: number
  inflowCount: number
  outflowCount: number
  unconvertedCount: number
}

export function calculateSummaryStats(
  transactions: Transaction[],
  targetCurrency?: Currency
): SummaryStats {
  const engine = new FinancialRollupEngine(transactions, {
    targetCurrency,
    timeZone: "UTC",
  })
  const summary = engine.evaluatePeriodSummary()

  return {
    totalInflow: summary.totalInflow.toString(),
    totalOutflow: summary.totalOutflow.toString(),
    balance: summary.balance.toString(),
    transactionCount: summary.transactionCount,
    inflowCount: summary.inflowCount,
    outflowCount: summary.outflowCount,
    unconvertedCount: summary.unconvertedCount,
  }
}

export interface CategoryStats {
  categoryKey: string
  count: number
  total: string
  type: "inflow" | "outflow"
}

export function calculateCategoriesStats(
  transactions: Transaction[],
  targetCurrency?: Currency
): CategoryStats[] {
  const engine = new FinancialRollupEngine(transactions, {
    targetCurrency,
    timeZone: "UTC",
  })
  const breakdown = engine.evaluateCategoryBreakdown()

  return breakdown.map((item) => ({
    categoryKey: item.categoryKey,
    count: item.count,
    total: item.total.toString(),
    type: item.type,
  }))
}

export interface BudgetWithStats extends Budget {
  spent: string
  percentage: number
  progressColorClass: string
  health: RollupHealth
  unconvertedCount: number
  status: "expired" | "active" | "upcoming"
}

export function calculateBudgetsStats(
  budgets: Budget[],
  transactions: Transaction[],
  timeZone?: string
): BudgetWithStats[] {
  const engine = new FinancialRollupEngine(transactions, {
    timeZone,
  })

  return budgets.map((budget) => {
    const valuation = engine.evaluateBudget(budget)
    return {
      ...budget,
      spent: valuation.spent.toString(),
      percentage: valuation.percentage,
      status: valuation.status,
      health: valuation.health,
      unconvertedCount: valuation.unconvertedCount,
      progressColorClass: getRollupHealthClass(valuation.health),
    }
  })
}

export interface GoalWithStats extends Goal {
  accumulated: string
  percentage: number
  progressColorClass: string
  health: RollupHealth
  unconvertedCount: number
  status: "expired" | "active" | "upcoming"
}

export function calculateGoalsStats(
  goals: Goal[],
  transactions: Transaction[],
  timeZone?: string
): GoalWithStats[] {
  const engine = new FinancialRollupEngine(transactions, {
    timeZone,
  })

  return goals.map((goal) => {
    const valuation = engine.evaluateGoal(goal)
    return {
      ...goal,
      accumulated: valuation.accumulated.toString(),
      percentage: valuation.percentage,
      status: valuation.status,
      health: valuation.health,
      unconvertedCount: valuation.unconvertedCount,
      progressColorClass: getRollupHealthClass(valuation.health),
    }
  })
}
