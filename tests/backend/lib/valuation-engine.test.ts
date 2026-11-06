import type { Budget, Goal, Transaction } from "@/lib/definitions"
import { FinancialRollupEngine } from "@/lib/valuation-engine"

describe("FinancialRollupEngine", () => {
  const asOfDate = new Date("2026-05-15T00:00:00.000Z")
  const defaultOptions = {
    timeZone: "UTC",
    asOfDate,
  }

  const sampleTransactions: Transaction[] = [
    {
      _id: "tx-1",
      userId: "u1",
      type: "outflow",
      categoryKey: "food_beverage",
      amount: "50",
      currency: "USD",
      description: "Groceries",
      date: new Date("2026-05-10T12:00:00.000Z"),
    },
    {
      _id: "tx-2",
      userId: "u1",
      type: "outflow",
      categoryKey: "food_beverage",
      amount: "30",
      currency: "USD",
      description: "Restaurant",
      date: new Date("2026-05-12T12:00:00.000Z"),
    },
    {
      _id: "tx-3",
      userId: "u1",
      type: "outflow",
      categoryKey: "housing",
      amount: "500",
      currency: "USD",
      description: "Rent",
      date: new Date("2026-05-01T12:00:00.000Z"),
    },
    {
      _id: "tx-4",
      userId: "u1",
      type: "inflow",
      categoryKey: "salary_bonus",
      amount: "2000",
      currency: "USD",
      description: "Monthly salary",
      date: new Date("2026-05-05T12:00:00.000Z"),
    },
  ]

  describe("evaluateBudget", () => {
    it("should evaluate spent amount, remaining, status and on_track health (<75%)", () => {
      const budget: Budget = {
        _id: "b-1",
        userId: "u1",
        categoryKey: "food_beverage",
        allocatedAmount: "200",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      }

      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )
      const valuation = engine.evaluateBudget(budget)

      expect(valuation.allocated.toString()).toBe("200")
      expect(valuation.spent.toString()).toBe("80") // 50 + 30
      expect(valuation.remaining.toString()).toBe("120")
      expect(valuation.percentage).toBe(40)
      expect(valuation.status).toBe("active")
      expect(valuation.health).toBe("on_track")
      expect(valuation.unconvertedCount).toBe(0)
      expect(valuation.matchingTransactions).toHaveLength(2)
    })

    it("should classify health as warning when spent is between 75% and 100%", () => {
      const budget: Budget = {
        _id: "b-warning",
        userId: "u1",
        categoryKey: "food_beverage",
        allocatedAmount: "100",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      }

      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )
      const valuation = engine.evaluateBudget(budget)

      expect(valuation.percentage).toBe(80) // 80 / 100 * 100
      expect(valuation.health).toBe("warning")
    })

    it("should classify health as exceeded when spent is >= 100%", () => {
      const budget: Budget = {
        _id: "b-exceeded",
        userId: "u1",
        categoryKey: "food_beverage",
        allocatedAmount: "70",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      }

      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )
      const valuation = engine.evaluateBudget(budget)

      expect(valuation.percentage).toBeGreaterThan(100)
      expect(valuation.health).toBe("exceeded")
    })

    it("should classify health as unstarted when there are no matching transactions", () => {
      const budget: Budget = {
        _id: "b-unstarted",
        userId: "u1",
        categoryKey: "transportation",
        allocatedAmount: "100",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      }

      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )
      const valuation = engine.evaluateBudget(budget)

      expect(valuation.spent.toString()).toBe("0")
      expect(valuation.percentage).toBe(0)
      expect(valuation.health).toBe("unstarted")
    })

    it("should classify health as unstarted when all matching transactions are unconverted", () => {
      const unconvertedTx: Transaction = {
        _id: "tx-unconverted",
        userId: "u1",
        type: "outflow",
        categoryKey: "transportation",
        amount: "500000",
        currency: "VND",
        description: "Taxi",
        date: new Date("2026-05-10T12:00:00.000Z"),
      }
      const budget: Budget = {
        _id: "b-unconverted",
        userId: "u1",
        categoryKey: "transportation",
        allocatedAmount: "100",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      }

      const engine = new FinancialRollupEngine([unconvertedTx], defaultOptions)
      const valuation = engine.evaluateBudget(budget)

      expect(valuation.spent.toString()).toBe("0")
      expect(valuation.percentage).toBe(0)
      expect(valuation.health).toBe("unstarted")
      expect(valuation.unconvertedCount).toBe(1)
      expect(valuation.matchingTransactions).toHaveLength(1)
    })

    it("should determine expired status when endDate is in the past", () => {
      const pastBudget: Budget = {
        _id: "b-past",
        userId: "u1",
        categoryKey: "food_beverage",
        allocatedAmount: "100",
        currency: "USD",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-01-31T23:59:59.999Z"),
      }

      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )
      const valuation = engine.evaluateBudget(pastBudget)

      expect(valuation.status).toBe("expired")
    })

    it("should determine upcoming status when startDate is in the future", () => {
      const futureBudget: Budget = {
        _id: "b-future",
        userId: "u1",
        categoryKey: "food_beverage",
        allocatedAmount: "100",
        currency: "USD",
        startDate: new Date("2026-08-01T00:00:00.000Z"),
        endDate: new Date("2026-08-31T23:59:59.999Z"),
      }

      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )
      const valuation = engine.evaluateBudget(futureBudget)

      expect(valuation.status).toBe("upcoming")
    })
  })

  describe("evaluateGoal", () => {
    it("should evaluate accumulated amount, percentage, and on_track health (>=100%)", () => {
      const goal: Goal = {
        _id: "g-1",
        userId: "u1",
        name: "Emergency Fund",
        categoryKey: "salary_bonus",
        targetAmount: "1500",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      }

      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )
      const valuation = engine.evaluateGoal(goal)

      expect(valuation.target.toString()).toBe("1500")
      expect(valuation.accumulated.toString()).toBe("2000")
      expect(valuation.percentage).toBeCloseTo(133.33, 1)
      expect(valuation.status).toBe("active")
      expect(valuation.health).toBe("on_track")
    })

    it("should classify goal health as warning when percentage is between 75% and 100%", () => {
      const goal: Goal = {
        _id: "g-warning",
        userId: "u1",
        name: "Save for laptop",
        categoryKey: "salary_bonus",
        targetAmount: "2500",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      }

      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )
      const valuation = engine.evaluateGoal(goal)

      expect(valuation.percentage).toBe(80) // 2000 / 2500
      expect(valuation.health).toBe("warning")
    })

    it("should classify goal health as exceeded (behind) when percentage is < 75%", () => {
      const goal: Goal = {
        _id: "g-behind",
        userId: "u1",
        name: "Buy car",
        categoryKey: "salary_bonus",
        targetAmount: "10000",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      }

      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )
      const valuation = engine.evaluateGoal(goal)

      expect(valuation.percentage).toBe(20)
      expect(valuation.health).toBe("exceeded")
    })

    it("should classify goal health as unstarted when all matching transactions are unconverted", () => {
      const unconvertedTx: Transaction = {
        _id: "tx-goal-unconverted",
        userId: "u1",
        type: "inflow",
        categoryKey: "salary_bonus",
        amount: "500000",
        currency: "VND",
        description: "Bonus",
        date: new Date("2026-05-10T12:00:00.000Z"),
      }
      const goal: Goal = {
        _id: "g-unconverted",
        userId: "u1",
        name: "Bonus Goal",
        categoryKey: "salary_bonus",
        targetAmount: "1000",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      }

      const engine = new FinancialRollupEngine([unconvertedTx], defaultOptions)
      const valuation = engine.evaluateGoal(goal)

      expect(valuation.accumulated.toString()).toBe("0")
      expect(valuation.percentage).toBe(0)
      expect(valuation.health).toBe("unstarted")
      expect(valuation.unconvertedCount).toBe(1)
      expect(valuation.matchingTransactions).toHaveLength(1)
    })
  })

  describe("Single-Pass Filtering (evaluateBudgets & evaluateGoals)", () => {
    const budgets: Budget[] = [
      {
        _id: "b-food",
        userId: "u1",
        categoryKey: "food_beverage",
        allocatedAmount: "200",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      },
      {
        _id: "b-housing",
        userId: "u1",
        categoryKey: "housing",
        allocatedAmount: "600",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      },
    ]

    it("should filter budgets by category and health in one pass", () => {
      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )

      const foodResults = engine.evaluateBudgets(budgets, {
        filterCategoryKey: "food_beverage",
      })
      expect(foodResults).toHaveLength(1)
      expect(foodResults[0].budget._id).toBe("b-food")

      const onTrackResults = engine.evaluateBudgets(budgets, {
        filterHealth: "on_track",
      })
      expect(onTrackResults).toHaveLength(1)
      expect(onTrackResults[0].budget._id).toBe("b-food")

      const warningResults = engine.evaluateBudgets(budgets, {
        filterHealth: "warning",
      })
      expect(warningResults).toHaveLength(1)
      expect(warningResults[0].budget._id).toBe("b-housing") // 500 / 600 = 83.3%
    })
  })

  describe("evaluatePeriodSummary", () => {
    it("should compute accurate inflows, outflows, balance, and counts", () => {
      const engine = new FinancialRollupEngine(sampleTransactions, {
        timeZone: "UTC",
        targetCurrency: "USD",
      })
      const summary = engine.evaluatePeriodSummary()

      expect(summary.totalInflow.toString()).toBe("2000")
      expect(summary.totalOutflow.toString()).toBe("580") // 50 + 30 + 500
      expect(summary.balance.toString()).toBe("1420")
      expect(summary.transactionCount).toBe(4)
      expect(summary.inflowCount).toBe(1)
      expect(summary.outflowCount).toBe(3)
      expect(summary.unconvertedCount).toBe(0)
    })
  })

  describe("evaluateCategoryBreakdown", () => {
    it("should group amounts by category and sort descending by total", () => {
      const engine = new FinancialRollupEngine(sampleTransactions, {
        timeZone: "UTC",
        targetCurrency: "USD",
      })
      const breakdown = engine.evaluateCategoryBreakdown()

      expect(breakdown[0].categoryKey).toBe("salary_bonus")
      expect(breakdown[0].total.toString()).toBe("2000")

      expect(breakdown[1].categoryKey).toBe("housing")
      expect(breakdown[1].total.toString()).toBe("500")

      expect(breakdown[2].categoryKey).toBe("food_beverage")
      expect(breakdown[2].total.toString()).toBe("80")
      expect(breakdown[2].count).toBe(2)
    })
  })

  describe("ValuationOptions timeZone behavior", () => {
    it("should allow timeZone to be omitted and preserve local date behavior", () => {
      vi.useFakeTimers()
      try {
        vi.setSystemTime(new Date(2026, 4, 15, 10, 0, 0))
        const engine = new FinancialRollupEngine(sampleTransactions, {
          targetCurrency: "USD",
        })
        const quickStats = engine.evaluateQuickStats()
        expect(quickStats.currentMonthCount).toBe(4)
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
