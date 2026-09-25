import Decimal from "decimal.js"

import type { CategoryKey } from "@/lib/category"
import type { Currency } from "@/lib/currency"
import { localDateToUTCMidnight, normalizeToUTCMidnight } from "@/lib/date"
import type { Budget, Goal, Transaction } from "@/lib/definitions"
import { convertAmountWithRates, progressColorClass } from "@/lib/utils"

export function getCurrentMonthTransactions(
  transactions: Transaction[],
  today?: Date
): Transaction[] {
  const todayUTC = today
    ? normalizeToUTCMidnight(today)
    : localDateToUTCMidnight(new Date())
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

interface QuickStats {
  currentMonthCount: number
  highestTransaction: Transaction | null
  lowestTransaction: Transaction | null
  avgOutflow: string | null
  savingsRate: string | null
  popularCategory: CategoryKey[]
}

export function calculateQuickStats(
  transactions: Transaction[],
  today?: Date
): QuickStats {
  const currentMonthTransactions = getCurrentMonthTransactions(
    transactions,
    today
  )

  const currentMonthCount = currentMonthTransactions.length

  if (currentMonthCount === 0) {
    return {
      currentMonthCount: 0,
      highestTransaction: null,
      lowestTransaction: null,
      avgOutflow: null,
      savingsRate: null,
      popularCategory: [],
    }
  }

  let highestTransaction = currentMonthTransactions[0]
  let lowestTransaction = currentMonthTransactions[0]
  let totalInflow = new Decimal(0)
  let totalOutflow = new Decimal(0)
  let outflowCount = 0
  const categorySums: Record<string, Decimal> = {}

  for (const t of currentMonthTransactions) {
    const amount = new Decimal(t.amount)

    if (amount.greaterThan(new Decimal(highestTransaction.amount))) {
      highestTransaction = t
    }
    if (amount.lessThan(new Decimal(lowestTransaction.amount))) {
      lowestTransaction = t
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
    outflowCount > 0 ? totalOutflow.dividedBy(outflowCount).toString() : null

  const savingsRate = totalInflow.greaterThan(0)
    ? totalInflow
        .minus(totalOutflow)
        .dividedBy(totalInflow)
        .mul(100)
        .toDecimalPlaces(1)
        .toString()
    : totalOutflow.greaterThan(0)
      ? "-100"
      : "0"

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
    highestTransaction,
    lowestTransaction,
    avgOutflow,
    savingsRate,
    popularCategory,
  }
}

interface SummaryStats {
  totalInflow: string
  totalOutflow: string
  balance: string
  transactionCount: number
  inflowCount: number
  outflowCount: number
}

export function calculateSummaryStats(
  transactions: Transaction[]
): SummaryStats {
  const inflowTransactions = transactions.filter((t) => t.type === "inflow")
  const outflowTransactions = transactions.filter((t) => t.type === "outflow")

  const totalInflow = inflowTransactions.reduce(
    (sum, t) => sum.plus(new Decimal(t.amount)),
    new Decimal(0)
  )
  const totalOutflow = outflowTransactions.reduce(
    (sum, t) => sum.plus(new Decimal(t.amount)),
    new Decimal(0)
  )
  const balance = totalInflow.minus(totalOutflow)
  const transactionCount = transactions.length
  const inflowCount = inflowTransactions.length
  const outflowCount = outflowTransactions.length

  return {
    totalInflow: totalInflow.toString(),
    totalOutflow: totalOutflow.toString(),
    balance: balance.toString(),
    transactionCount,
    inflowCount,
    outflowCount,
  }
}

interface CategoryStats {
  categoryKey: string
  count: number
  total: string
  type: "inflow" | "outflow"
}

export function calculateCategoriesStats(
  transactions: Transaction[]
): CategoryStats[] {
  const categories = Array.from(new Set(transactions.map((t) => t.categoryKey)))

  return categories
    .map((categoryKey) => {
      const filtered = transactions.filter((t) => t.categoryKey === categoryKey)
      const total = filtered.reduce(
        (sum, t) => sum.plus(new Decimal(t.amount)),
        new Decimal(0)
      )
      return {
        categoryKey,
        count: filtered.length,
        total: total.toString(),
        type: filtered[0].type,
      }
    })
    .sort((a, b) => {
      const aDecimal = new Decimal(a.total)
      const bDecimal = new Decimal(b.total)
      return bDecimal.greaterThan(aDecimal) ? 1 : -1
    })
}

interface StatBaseConfig<TBase, Transaction> {
  type: "inflow" | "outflow"
  getBaseTargetAmount: (item: TBase) => string
  getBaseCurrency: (item: TBase) => Currency
  getBaseCategoryKey: (item: TBase) => string
  getTransactionAmount: (t: Transaction) => string
  getTransactionOriginalAmount: (t: Transaction) => string | undefined
  getTransactionOriginalCurrency: (t: Transaction) => Currency | undefined
  getTransactionRates: (t: Transaction) => Record<Currency, string> | undefined
  pickColor: (percentage: number, hasItems: boolean) => string
}

function calculateStatsBase<TBase extends Budget | Goal>(
  base: TBase,
  transactions: Transaction[],
  config: StatBaseConfig<TBase, Transaction>
) {
  const startDateOnly = normalizeToUTCMidnight(new Date(base.startDate))
  const endDateOnly = normalizeToUTCMidnight(new Date(base.endDate))
  const nowDateOnly = localDateToUTCMidnight(new Date())

  const filtered = transactions.filter((t) => {
    if (t.type !== config.type) return false

    const transactionDateOnly = normalizeToUTCMidnight(new Date(t.date))

    return (
      transactionDateOnly.getTime() >= startDateOnly.getTime() &&
      transactionDateOnly.getTime() <= endDateOnly.getTime() &&
      t.categoryKey === config.getBaseCategoryKey(base)
    )
  })

  const targetCurrency = config.getBaseCurrency(base)

  const total = filtered.reduce((sum, t) => {
    const originalAmount = config.getTransactionOriginalAmount(t)
    const originalCurrency = config.getTransactionOriginalCurrency(t)
    const ratesStr = config.getTransactionRates(t)

    if (originalAmount && originalCurrency && ratesStr) {
      const converted = convertAmountWithRates(
        originalAmount,
        originalCurrency,
        targetCurrency,
        ratesStr
      )
      return sum.plus(converted)
    }

    const txCurrency = originalCurrency ?? t.currency
    if (txCurrency === targetCurrency) {
      const amountToAdd = originalAmount ?? config.getTransactionAmount(t)
      return sum.plus(new Decimal(amountToAdd))
    }

    if (t.currency === targetCurrency) {
      return sum.plus(new Decimal(config.getTransactionAmount(t)))
    }

    return sum
  }, new Decimal(0))

  const target = new Decimal(config.getBaseTargetAmount(base))
  const percentage = target.equals(0)
    ? 0
    : total.div(target).mul(100).toNumber()

  let status: "expired" | "active" | "upcoming"
  if (endDateOnly.getTime() < nowDateOnly.getTime()) {
    status = "expired"
  } else if (
    startDateOnly.getTime() <= nowDateOnly.getTime() &&
    endDateOnly.getTime() >= nowDateOnly.getTime()
  ) {
    status = "active"
  } else {
    status = "upcoming"
  }

  const colorClass = config.pickColor(percentage, filtered.length > 0)

  return { total: total.toString(), percentage, status, colorClass }
}

interface BudgetWithStats extends Budget {
  spent: string
  percentage: number
  progressColorClass: string
  status: "expired" | "active" | "upcoming"
}

export function calculateBudgetsStats(
  budgets: Budget[],
  transactions: Transaction[]
): BudgetWithStats[] {
  return budgets.map((budget) => {
    const stats = calculateStatsBase(budget, transactions, {
      type: "outflow",
      getBaseTargetAmount: (b) => b.allocatedAmount,
      getBaseCurrency: (b) => b.currency,
      getBaseCategoryKey: (b) => b.categoryKey,
      getTransactionAmount: (t) => t.amount,
      getTransactionOriginalAmount: (t) => t.originalAmount,
      getTransactionOriginalCurrency: (t) => t.originalCurrency,
      getTransactionRates: (t) => t.rates,
      pickColor: (percentage, has) => {
        if (!has) return progressColorClass.gray
        if (percentage < 75) return progressColorClass.green
        if (percentage < 100) return progressColorClass.yellow
        return progressColorClass.red
      },
    })

    return {
      ...budget,
      spent: stats.total,
      percentage: stats.percentage,
      status: stats.status,
      progressColorClass: stats.colorClass,
    }
  })
}

interface GoalWithStats extends Goal {
  accumulated: string
  percentage: number
  progressColorClass: string
  status: "expired" | "active" | "upcoming"
}

export function calculateGoalsStats(
  goals: Goal[],
  transactions: Transaction[]
): GoalWithStats[] {
  return goals.map((goal) => {
    const stats = calculateStatsBase(goal, transactions, {
      type: "inflow",
      getBaseTargetAmount: (g) => g.targetAmount,
      getBaseCurrency: (g) => g.currency,
      getBaseCategoryKey: (g) => g.categoryKey,
      getTransactionAmount: (t) => t.amount,
      getTransactionOriginalAmount: (t) => t.originalAmount,
      getTransactionOriginalCurrency: (t) => t.originalCurrency,
      getTransactionRates: (t) => t.rates,
      pickColor: (percentage, has) => {
        if (!has) return progressColorClass.gray
        if (percentage >= 100) return progressColorClass.green
        if (percentage >= 75) return progressColorClass.yellow
        return progressColorClass.red
      },
    })

    return {
      ...goal,
      accumulated: stats.total,
      percentage: stats.percentage,
      status: stats.status,
      progressColorClass: stats.colorClass,
    }
  })
}
