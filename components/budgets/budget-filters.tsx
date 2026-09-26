"use client"

import { useState } from "react"
import { useExtracted } from "next-intl"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BudgetsTable } from "@/components/budgets/budgets-table"
import { useBudgets } from "@/contexts/budgets-context"
import { useTransactions } from "@/contexts/transactions-context"
import { useCategory } from "@/hooks/use-category"
import { useMonths } from "@/hooks/use-months"
import { getUniqueDateRangeYears } from "@/lib/date"
import { filterBudgets } from "@/lib/filters"

export function BudgetFilters() {
  const { budgets } = useBudgets()
  const { transactions } = useTransactions()
  const [filterMonth, setFilterMonth] = useState<string>("all")
  const [filterYear, setFilterYear] = useState<string>("all")
  const [filterCategoryKey, setFilterCategoryKey] = useState<string>("all")
  const [filterProgress, setFilterProgress] = useState<
    "all" | "gray" | "green" | "yellow" | "red"
  >("all")
  const [filterStatus, setFilterStatus] = useState<
    "all" | "expired" | "active" | "upcoming"
  >("all")
  const t = useExtracted()
  const { getCategoriesByType } = useCategory()

  const allMonths = useMonths()
  const allYears = getUniqueDateRangeYears(budgets)

  const hasActiveFilters =
    filterMonth !== "all" ||
    filterYear !== "all" ||
    filterCategoryKey !== "all" ||
    filterProgress !== "all" ||
    filterStatus !== "all"

  const handleResetFilters = () => {
    setFilterMonth("all")
    setFilterYear("all")
    setFilterCategoryKey("all")
    setFilterProgress("all")
    setFilterStatus("all")
  }

  const filteredBudgets = filterBudgets(
    budgets,
    {
      filterMonth,
      filterYear,
      filterCategoryKey,
      filterProgress,
      filterStatus,
    },
    transactions
  )

  return (
    <>
      <Card>
        <CardContent>
          <div
            className={`grid md:grid-cols-[1fr_1fr] md:grid-rows-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr] lg:grid-rows-1 2xl:grid-cols-[1fr_1fr_1fr_1fr_1fr] 2xl:grid-rows-1 ${
              hasActiveFilters &&
              "md:grid-rows-2 lg:grid-rows-1 2xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]"
            } gap-4`}
          >
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger
                className={`w-full ${filterMonth !== "all" && "border-primary"}`}
              >
                <SelectValue placeholder={t("Month")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{t("All Months")}</SelectItem>
                  <SelectSeparator />
                  {allMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger
                className={`w-full ${filterYear !== "all" && "border-primary"}`}
              >
                <SelectValue placeholder={t("Year")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{t("All Years")}</SelectItem>
                  <SelectSeparator />
                  {allYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={filterCategoryKey}
              onValueChange={setFilterCategoryKey}
            >
              <SelectTrigger
                className={`w-full ${filterCategoryKey !== "all" && "border-primary"}`}
              >
                <SelectValue placeholder={t("Category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Categories")}</SelectItem>
                <SelectSeparator />
                {getCategoriesByType("outflow").map((category) => (
                  <SelectItem key={category.key} value={category.key}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterProgress}
              onValueChange={(
                value: "all" | "gray" | "green" | "yellow" | "red"
              ) => setFilterProgress(value)}
            >
              <SelectTrigger
                className={`w-full ${filterProgress !== "all" && "border-primary"}`}
              >
                <SelectValue placeholder={t("Progress")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{t("All Progress")}</SelectItem>
                  <SelectSeparator />
                  <SelectItem value="gray">{t("No Transactions")}</SelectItem>
                  <SelectItem value="green">{t("Good (< 75%)")}</SelectItem>
                  <SelectItem value="yellow">
                    {t("Warning (75-100%)")}
                  </SelectItem>
                  <SelectItem value="red">{t("Exceeded (≥ 100%)")}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={filterStatus}
              onValueChange={(
                value: "all" | "expired" | "active" | "upcoming"
              ) => setFilterStatus(value)}
            >
              <SelectTrigger
                className={`w-full ${filterStatus !== "all" && "border-primary"}`}
              >
                <SelectValue placeholder={t("Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{t("All Statuses")}</SelectItem>
                  <SelectSeparator />
                  <SelectItem value="expired">{t("Expired")}</SelectItem>
                  <SelectItem value="active">{t("Active")}</SelectItem>
                  <SelectItem value="upcoming">{t("Upcoming")}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="col-span-full 2xl:col-auto"
              >
                {t("Reset")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <BudgetsTable filteredBudgets={filteredBudgets} />
    </>
  )
}
