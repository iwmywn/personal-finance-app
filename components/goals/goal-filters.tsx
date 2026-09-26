"use client"

import { useState } from "react"
import { SearchIcon, XIcon } from "lucide-react"
import { useExtracted } from "next-intl"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GoalsTable } from "@/components/goals/goals-table"
import { useGoals } from "@/contexts/goals-context"
import { useTransactions } from "@/contexts/transactions-context"
import { useCategory } from "@/hooks/use-category"
import { useMonths } from "@/hooks/use-months"
import { getUniqueDateRangeYears } from "@/lib/date"
import { filterGoals } from "@/lib/filters"

export function GoalFilters() {
  const { goals } = useGoals()
  const { transactions } = useTransactions()
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [filterMonth, setFilterMonth] = useState<string>("all")
  const [filterYear, setFilterYear] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<
    "all" | "expired" | "active" | "upcoming"
  >("all")
  const [filterProgress, setFilterProgress] = useState<
    "all" | "gray" | "green" | "yellow" | "red"
  >("all")
  const [filterCategoryKey, setFilterCategoryKey] = useState<string>("all")
  const t = useExtracted()
  const { getCategoriesByType } = useCategory()

  const allMonths = useMonths()
  const allYears = getUniqueDateRangeYears(goals)

  const hasActiveFilters =
    searchTerm !== "" ||
    filterMonth !== "all" ||
    filterYear !== "all" ||
    filterStatus !== "all" ||
    filterProgress !== "all" ||
    filterCategoryKey !== "all"

  const handleResetFilters = () => {
    setSearchTerm("")
    setFilterMonth("all")
    setFilterYear("all")
    setFilterStatus("all")
    setFilterProgress("all")
    setFilterCategoryKey("all")
  }

  const filteredGoals = filterGoals(
    goals,
    {
      searchTerm,
      filterMonth,
      filterYear,
      filterStatus,
      filterProgress,
      filterCategoryKey,
    },
    transactions
  )

  return (
    <>
      <Card>
        <CardContent>
          <div
            className={`grid md:grid-cols-[1fr_1fr] md:grid-rows-3 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr] lg:grid-rows-2 2xl:grid-cols-[1fr_1fr_1fr_1fr_1fr] 2xl:grid-rows-2 ${
              hasActiveFilters &&
              "md:grid-rows-3 lg:grid-rows-2 2xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]"
            } gap-4`}
          >
            <InputGroup
              className={`col-span-full ${searchTerm !== "" && "border-primary"}`}
            >
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t("Search goals...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    onClick={() => setSearchTerm("")}
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>

            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger
                className={`w-full justify-between font-normal ${filterMonth !== "all" && "border-primary"}`}
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
                {getCategoriesByType("inflow").map((category) => (
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
                  <SelectItem value="green">{t("Good (≥ 100%)")}</SelectItem>
                  <SelectItem value="yellow">{t("Low (75-100%)")}</SelectItem>
                  <SelectItem value="red">{t("Warning (< 75%)")}</SelectItem>
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

      <GoalsTable filteredGoals={filteredGoals} />
    </>
  )
}
