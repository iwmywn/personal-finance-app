import Decimal from "decimal.js"

import { mockBudgets, mockGoals, mockTransactions } from "@/tests/shared/data"
import type { Transaction } from "@/lib/definitions"
import {
  calculateBudgetsStats,
  calculateCategoriesStats,
  calculateGoalsStats,
  calculateQuickStats,
  calculateSummaryStats,
  getCurrentMonthTransactions,
} from "@/lib/statistics"
import { progressColorClass } from "@/lib/utils"

describe("Statistics", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe("getCurrentMonthTransactions", () => {
    beforeEach(() => {
      vi.setSystemTime(new Date("2024-01-26"))
    })

    it("should return only transactions from current month", () => {
      const result = getCurrentMonthTransactions(mockTransactions)

      expect(result).toHaveLength(5)
      expect(result.map((t) => t._id)).toEqual(["1", "2", "3", "4", "5"])
    })

    it("should return empty array when no transactions in current month", () => {
      const oldTransactions = mockTransactions.map((t) => ({
        ...t,
        date: new Date("2023-12-15"),
      }))

      const result = getCurrentMonthTransactions(oldTransactions)
      expect(result).toEqual([])
    })

    it("should handle transactions from different years", () => {
      const mixedTransactions: Transaction[] = [
        ...mockTransactions,
        {
          _id: "6",
          userId: "68f712e4cda4897217a05a1c",
          type: "inflow",
          amount: "200",
          currency: "VND",
          description: "Old inflow",
          categoryKey: "salary_bonus",
          date: new Date("2023-01-15"),
        },
      ]

      const result = getCurrentMonthTransactions(mixedTransactions)
      expect(result).toHaveLength(5)
      expect(result.map((t) => t._id)).toEqual(["1", "2", "3", "4", "5"])
    })

    it("should handle edge case dates correctly", () => {
      const result = getCurrentMonthTransactions(mockTransactions)
      expect(result).toHaveLength(5)
      expect(result.map((t) => t._id)).toEqual(["1", "2", "3", "4", "5"])
    })
  })

  describe("calculateQuickStats", () => {
    beforeEach(() => {
      vi.setSystemTime(new Date("2024-01-26"))
    })

    it("should calculate all quick stats correctly", () => {
      const result = calculateQuickStats(mockTransactions)

      expect(result.currentMonthCount).toBe(5)
      expect(result.highestTransaction).toEqual(mockTransactions[0])
      expect(result.lowestTransaction).toEqual(mockTransactions[3])
      expect(result.avgOutflow).toBe("200")
      expect(result.savingsRate).toBe("60")
      expect(result.popularCategory).toEqual(["housing"])
    })

    it("should handle empty transactions", () => {
      const result = calculateQuickStats([])

      expect(result.currentMonthCount).toBe(0)
      expect(result.highestTransaction).toBeNull()
      expect(result.lowestTransaction).toBeNull()
      expect(result.avgOutflow).toBeNull()
      expect(result.savingsRate).toBeNull()
      expect(result.popularCategory).toEqual([])
    })

    it("should calculate fractional savings rate without losing 1 decimal place precision", () => {
      const transactions = [
        {
          ...mockTransactions[0],
          type: "inflow" as const,
          amount: "3000",
        },
        {
          ...mockTransactions[1],
          type: "outflow" as const,
          amount: "2000",
        },
      ]
      // (3000 - 2000) / 3000 * 100 = 1000 / 3000 * 100 = 33.3333...% -> "33.3"
      const result = calculateQuickStats(transactions)
      expect(result.savingsRate).toBe("33.3")
    })

    it("should report -100 savings rate when there is only outflow and no inflow", () => {
      const transactions = [
        {
          ...mockTransactions[1],
          type: "outflow" as const,
          amount: "2000",
          categoryKey: "food_beverage",
        },
        {
          ...mockTransactions[3],
          type: "outflow" as const,
          amount: "500",
          categoryKey: "transportation",
        },
      ]
      const result = calculateQuickStats(transactions)
      expect(result.savingsRate).toBe("-100")
      expect(result.popularCategory).toEqual(["food_beverage"])
    })

    it("should report 100 savings rate and empty popularCategory when there is only inflow and no outflow", () => {
      const transactions = [
        {
          ...mockTransactions[0],
          type: "inflow" as const,
          amount: "5000",
          categoryKey: "salary_bonus",
        },
      ]
      const result = calculateQuickStats(transactions)
      expect(result.savingsRate).toBe("100")
      expect(result.popularCategory).toEqual([])
    })

    it("should filter by targetCurrency when provided", () => {
      const fixedDate = new Date("2026-03-15T12:00:00Z")
      const mixedTransactions = [
        {
          ...mockTransactions[0],
          date: fixedDate,
          currency: "USD" as const,
          amount: "100",
          type: "inflow" as const,
        },
        {
          ...mockTransactions[1],
          date: fixedDate,
          currency: "VND" as const,
          amount: "5000000",
          type: "outflow" as const,
        },
        {
          ...mockTransactions[2],
          date: fixedDate,
          currency: "USD" as const,
          amount: "40",
          type: "outflow" as const,
          categoryKey: "food_beverage" as const,
        },
      ]
      const result = calculateQuickStats(mixedTransactions, fixedDate, "USD")
      expect(result.currentMonthCount).toBe(2)
      expect(result.highestTransaction?.amount).toBe("100")
      expect(result.highestTransaction?.currency).toBe("USD")
      expect(result.lowestTransaction?.amount).toBe("40")
      expect(result.avgOutflow).toBe("40")
      expect(result.popularCategory).toEqual(["food_beverage"])
    })
  })

  describe("calculateSummaryStats", () => {
    it("should calculate summary stats correctly", () => {
      const result = calculateSummaryStats(mockTransactions)

      expect(result.totalInflow).toBe("1001500")
      expect(result.totalOutflow).toBe("3000600")
      expect(result.balance).toBe("-1999100")
      expect(result.transactionCount).toBe(9)
      expect(result.inflowCount).toBe(3)
      expect(result.outflowCount).toBe(6)
    })

    it("should handle empty transactions", () => {
      const result = calculateSummaryStats([])

      expect(result.totalInflow).toBe("0")
      expect(result.totalOutflow).toBe("0")
      expect(result.balance).toBe("0")
      expect(result.transactionCount).toBe(0)
      expect(result.inflowCount).toBe(0)
      expect(result.outflowCount).toBe(0)
    })

    it("should filter by targetCurrency when provided", () => {
      const mixedTransactions = [
        {
          ...mockTransactions[0],
          currency: "USD" as const,
          amount: "100",
          type: "inflow" as const,
        },
        {
          ...mockTransactions[1],
          currency: "VND" as const,
          amount: "50000",
          type: "inflow" as const,
        },
        {
          ...mockTransactions[2],
          currency: "USD" as const,
          amount: "30",
          type: "outflow" as const,
        },
      ]
      const result = calculateSummaryStats(mixedTransactions, "USD")
      expect(result.totalInflow).toBe("100")
      expect(result.totalOutflow).toBe("30")
      expect(result.balance).toBe("70")
      expect(result.transactionCount).toBe(2)
      expect(result.inflowCount).toBe(1)
      expect(result.outflowCount).toBe(1)
    })
  })

  describe("calculateCategoryStats", () => {
    it("should calculate category stats correctly", () => {
      const result = calculateCategoriesStats(mockTransactions)

      expect(result).toHaveLength(5)
      expect(result[0].categoryKey).toBe("housing")
      expect(result[0].count).toBe(2)
      expect(result[0].total).toBe("2100300")
      expect(result[0].type).toBe("outflow")
      expect(result[1].categoryKey).toBe("salary_bonus")
      expect(result[2].categoryKey).toBe("food_beverage")
      expect(result[3].categoryKey).toBe("transportation")
      expect(result[4].categoryKey).toBe("business_freelance")
    })

    it("should sort by total amount descending", () => {
      const result = calculateCategoriesStats(mockTransactions)

      for (let i = 0; i < result.length - 1; i++) {
        expect(Number(result[i].total)).toBeGreaterThanOrEqual(
          Number(result[i + 1].total)
        )
      }
    })

    it("should handle empty transactions", () => {
      const result = calculateCategoriesStats([])
      expect(result).toEqual([])
    })

    it("should handle equal totals without violating strict weak ordering", () => {
      const txs = [
        { ...mockTransactions[0], categoryKey: "housing", amount: "100" },
        {
          ...mockTransactions[1],
          categoryKey: "transportation",
          amount: "100",
        },
      ]
      const result = calculateCategoriesStats(txs)
      expect(result).toHaveLength(2)
      expect(result[0].total).toBe("100")
      expect(result[1].total).toBe("100")
    })

    it("should filter by targetCurrency when provided", () => {
      const mixedTxs = [
        {
          ...mockTransactions[0],
          categoryKey: "housing",
          amount: "100",
          currency: "USD" as const,
        },
        {
          ...mockTransactions[1],
          categoryKey: "housing",
          amount: "50000",
          currency: "VND" as const,
        },
      ]
      const result = calculateCategoriesStats(mixedTxs, "USD")
      expect(result).toHaveLength(1)
      expect(result[0].total).toBe("100")
      expect(result[0].count).toBe(1)
    })
  })

  describe("calculateBudgetsStats", () => {
    it("should calculate stats for all budgets", () => {
      const result = calculateBudgetsStats(mockBudgets, mockTransactions)

      expect(result).toHaveLength(mockBudgets.length)
      result.forEach((budgetWithStats, index) => {
        expect(budgetWithStats).toHaveProperty("spent")
        expect(budgetWithStats).toHaveProperty("percentage")
        expect(budgetWithStats).toHaveProperty("progressColorClass")
        expect(budgetWithStats).toHaveProperty("status")
        expect(budgetWithStats._id).toBe(mockBudgets[index]._id)
        expect(budgetWithStats.categoryKey).toBe(mockBudgets[index].categoryKey)
        expect(budgetWithStats.allocatedAmount).toBe(
          mockBudgets[index].allocatedAmount
        )
      })
    })

    it("should filter transactions by category and date range", () => {
      const budget = mockBudgets[0]
      const result = calculateBudgetsStats([budget], mockTransactions)[0]

      const matchingTransactions = mockTransactions.filter((t) => {
        if (t.type !== "outflow") return false
        const transactionDate = new Date(t.date)
        const startDate = new Date(budget.startDate)
        const endDate = new Date(budget.endDate)
        if (transactionDate < startDate || transactionDate > endDate) {
          return false
        }
        return t.categoryKey === budget.categoryKey
      })
      const expectedSpent = matchingTransactions.reduce(
        (sum, t) => new Decimal(sum).plus(new Decimal(t.amount)),
        new Decimal(0)
      )

      expect(result.spent).toBe(expectedSpent.toString())
    })

    it("should exclude inflow transactions", () => {
      const budget = mockBudgets[0]
      const result = calculateBudgetsStats([budget], mockTransactions)[0]

      expect(Number(result.spent)).toBeGreaterThanOrEqual(0)
    })

    it("should calculate percentage correctly", () => {
      const budget = mockBudgets[0]
      const result = calculateBudgetsStats([budget], mockTransactions)[0]

      const expectedPercentage =
        budget.allocatedAmount === "0"
          ? 0
          : new Decimal(result.spent)
              .dividedBy(new Decimal(budget.allocatedAmount))
              .times(100)
              .toNumber()
      expect(result.percentage).toBe(expectedPercentage)
    })

    it("should return 0 percentage when allocatedAmount is 0", () => {
      const budget = {
        ...mockBudgets[0],
        allocatedAmount: "0",
      }
      const result = calculateBudgetsStats([budget], mockTransactions)[0]

      expect(result.percentage).toBe(0)
    })

    it("should return 0 spent when no matching transactions", () => {
      const budget = {
        ...mockBudgets[0],
        categoryKey: "nonexistent_category",
      }
      const result = calculateBudgetsStats([budget], mockTransactions)[0]

      expect(result.spent).toBe("0")
      expect(result.percentage).toBe(0)
    })

    it("should exclude transactions outside date range", () => {
      const budget = mockBudgets[0]
      const startDate = new Date(budget.startDate)
      const endDate = new Date(budget.endDate)

      const transactions = [
        {
          ...mockTransactions[1],
          categoryKey: budget.categoryKey,
          date: new Date(startDate.getTime() - 86400000), // 1 day before
        },
        {
          ...mockTransactions[1],
          categoryKey: budget.categoryKey,
          date: new Date(endDate.getTime() + 86400000), // 1 day after
        },
      ]
      const result = calculateBudgetsStats([budget], transactions)[0]

      expect(result.spent).toBe("0")
    })

    it("should only count transactions with matching category", () => {
      const budget = mockBudgets[0]
      const startDate = new Date(budget.startDate)
      const transactions = [
        {
          ...mockTransactions[1],
          categoryKey: budget.categoryKey,
          amount: "100000",
          date: new Date(startDate),
        },
        {
          ...mockTransactions[1],
          categoryKey: "different_category",
          amount: "200000",
          date: new Date(startDate),
        },
      ]
      const result = calculateBudgetsStats([budget], transactions)[0]

      expect(result.spent).toBe("100000")
    })

    it("should correctly identify status (active, expired, upcoming)", () => {
      vi.setSystemTime(new Date(2024, 0, 15))
      const budgets = [
        {
          ...mockBudgets[0],
          startDate: new Date(2024, 0, 1),
          endDate: new Date(2024, 0, 28),
        },
        {
          ...mockBudgets[0],
          startDate: new Date(2023, 10, 1),
          endDate: new Date(2023, 11, 28),
        },
        {
          ...mockBudgets[0],
          startDate: new Date(2024, 1, 1),
          endDate: new Date(2024, 1, 28),
        },
      ]
      const result = calculateBudgetsStats(budgets, mockTransactions)

      expect(result[0].status).toBe("active")
      expect(result[1].status).toBe("expired")
      expect(result[2].status).toBe("upcoming")
    })

    it("should handle budget that starts or ends today", () => {
      const now = new Date()
      const budgets = [
        {
          ...mockBudgets[0],
          startDate: new Date(now),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        },
        {
          ...mockBudgets[0],
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now),
        },
      ]
      const result = calculateBudgetsStats(budgets, mockTransactions)

      expect(result[0].status).toBe("active")
      expect(result[1].status).toBe("active")
    })

    it("should return gray progress color when no transactions", () => {
      const budget = {
        ...mockBudgets[0],
        categoryKey: "nonexistent_category",
      }
      const result = calculateBudgetsStats([budget], mockTransactions)[0]

      expect(result.progressColorClass).toBe(progressColorClass.gray)
    })

    it("should return green progress color when percentage < 75 (budget)", () => {
      const budget = {
        ...mockBudgets[0],
        allocatedAmount: "1000000",
      }
      const transactions = [
        {
          ...mockTransactions[1],
          categoryKey: budget.categoryKey,
          amount: "500000", // 50% of budget
          date: new Date(budget.startDate),
        },
      ]
      const result = calculateBudgetsStats([budget], transactions)[0]

      expect(result.percentage).toBeLessThan(75)
      expect(result.progressColorClass).toBe(progressColorClass.green)
    })

    it("should return yellow progress color when percentage >= 75 and < 100 (budget)", () => {
      const budget = {
        ...mockBudgets[0],
        allocatedAmount: "1000000",
      }
      const transactions = [
        {
          ...mockTransactions[1],
          categoryKey: budget.categoryKey,
          amount: "800000", // 80% of budget
          date: new Date(budget.startDate),
        },
      ]
      const result = calculateBudgetsStats([budget], transactions)[0]

      expect(result.percentage).toBeGreaterThanOrEqual(75)
      expect(result.percentage).toBeLessThan(100)
      expect(result.progressColorClass).toBe(progressColorClass.yellow)
    })

    it("should return red progress color when percentage >= 100 (budget)", () => {
      const budget = {
        ...mockBudgets[0],
        allocatedAmount: "1000000",
      }
      const transactions = [
        {
          ...mockTransactions[1],
          categoryKey: budget.categoryKey,
          amount: "1200000", // 120% of budget
          date: new Date(budget.startDate),
        },
      ]
      const result = calculateBudgetsStats([budget], transactions)[0]

      expect(result.percentage).toBeGreaterThanOrEqual(100)
      expect(result.progressColorClass).toBe(progressColorClass.red)
    })

    it("should handle empty budgets array", () => {
      const result = calculateBudgetsStats([], mockTransactions)

      expect(result).toEqual([])
    })

    it("should handle empty transactions array", () => {
      const result = calculateBudgetsStats(mockBudgets, [])

      expect(result).toHaveLength(mockBudgets.length)
      result.forEach((budgetWithStats) => {
        expect(budgetWithStats.spent).toBe("0")
        expect(budgetWithStats.percentage).toBe(0)
        expect(budgetWithStats.progressColorClass).toBe(progressColorClass.gray)
      })
    })

    it("should skip transactions with mismatched currency when exchange rates are missing", () => {
      const budget = {
        ...mockBudgets[0],
        currency: "VND" as const,
        categoryKey: "food_beverage" as const,
        targetAmount: "1000000",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      }

      const transactions: Transaction[] = [
        {
          _id: "tx-usd",
          userId: budget.userId,
          type: "outflow",
          categoryKey: "food_beverage",
          amount: "50",
          currency: "USD",
          description: "Mismatched USD expense without rates",
          date: new Date("2024-01-15"),
        },
        {
          _id: "tx-vnd",
          userId: budget.userId,
          type: "outflow",
          categoryKey: "food_beverage",
          amount: "150000",
          currency: "VND",
          description: "Matching VND expense",
          date: new Date("2024-01-16"),
        },
      ]

      const result = calculateBudgetsStats([budget], transactions)
      expect(result[0].spent).toBe("150000")
    })
  })

  describe("calculateGoalsStats", () => {
    it("should calculate stats for all goals", () => {
      const result = calculateGoalsStats(mockGoals, mockTransactions)

      expect(result).toHaveLength(mockGoals.length)
      result.forEach((goalWithStats, index) => {
        expect(goalWithStats).toHaveProperty("accumulated")
        expect(goalWithStats).toHaveProperty("percentage")
        expect(goalWithStats).toHaveProperty("progressColorClass")
        expect(goalWithStats).toHaveProperty("status")
        expect(goalWithStats._id).toBe(mockGoals[index]._id)
        expect(goalWithStats.categoryKey).toBe(mockGoals[index].categoryKey)
        expect(goalWithStats.targetAmount).toBe(mockGoals[index].targetAmount)
      })
    })

    it("should filter transactions by category and date range", () => {
      const goal = mockGoals[0]
      const result = calculateGoalsStats([goal], mockTransactions)[0]

      const matchingTransactions = mockTransactions.filter((t) => {
        if (t.type !== "inflow") return false
        const transactionDate = new Date(t.date)
        const startDate = new Date(goal.startDate)
        const endDate = new Date(goal.endDate)
        if (transactionDate < startDate || transactionDate > endDate) {
          return false
        }
        return t.categoryKey === goal.categoryKey
      })
      const expectedAccumulated = matchingTransactions.reduce(
        (sum, t) => new Decimal(sum).plus(new Decimal(t.amount)),
        new Decimal(0)
      )

      expect(result.accumulated).toBe(expectedAccumulated.toString())
    })

    it("should exclude outflow transactions", () => {
      const goal = mockGoals[0]
      const result = calculateGoalsStats([goal], mockTransactions)[0]

      // Accumulated should not include outflow transactions
      expect(Number(result.accumulated)).toBeGreaterThanOrEqual(0)
    })

    it("should calculate percentage correctly", () => {
      const goal = mockGoals[0]
      const result = calculateGoalsStats([goal], mockTransactions)[0]

      const expectedPercentage =
        goal.targetAmount === "0"
          ? 0
          : new Decimal(result.accumulated)
              .dividedBy(new Decimal(goal.targetAmount))
              .times(100)
              .toNumber()
      expect(result.percentage).toBe(expectedPercentage)
    })

    it("should return 0 percentage when targetAmount is 0", () => {
      const goal = {
        ...mockGoals[0],
        targetAmount: "0",
      }
      const result = calculateGoalsStats([goal], mockTransactions)[0]

      expect(result.percentage).toBe(0)
    })

    it("should return 0 accumulated when no matching transactions", () => {
      const goal = {
        ...mockGoals[0],
        categoryKey: "nonexistent_category",
      }
      const result = calculateGoalsStats([goal], mockTransactions)[0]

      expect(result.accumulated).toBe("0")
      expect(result.percentage).toBe(0)
    })

    it("should exclude transactions outside date range", () => {
      const goal = mockGoals[0]
      const startDate = new Date(goal.startDate)
      const endDate = new Date(goal.endDate)

      const transactions = [
        {
          ...mockTransactions[2],
          categoryKey: goal.categoryKey,
          date: new Date(startDate.getTime() - 86400000), // 1 day before
        },
        {
          ...mockTransactions[2],
          categoryKey: goal.categoryKey,
          date: new Date(endDate.getTime() + 86400000), // 1 day after
        },
      ]
      const result = calculateGoalsStats([goal], transactions)[0]

      expect(result.accumulated).toBe("0")
    })

    it("should only count transactions with matching category", () => {
      const goal = mockGoals[0]
      const startDate = new Date(goal.startDate)
      const transactions = [
        {
          ...mockTransactions[2],
          categoryKey: goal.categoryKey,
          amount: "100000",
          date: new Date(startDate),
        },
        {
          ...mockTransactions[2],
          categoryKey: "different_category",
          amount: "200000",
          date: new Date(startDate),
        },
      ]
      const result = calculateGoalsStats([goal], transactions)[0]

      expect(result.accumulated).toBe("100000")
    })

    it("should correctly identify status (active, expired, upcoming)", () => {
      vi.setSystemTime(new Date(2024, 0, 15))
      const goals = [
        {
          ...mockGoals[0],
          startDate: new Date(2024, 0, 1),
          endDate: new Date(2024, 0, 28),
        },
        {
          ...mockGoals[0],
          startDate: new Date(2023, 10, 1),
          endDate: new Date(2023, 11, 28),
        },
        {
          ...mockGoals[0],
          startDate: new Date(2024, 1, 1),
          endDate: new Date(2024, 1, 28),
        },
      ]
      const result = calculateGoalsStats(goals, mockTransactions)

      expect(result[0].status).toBe("active")
      expect(result[1].status).toBe("expired")
      expect(result[2].status).toBe("upcoming")
    })

    it("should handle goal that starts or ends today", () => {
      const now = new Date()
      const goals = [
        {
          ...mockGoals[0],
          startDate: new Date(now),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        },
        {
          ...mockGoals[0],
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now),
        },
      ]
      const result = calculateGoalsStats(goals, mockTransactions)

      expect(result[0].status).toBe("active")
      expect(result[1].status).toBe("active")
    })

    it("should return gray progress color when no transactions", () => {
      const goal = {
        ...mockGoals[0],
        categoryKey: "nonexistent_category",
      }
      const result = calculateGoalsStats([goal], mockTransactions)[0]

      expect(result.progressColorClass).toBe(progressColorClass.gray)
    })

    it("should return red progress color when percentage < 75 (goal)", () => {
      const goal = {
        ...mockGoals[0],
        targetAmount: "1000000",
      }
      const transactions = [
        {
          ...mockTransactions[2],
          categoryKey: goal.categoryKey,
          amount: "500000", // 50% of goal
          date: new Date(goal.startDate),
        },
      ]
      const result = calculateGoalsStats([goal], transactions)[0]

      expect(result.percentage).toBeLessThan(75)
      expect(result.progressColorClass).toBe(progressColorClass.red)
    })

    it("should return yellow progress color when percentage >= 75 and < 100 (goal)", () => {
      const goal = {
        ...mockGoals[0],
        targetAmount: "1000000",
      }
      const transactions = [
        {
          ...mockTransactions[2],
          categoryKey: goal.categoryKey,
          amount: "800000", // 80% of goal
          date: new Date(goal.startDate),
        },
      ]
      const result = calculateGoalsStats([goal], transactions)[0]

      expect(result.percentage).toBeGreaterThanOrEqual(75)
      expect(result.percentage).toBeLessThan(100)
      expect(result.progressColorClass).toBe(progressColorClass.yellow)
    })

    it("should return green progress color when percentage >= 100 (goal)", () => {
      const goal = {
        ...mockGoals[0],
        targetAmount: "1000000",
      }
      const transactions = [
        {
          ...mockTransactions[2],
          categoryKey: goal.categoryKey,
          amount: "1200000", // 120% of goal
          date: new Date(goal.startDate),
        },
      ]
      const result = calculateGoalsStats([goal], transactions)[0]

      expect(result.percentage).toBeGreaterThanOrEqual(100)
      expect(result.progressColorClass).toBe(progressColorClass.green)
    })

    it("should handle empty goals array", () => {
      const result = calculateGoalsStats([], mockTransactions)

      expect(result).toEqual([])
    })

    it("should handle empty transactions array", () => {
      const result = calculateGoalsStats(mockGoals, [])

      expect(result).toHaveLength(mockGoals.length)
      result.forEach((goalWithStats) => {
        expect(goalWithStats.accumulated).toBe("0")
        expect(goalWithStats.percentage).toBe(0)
        expect(goalWithStats.progressColorClass).toBe(progressColorClass.gray)
      })
    })

    it("should correctly mark budget as active on the exact endDate", () => {
      vi.setSystemTime(new Date("2026-03-15T12:00:00.000Z"))
      const budget = {
        ...mockBudgets[0],
        startDate: new Date("2026-03-01T00:00:00.000Z"),
        endDate: new Date("2026-03-15T00:00:00.000Z"),
      }
      const transactions: Transaction[] = [
        {
          _id: "tx-end-boundary",
          userId: budget.userId,
          type: "outflow",
          amount: "50000",
          currency: budget.currency,
          description: "End day transaction",
          categoryKey: budget.categoryKey,
          date: new Date("2026-03-15T00:00:00.000Z"),
        },
      ]
      const [result] = calculateBudgetsStats([budget], transactions)
      expect(result.status).toBe("active")
      expect(result.spent).toBe("50000")
    })

    it("should correctly mark budget as active on the exact startDate", () => {
      vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"))
      const budget = {
        ...mockBudgets[0],
        startDate: new Date("2026-03-01T00:00:00.000Z"),
        endDate: new Date("2026-03-31T00:00:00.000Z"),
      }
      const transactions: Transaction[] = [
        {
          _id: "tx-start-boundary",
          userId: budget.userId,
          type: "outflow",
          amount: "30000",
          currency: budget.currency,
          description: "Start day transaction",
          categoryKey: budget.categoryKey,
          date: new Date("2026-03-01T00:00:00.000Z"),
        },
      ]
      const [result] = calculateBudgetsStats([budget], transactions)
      expect(result.status).toBe("active")
      expect(result.spent).toBe("30000")
    })

    it("should mark budget as expired when today is strictly after endDate", () => {
      vi.setSystemTime(new Date("2026-03-16T12:00:00.000Z"))
      const budget = {
        ...mockBudgets[0],
        startDate: new Date("2026-03-01T00:00:00.000Z"),
        endDate: new Date("2026-03-15T00:00:00.000Z"),
      }
      const [result] = calculateBudgetsStats([budget], [])
      expect(result.status).toBe("expired")
    })

    it("should mark budget as upcoming when today is strictly before startDate", () => {
      vi.setSystemTime(new Date("2026-02-28T12:00:00.000Z"))
      const budget = {
        ...mockBudgets[0],
        startDate: new Date("2026-03-01T00:00:00.000Z"),
        endDate: new Date("2026-03-15T00:00:00.000Z"),
      }
      const [result] = calculateBudgetsStats([budget], [])
      expect(result.status).toBe("upcoming")
    })

    it("should correctly convert transaction amount to budget currency when transaction has rates", () => {
      vi.setSystemTime(new Date("2026-03-10T00:00:00.000Z"))
      const budget = {
        ...mockBudgets[0],
        currency: "USD" as const,
        allocatedAmount: "200",
        startDate: new Date("2026-03-01T00:00:00.000Z"),
        endDate: new Date("2026-03-31T00:00:00.000Z"),
      }
      const transactions: Transaction[] = [
        {
          _id: "tx-vnd-to-usd",
          userId: budget.userId,
          type: "outflow",
          amount: "100",
          currency: "USD",
          originalAmount: "2500000",
          originalCurrency: "VND",
          rates: {
            USD: "1",
            VND: "25000",
            CNY: "7.2",
            JPY: "150",
            KRW: "1350",
          },
          description: "Shopping",
          categoryKey: budget.categoryKey,
          date: new Date("2026-03-05T00:00:00.000Z"),
        },
      ]
      const [result] = calculateBudgetsStats([budget], transactions)
      expect(result.spent).toBe("100")
      expect(result.percentage).toBe(50)
    })
  })
})
