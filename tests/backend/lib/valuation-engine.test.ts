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

    it("should return 0 percentage when allocatedAmount is 0", () => {
      const zeroBudget: Budget = {
        _id: "b-zero",
        userId: "u1",
        categoryKey: "food_beverage",
        allocatedAmount: "0",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      }

      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )
      const valuation = engine.evaluateBudget(zeroBudget)

      expect(valuation.percentage).toBe(0)
      expect(valuation.remaining.toString()).toBe("-80")
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

    it("should determine expired and upcoming statuses for goals", () => {
      const expiredGoal: Goal = {
        _id: "g-past",
        userId: "u1",
        name: "Past Goal",
        categoryKey: "salary_bonus",
        targetAmount: "1000",
        currency: "USD",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-01-31T23:59:59.999Z"),
      }
      const upcomingGoal: Goal = {
        _id: "g-future",
        userId: "u1",
        name: "Future Goal",
        categoryKey: "salary_bonus",
        targetAmount: "1000",
        currency: "USD",
        startDate: new Date("2026-08-01T00:00:00.000Z"),
        endDate: new Date("2026-08-31T23:59:59.999Z"),
      }

      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )

      expect(engine.evaluateGoal(expiredGoal).status).toBe("expired")
      expect(engine.evaluateGoal(upcomingGoal).status).toBe("upcoming")
    })

    it("should return 0 percentage when targetAmount is 0", () => {
      const zeroTargetGoal: Goal = {
        _id: "g-zero",
        userId: "u1",
        name: "Zero Target Goal",
        categoryKey: "salary_bonus",
        targetAmount: "0",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      }

      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )
      const valuation = engine.evaluateGoal(zeroTargetGoal)

      expect(valuation.percentage).toBe(0)
      expect(valuation.remaining.toString()).toBe("-2000")
      expect(valuation.health).toBe("exceeded")
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

    const goals: Goal[] = [
      {
        _id: "g-1",
        userId: "u1",
        name: "Vacation Fund",
        categoryKey: "salary_bonus",
        targetAmount: "1000",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      },
      {
        _id: "g-2",
        userId: "u1",
        name: "Car Savings",
        categoryKey: "housing",
        targetAmount: "5000",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      },
    ]

    it("should filter budgets by category", () => {
      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )

      const foodResults = engine.evaluateBudgets(budgets, {
        filterCategoryKey: "food_beverage",
      })
      expect(foodResults).toHaveLength(1)
      expect(foodResults[0].budget._id).toBe("b-food")

      expect(
        engine.evaluateBudgets(budgets, { filterCategoryKey: "all" })
      ).toHaveLength(2)
    })

    it("should filter budgets by month and year overlap", () => {
      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )

      expect(
        engine.evaluateBudgets(budgets, {
          filterMonth: "5",
          filterYear: "2026",
        })
      ).toHaveLength(2)
      expect(
        engine.evaluateBudgets(budgets, {
          filterMonth: "1",
          filterYear: "2026",
        })
      ).toHaveLength(0)
      expect(
        engine.evaluateBudgets(budgets, {
          filterMonth: "all",
          filterYear: "all",
        })
      ).toHaveLength(2)
    })

    it("should filter budgets by schedule status", () => {
      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )

      expect(
        engine.evaluateBudgets(budgets, { filterStatus: "active" })
      ).toHaveLength(2)
      expect(
        engine.evaluateBudgets(budgets, { filterStatus: "expired" })
      ).toHaveLength(0)
      expect(
        engine.evaluateBudgets(budgets, { filterStatus: "all" })
      ).toHaveLength(2)
    })

    it("should filter budgets by rollup health", () => {
      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )

      const onTrackResults = engine.evaluateBudgets(budgets, {
        filterHealth: "on_track",
      })
      expect(onTrackResults).toHaveLength(1)
      expect(onTrackResults[0].budget._id).toBe("b-food")

      const warningResults = engine.evaluateBudgets(budgets, {
        filterHealth: "warning",
      })
      expect(warningResults).toHaveLength(1)
      expect(warningResults[0].budget._id).toBe("b-housing")

      expect(
        engine.evaluateBudgets(budgets, { filterHealth: "exceeded" })
      ).toHaveLength(0)
      expect(
        engine.evaluateBudgets(budgets, { filterHealth: "unstarted" })
      ).toHaveLength(0)
      expect(
        engine.evaluateBudgets(budgets, { filterHealth: "all" })
      ).toHaveLength(2)
    })

    it("should filter goals by category", () => {
      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )

      const categoryResults = engine.evaluateGoals(goals, {
        filterCategoryKey: "salary_bonus",
      })
      expect(categoryResults).toHaveLength(1)
      expect(categoryResults[0].goal.name).toBe("Vacation Fund")

      expect(
        engine.evaluateGoals(goals, { filterCategoryKey: "all" })
      ).toHaveLength(2)
    })

    it("should filter goals by month and year overlap", () => {
      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )

      expect(
        engine.evaluateGoals(goals, { filterMonth: "5", filterYear: "2026" })
      ).toHaveLength(2)
      expect(
        engine.evaluateGoals(goals, { filterMonth: "1", filterYear: "2026" })
      ).toHaveLength(0)
      expect(
        engine.evaluateGoals(goals, { filterMonth: "all", filterYear: "all" })
      ).toHaveLength(2)
    })

    it("should filter goals by schedule status and rollup health", () => {
      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )

      expect(
        engine.evaluateGoals(goals, { filterStatus: "active" })
      ).toHaveLength(2)
      expect(
        engine.evaluateGoals(goals, { filterStatus: "expired" })
      ).toHaveLength(0)
      expect(engine.evaluateGoals(goals, { filterStatus: "all" })).toHaveLength(
        2
      )

      const healthResults = engine.evaluateGoals(goals, {
        filterHealth: "on_track",
      })
      expect(healthResults).toHaveLength(1)
      expect(healthResults[0].goal.name).toBe("Vacation Fund")
      expect(engine.evaluateGoals(goals, { filterHealth: "all" })).toHaveLength(
        2
      )
    })

    it("should filter goals by searchTerm with prefix and multi-word matching", () => {
      const searchableGoals: Goal[] = [
        {
          _id: "g-1",
          userId: "u1",
          name: "Trip to Tokyo Vacation",
          categoryKey: "salary_bonus",
          targetAmount: "1000",
          currency: "USD",
          startDate: new Date("2026-05-01T00:00:00.000Z"),
          endDate: new Date("2026-05-31T23:59:59.999Z"),
        },
        {
          _id: "g-2",
          userId: "u1",
          name: "Emergency Rainy Day Fund",
          categoryKey: "housing",
          targetAmount: "5000",
          currency: "USD",
          startDate: new Date("2026-05-01T00:00:00.000Z"),
          endDate: new Date("2026-05-31T23:59:59.999Z"),
        },
      ]

      const engine = new FinancialRollupEngine(
        sampleTransactions,
        defaultOptions
      )

      expect(
        engine.evaluateGoals(searchableGoals, { searchTerm: "" })
      ).toHaveLength(2)
      expect(
        engine.evaluateGoals(searchableGoals, { searchTerm: "   " })
      ).toHaveLength(2)

      const tokyo = engine.evaluateGoals(searchableGoals, {
        searchTerm: "tokyo",
      })
      expect(tokyo).toHaveLength(1)
      expect(tokyo[0].goal._id).toBe("g-1")

      const prefix = engine.evaluateGoals(searchableGoals, {
        searchTerm: "emerg",
      })
      expect(prefix).toHaveLength(1)
      expect(prefix[0].goal._id).toBe("g-2")

      const multiWord = engine.evaluateGoals(searchableGoals, {
        searchTerm: "fund emergency",
      })
      expect(multiWord).toHaveLength(1)
      expect(multiWord[0].goal._id).toBe("g-2")

      const nonMatchingCombination = engine.evaluateGoals(searchableGoals, {
        searchTerm: "tokyo emergency",
      })
      expect(nonMatchingCombination).toHaveLength(0)
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

    it("should count unconverted transactions without including them in totals", () => {
      const unconvertedTx: Transaction = {
        _id: "tx-unconv-summary",
        userId: "u1",
        type: "outflow",
        categoryKey: "food_beverage",
        amount: "500000",
        currency: "VND",
        description: "Unconverted VND",
        date: new Date("2026-05-10T12:00:00.000Z"),
      }
      const engine = new FinancialRollupEngine(
        [...sampleTransactions, unconvertedTx],
        {
          timeZone: "UTC",
          targetCurrency: "USD",
        }
      )
      const summary = engine.evaluatePeriodSummary()

      expect(summary.transactionCount).toBe(4)
      expect(summary.unconvertedCount).toBe(1)
      expect(summary.totalOutflow.toString()).toBe("580")
    })
  })

  describe("evaluateCategoryRollups", () => {
    it("should group amounts by category, skip unconverted transactions, and sort descending by total", () => {
      const unconvertedTx: Transaction = {
        _id: "tx-unconv-cat",
        userId: "u1",
        type: "outflow",
        categoryKey: "transportation",
        amount: "500000",
        currency: "VND",
        description: "Unconverted VND",
        date: new Date("2026-05-10T12:00:00.000Z"),
      }
      const engine = new FinancialRollupEngine(
        [...sampleTransactions, unconvertedTx],
        {
          timeZone: "UTC",
          targetCurrency: "USD",
        }
      )
      const breakdown = engine.evaluateCategoryRollups()

      expect(breakdown).toHaveLength(3)
      expect(breakdown[0].categoryKey).toBe("salary_bonus")
      expect(breakdown[0].total.toString()).toBe("2000")

      expect(breakdown[1].categoryKey).toBe("housing")
      expect(breakdown[1].total.toString()).toBe("500")

      expect(breakdown[2].categoryKey).toBe("food_beverage")
      expect(breakdown[2].total.toString()).toBe("80")
      expect(breakdown[2].count).toBe(2)
    })

    it("should handle tie break sort when categories have equal totals", () => {
      const txs: Transaction[] = [
        {
          _id: "t1",
          userId: "u1",
          type: "outflow",
          categoryKey: "housing",
          amount: "100",
          currency: "USD",
          description: "Rent",
          date: new Date("2026-05-01"),
        },
        {
          _id: "t2",
          userId: "u1",
          type: "outflow",
          categoryKey: "food_beverage",
          amount: "100",
          currency: "USD",
          description: "Food",
          date: new Date("2026-05-02"),
        },
      ]
      const engine = new FinancialRollupEngine(txs, { targetCurrency: "USD" })
      const breakdown = engine.evaluateCategoryRollups()
      expect(breakdown).toHaveLength(2)
      expect(breakdown[0].categoryKey).toBe("housing")
      expect(breakdown[0].total.toString()).toBe("100")
      expect(breakdown[1].categoryKey).toBe("food_beverage")
      expect(breakdown[1].total.toString()).toBe("100")
    })
  })

  describe("evaluateQuickStats edge cases", () => {
    it("should handle empty transactions list", () => {
      const engine = new FinancialRollupEngine([], defaultOptions)
      const stats = engine.evaluateQuickStats()
      expect(stats.currentMonthCount).toBe(0)
      expect(stats.highestTransaction).toBeNull()
      expect(stats.lowestTransaction).toBeNull()
      expect(stats.avgOutflow).toBeNull()
      expect(stats.savingsRate).toBeNull()
      expect(stats.popularCategory).toEqual([])
    })

    it("should handle unconverted transactions in current month", () => {
      const tx: Transaction = {
        _id: "tx-unconv",
        userId: "u1",
        type: "outflow",
        categoryKey: "food_beverage",
        amount: "50",
        currency: "VND",
        description: "Unconverted",
        date: new Date("2026-05-10T12:00:00.000Z"),
      }
      const engine = new FinancialRollupEngine([tx], {
        ...defaultOptions,
        targetCurrency: "USD",
      })
      const stats = engine.evaluateQuickStats()
      expect(stats.currentMonthCount).toBe(0)
      expect(stats.unconvertedCount).toBe(1)
    })

    it("should calculate savingsRate as -100 when only outflows exist and totalInflow is 0", () => {
      const tx: Transaction = {
        _id: "tx-out",
        userId: "u1",
        type: "outflow",
        categoryKey: "food_beverage",
        amount: "50",
        currency: "USD",
        description: "Outflow only",
        date: new Date("2026-05-10T12:00:00.000Z"),
      }
      const engine = new FinancialRollupEngine([tx], defaultOptions)
      const stats = engine.evaluateQuickStats()
      expect(stats.savingsRate?.toString()).toBe("-100")
    })

    it("should return null for avgOutflow when only inflows exist", () => {
      const tx: Transaction = {
        _id: "tx-in",
        userId: "u1",
        type: "inflow",
        categoryKey: "salary_bonus",
        amount: "1000",
        currency: "USD",
        description: "Inflow only",
        date: new Date("2026-05-10T12:00:00.000Z"),
      }
      const engine = new FinancialRollupEngine([tx], defaultOptions)
      const stats = engine.evaluateQuickStats()
      expect(stats.avgOutflow).toBeNull()
      expect(stats.savingsRate?.toString()).toBe("100")
    })

    it("should calculate savingsRate as 0 and empty popularCategory when all current month transactions have 0 amount", () => {
      const zeroTx: Transaction = {
        _id: "tx-zero",
        userId: "u1",
        type: "outflow",
        categoryKey: "food_beverage",
        amount: "0",
        currency: "USD",
        description: "Zero outflow",
        date: new Date("2026-05-10T12:00:00.000Z"),
      }
      const engine = new FinancialRollupEngine([zeroTx], defaultOptions)
      const stats = engine.evaluateQuickStats()
      expect(stats.savingsRate?.toString()).toBe("0")
      expect(stats.popularCategory).toEqual([])
    })

    it("should return all tied categories in popularCategory when multiple outflow categories share the maximum total", () => {
      const tiedTxs: Transaction[] = [
        {
          _id: "tx-tie-1",
          userId: "u1",
          type: "outflow",
          categoryKey: "food_beverage",
          amount: "100",
          currency: "USD",
          description: "Food",
          date: new Date("2026-05-10T12:00:00.000Z"),
        },
        {
          _id: "tx-tie-2",
          userId: "u1",
          type: "outflow",
          categoryKey: "housing",
          amount: "100",
          currency: "USD",
          description: "Housing",
          date: new Date("2026-05-11T12:00:00.000Z"),
        },
      ]
      const engine = new FinancialRollupEngine(tiedTxs, defaultOptions)
      const stats = engine.evaluateQuickStats()
      expect(stats.popularCategory).toEqual(["food_beverage", "housing"])
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

    it("should evaluate schedule status relative to explicit timeZone", () => {
      vi.useFakeTimers()
      try {
        // 2026-05-01T02:00:00.000Z is still 2026-04-30 in America/New_York (UTC-4)
        vi.setSystemTime(new Date("2026-05-01T02:00:00.000Z"))
        const mayBudget: Budget = {
          _id: "b-may",
          userId: "u1",
          categoryKey: "food_beverage",
          allocatedAmount: "200",
          currency: "USD",
          startDate: new Date("2026-05-01T00:00:00.000Z"),
          endDate: new Date("2026-05-31T23:59:59.999Z"),
        }

        const nyEngine = new FinancialRollupEngine(sampleTransactions, {
          timeZone: "America/New_York",
        })
        expect(
          nyEngine.evaluateBudgets([mayBudget], { filterStatus: "upcoming" })
        ).toHaveLength(1)

        const utcEngine = new FinancialRollupEngine(sampleTransactions, {
          timeZone: "UTC",
        })
        expect(
          utcEngine.evaluateBudgets([mayBudget], { filterStatus: "active" })
        ).toHaveLength(1)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe("Rollup evaluation methods (evaluateQuickStats & evaluateCurrentMonthSummary)", () => {
    it("evaluateQuickStats computes quick stats correctly", () => {
      const engine = new FinancialRollupEngine(sampleTransactions, {
        asOfDate,
        targetCurrency: "USD",
        timeZone: "UTC",
      })
      const stats = engine.evaluateQuickStats()
      expect(stats.currentMonthCount).toBe(4)
      expect(stats.unconvertedCount).toBe(0)
      expect(stats.highestTransaction?._id).toBe("tx-4")
      expect(stats.lowestTransaction?._id).toBe("tx-2")
      expect(stats.popularCategory).toContain("housing")
    })

    it("evaluateCurrentMonthSummary computes summary only for current month transactions", () => {
      const mixedTransactions: Transaction[] = [
        ...sampleTransactions,
        {
          _id: "tx-old-inflow",
          userId: "u1",
          type: "inflow",
          amount: "5000",
          currency: "USD",
          description: "Old inflow",
          categoryKey: "salary_bonus",
          date: new Date("2023-12-15T00:00:00Z"),
        },
      ]
      const engine = new FinancialRollupEngine(mixedTransactions, {
        asOfDate,
        targetCurrency: "USD",
        timeZone: "UTC",
      })
      const summary = engine.evaluateCurrentMonthSummary()
      // Old inflow (5000) should be excluded
      expect(summary.totalInflow.toString()).toBe("2000")
      expect(summary.totalOutflow.toString()).toBe("580")
      expect(summary.balance.toString()).toBe("1420")
      expect(summary.inflowCount).toBe(1)
      expect(summary.outflowCount).toBe(3)
      expect(summary.transactionCount).toBe(4)
    })
  })

  describe("Multi-currency conversion and exact threshold boundaries", () => {
    const sampleRates = {
      USD: "1",
      CNY: "7.2",
      JPY: "150",
      KRW: "1350",
      VND: "25000",
    }

    const multiCurrencyTransactions: Transaction[] = [
      {
        _id: "tx-vnd-outflow",
        userId: "u1",
        type: "outflow",
        categoryKey: "food_beverage",
        amount: "1875000",
        currency: "VND",
        originalAmount: "1875000",
        originalCurrency: "VND",
        rates: sampleRates, // 75 USD
        description: "VND dinner",
        date: new Date("2026-05-10T12:00:00.000Z"),
      },
      {
        _id: "tx-vnd-inflow",
        userId: "u1",
        type: "inflow",
        categoryKey: "salary_bonus",
        amount: "18750000",
        currency: "VND",
        originalAmount: "18750000",
        originalCurrency: "VND",
        rates: sampleRates, // 750 USD
        description: "VND bonus",
        date: new Date("2026-05-12T12:00:00.000Z"),
      },
    ]

    it("converts foreign-currency outflow and classifies budget as warning at exact 75% boundary", () => {
      const engine = new FinancialRollupEngine(multiCurrencyTransactions, {
        asOfDate,
        targetCurrency: "USD",
        timeZone: "UTC",
      })
      const budget75: Budget = {
        _id: "b-75",
        userId: "u1",
        categoryKey: "food_beverage",
        allocatedAmount: "100",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      }

      const valuation = engine.evaluateBudget(budget75)

      expect(valuation.spent.toString()).toBe("75")
      expect(valuation.percentage).toBe(75)
      expect(valuation.health).toBe("warning")
    })

    it("classifies budget as exceeded at exact 100% boundary", () => {
      const engine = new FinancialRollupEngine(multiCurrencyTransactions, {
        asOfDate,
        targetCurrency: "USD",
        timeZone: "UTC",
      })
      const budget100: Budget = {
        _id: "b-100",
        userId: "u1",
        categoryKey: "food_beverage",
        allocatedAmount: "75",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      }

      const valuation = engine.evaluateBudget(budget100)

      expect(valuation.percentage).toBe(100)
      expect(valuation.health).toBe("exceeded")
    })

    it("converts foreign-currency inflow and classifies goal as on_track at exact 100% boundary", () => {
      const engine = new FinancialRollupEngine(multiCurrencyTransactions, {
        asOfDate,
        targetCurrency: "USD",
        timeZone: "UTC",
      })
      const goal100: Goal = {
        _id: "g-100",
        userId: "u1",
        name: "Exact 100% Goal",
        categoryKey: "salary_bonus",
        targetAmount: "750",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      }

      const valuation = engine.evaluateGoal(goal100)

      expect(valuation.accumulated.toString()).toBe("750")
      expect(valuation.percentage).toBe(100)
      expect(valuation.health).toBe("on_track")
    })

    it("classifies goal as warning at exact 75% boundary", () => {
      const engine = new FinancialRollupEngine(multiCurrencyTransactions, {
        asOfDate,
        targetCurrency: "USD",
        timeZone: "UTC",
      })
      const goal75: Goal = {
        _id: "g-75",
        userId: "u1",
        name: "Exact 75% Goal",
        categoryKey: "salary_bonus",
        targetAmount: "1000",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.999Z"),
      }

      const valuation = engine.evaluateGoal(goal75)

      expect(valuation.accumulated.toString()).toBe("750")
      expect(valuation.percentage).toBe(75)
      expect(valuation.health).toBe("warning")
    })

    it("converts foreign-currency transactions in evaluatePeriodSummary", () => {
      const engine = new FinancialRollupEngine(multiCurrencyTransactions, {
        asOfDate,
        targetCurrency: "USD",
        timeZone: "UTC",
      })

      const summary = engine.evaluatePeriodSummary()

      expect(summary.totalInflow.toString()).toBe("750")
      expect(summary.totalOutflow.toString()).toBe("75")
      expect(summary.balance.toString()).toBe("675")
    })

    it("converts foreign-currency transactions in evaluateCategoryRollups", () => {
      const engine = new FinancialRollupEngine(multiCurrencyTransactions, {
        asOfDate,
        targetCurrency: "USD",
        timeZone: "UTC",
      })

      const rollups = engine.evaluateCategoryRollups()

      expect(rollups).toHaveLength(2)
      expect(rollups[0].total.toString()).toBe("750")
      expect(rollups[1].total.toString()).toBe("75")
    })

    it("converts foreign-currency transactions in evaluateQuickStats", () => {
      const engine = new FinancialRollupEngine(multiCurrencyTransactions, {
        asOfDate,
        targetCurrency: "USD",
        timeZone: "UTC",
      })

      const quickStats = engine.evaluateQuickStats()

      expect(quickStats.highestTransaction?._id).toBe("tx-vnd-inflow")
      expect(quickStats.lowestTransaction?._id).toBe("tx-vnd-outflow")
      expect(quickStats.avgOutflow?.toString()).toBe("75")
      expect(quickStats.savingsRate?.toString()).toBe("90")
    })

    it("falls back to originalAmount when originalCurrency matches targetCurrency without rates", () => {
      const fallbackTx: Transaction = {
        _id: "tx-orig-match",
        userId: "u1",
        type: "outflow",
        categoryKey: "food_beverage",
        amount: "2500000",
        currency: "VND",
        originalAmount: "100",
        originalCurrency: "USD",
        description: "Original USD transaction displayed in VND",
        date: new Date("2026-05-10T12:00:00.000Z"),
      }

      const engine = new FinancialRollupEngine([fallbackTx], {
        asOfDate,
        targetCurrency: "USD",
        timeZone: "UTC",
      })
      const summary = engine.evaluatePeriodSummary()

      expect(summary.totalOutflow.toString()).toBe("100")
      expect(summary.unconvertedCount).toBe(0)
    })

    it("treats transaction as unconverted when rates object is missing targetCurrency rate", () => {
      const missingTargetRateTx: Transaction = {
        _id: "tx-missing-rate-key",
        userId: "u1",
        type: "outflow",
        categoryKey: "food_beverage",
        amount: "100000",
        currency: "VND",
        originalAmount: "100000",
        originalCurrency: "VND",
        rates: { USD: "1", CNY: "7.2", JPY: "", KRW: "1350", VND: "25000" },
        description: "Missing JPY rate",
        date: new Date("2026-05-10T12:00:00.000Z"),
      }

      const engine = new FinancialRollupEngine([missingTargetRateTx], {
        asOfDate,
        targetCurrency: "JPY",
        timeZone: "UTC",
      })
      const summary = engine.evaluatePeriodSummary()

      expect(summary.transactionCount).toBe(0)
      expect(summary.unconvertedCount).toBe(1)
      expect(summary.totalOutflow.toString()).toBe("0")
    })

    it("includes transactions on exact startDate and endDate boundaries and excludes 1 day outside", () => {
      const boundaryTransactions: Transaction[] = [
        {
          _id: "tx-before-start",
          userId: "u1",
          type: "outflow",
          categoryKey: "food_beverage",
          amount: "10",
          currency: "USD",
          description: "Day before start",
          date: new Date("2026-04-30T23:59:59.999Z"),
        },
        {
          _id: "tx-on-start",
          userId: "u1",
          type: "outflow",
          categoryKey: "food_beverage",
          amount: "25",
          currency: "USD",
          description: "On start date",
          date: new Date("2026-05-01T00:00:00.000Z"),
        },
        {
          _id: "tx-on-end",
          userId: "u1",
          type: "outflow",
          categoryKey: "food_beverage",
          amount: "35",
          currency: "USD",
          description: "On end date",
          date: new Date("2026-05-31T23:59:59.999Z"),
        },
        {
          _id: "tx-after-end",
          userId: "u1",
          type: "outflow",
          categoryKey: "food_beverage",
          amount: "40",
          currency: "USD",
          description: "Day after end",
          date: new Date("2026-06-01T00:00:00.000Z"),
        },
      ]

      const budget: Budget = {
        _id: "b-boundary",
        userId: "u1",
        categoryKey: "food_beverage",
        allocatedAmount: "100",
        currency: "USD",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T00:00:00.000Z"),
      }

      const startDayEngine = new FinancialRollupEngine(boundaryTransactions, {
        asOfDate: new Date("2026-05-01T00:00:00.000Z"),
        timeZone: "UTC",
      })
      const startValuation = startDayEngine.evaluateBudget(budget)
      expect(startValuation.spent.toString()).toBe("60")
      expect(startValuation.matchingTransactions.map((t) => t._id)).toEqual([
        "tx-on-start",
        "tx-on-end",
      ])
      expect(startValuation.status).toBe("active")

      const endDayEngine = new FinancialRollupEngine(boundaryTransactions, {
        asOfDate: new Date("2026-05-31T23:59:59.999Z"),
        timeZone: "UTC",
      })
      expect(endDayEngine.evaluateBudget(budget).status).toBe("active")
    })

    it("rounds fractional savingsRate to 1 decimal place", () => {
      const fractionalTxs: Transaction[] = [
        {
          _id: "tx-in-3000",
          userId: "u1",
          type: "inflow",
          categoryKey: "salary_bonus",
          amount: "3000",
          currency: "USD",
          description: "Inflow",
          date: new Date("2026-05-10T12:00:00.000Z"),
        },
        {
          _id: "tx-out-2000",
          userId: "u1",
          type: "outflow",
          categoryKey: "housing",
          amount: "2000",
          currency: "USD",
          description: "Outflow",
          date: new Date("2026-05-11T12:00:00.000Z"),
        },
      ]

      const engine = new FinancialRollupEngine(fractionalTxs, {
        asOfDate,
        targetCurrency: "USD",
        timeZone: "UTC",
      })

      expect(engine.evaluateQuickStats().savingsRate?.toString()).toBe("33.3")
    })
  })
})
