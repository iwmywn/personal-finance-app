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

type QuickStats = {
  currentMonthCount: number
  highestTransaction: Transaction | null
  lowestTransaction: Transaction | null
  avgOutflow: string | null
  savingsRate: string | null
  popularCategory: CategoryKey[]
}

function resolveTransactionAmount(
  t: Transaction,
  targetCurrency?: Currency
): Decimal | null {
  if (!targetCurrency || t.currency === targetCurrency) {
    return new Decimal(t.amount)
  }

  const originalAmount = t.originalAmount ?? t.amount
  const originalCurrency = (t.originalCurrency ?? t.currency) as Currency

  if (t.rates && originalCurrency && targetCurrency) {
    const rateFrom = t.rates[originalCurrency]
    const rateTo = t.rates[targetCurrency]
    if (rateFrom && rateTo) {
      return convertAmountWithRates(
        originalAmount,
        originalCurrency,
        targetCurrency,
        t.rates
      )
    }
  }

  return null
}

export function calculateQuickStats(
  transactions: Transaction[],
  today?: Date,
  targetCurrency?: Currency
): QuickStats {
  const convertedItems: { t: Transaction; amount: Decimal }[] = []

  for (const t of transactions) {
    const amount = resolveTransactionAmount(t, targetCurrency)
    if (amount !== null) {
      convertedItems.push({ t, amount })
    }
  }

  const todayUTC = today
    ? normalizeToUTCMidnight(today)
    : localDateToUTCMidnight(new Date())
  const currentMonth = todayUTC.getUTCMonth()
  const currentYear = todayUTC.getUTCFullYear()

  const currentMonthItems = convertedItems.filter((item) => {
    const date = new Date(item.t.date)
    return (
      date.getUTCMonth() === currentMonth &&
      date.getUTCFullYear() === currentYear
    )
  })

  const currentMonthCount = currentMonthItems.length

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
    highestTransaction: highestItem.t,
    lowestTransaction: lowestItem.t,
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
  transactions: Transaction[],
  targetCurrency?: Currency
): SummaryStats {
  const convertedItems: { t: Transaction; amount: Decimal }[] = []

  for (const t of transactions) {
    const amount = resolveTransactionAmount(t, targetCurrency)
    if (amount !== null) {
      convertedItems.push({ t, amount })
    }
  }

  const inflowTransactions = convertedItems.filter(
    (item) => item.t.type === "inflow"
  )
  const outflowTransactions = convertedItems.filter(
    (item) => item.t.type === "outflow"
  )

  const totalInflow = inflowTransactions.reduce(
    (sum, item) => sum.plus(item.amount),
    new Decimal(0)
  )
  const totalOutflow = outflowTransactions.reduce(
    (sum, item) => sum.plus(item.amount),
    new Decimal(0)
  )
  const balance = totalInflow.minus(totalOutflow)
  const transactionCount = convertedItems.length
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
  transactions: Transaction[],
  targetCurrency?: Currency
): CategoryStats[] {
  const convertedItems: { t: Transaction; amount: Decimal }[] = []

  for (const t of transactions) {
    const amount = resolveTransactionAmount(t, targetCurrency)
    if (amount !== null) {
      convertedItems.push({ t, amount })
    }
  }

  const categories = Array.from(
    new Set(convertedItems.map((item) => item.t.categoryKey))
  )

  return categories
    .map((categoryKey) => {
      const filtered = convertedItems.filter(
        (item) => item.t.categoryKey === categoryKey
      )
      const total = filtered.reduce(
        (sum, item) => sum.plus(item.amount),
        new Decimal(0)
      )
      return {
        categoryKey,
        count: filtered.length,
        total: total.toString(),
        type: filtered[0].t.type,
      }
    })
    .sort((a, b) => {
      const aDecimal = new Decimal(a.total)
      const bDecimal = new Decimal(b.total)
      if (bDecimal.greaterThan(aDecimal)) return 1
      if (bDecimal.lessThan(aDecimal)) return -1
      return 0
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
