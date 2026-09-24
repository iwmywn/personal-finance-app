"use client"

import { useMemo, useState } from "react"
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
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RecurringTransactionsTable } from "@/components/recurring-transactions/recurring-transactions-table"
import { useRecurring } from "@/contexts/recurring-context"
import { useCategory } from "@/hooks/use-category"
import { useMonths } from "@/hooks/use-months"
import { localDateToUTCMidnight } from "@/lib/date"
import { filterRecurringTransactions } from "@/lib/filters"
import { getUniqueDateRangeYears } from "@/lib/utils"

export function RecurringTransactionFilters() {
  const { recurringTransactions } = useRecurring()
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [filterMonth, setFilterMonth] = useState<string>("all")
  const [filterYear, setFilterYear] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all")
  const [filterCategoryKey, setFilterCategoryKey] = useState<string>("all")
  const t = useExtracted()
  const { getCategoriesByType } = useCategory()

  const allMonths = useMonths()
  const allYears = getUniqueDateRangeYears(recurringTransactions)

  const hasActiveFilters =
    searchTerm !== "" ||
    filterMonth !== "all" ||
    filterYear !== "all" ||
    filterType !== "all" ||
    filterStatus !== "all" ||
    filterCategoryKey !== "all"

  const handleResetFilters = () => {
    setSearchTerm("")
    setFilterMonth("all")
    setFilterYear("all")
    setFilterType("all")
    setFilterStatus("all")
    setFilterCategoryKey("all")
  }

  const todayUTC = useMemo(() => localDateToUTCMidnight(new Date()), [])

  const filteredRecurring = filterRecurringTransactions(recurringTransactions, {
    searchTerm,
    filterMonth,
    filterYear,
    filterType,
    filterStatus,
    filterCategoryKey,
    todayUTC,
  })

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
                placeholder={t("Search recurring transactions...")}
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

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger
                className={`w-full ${filterType !== "all" && "border-primary"}`}
              >
                <SelectValue placeholder={t("Type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{t("All Types")}</SelectItem>
                  <SelectSeparator />
                  <SelectItem value="inflow">{t("Inflow")}</SelectItem>
                  <SelectItem value="outflow">{t("Outflow")}</SelectItem>
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
                <SelectGroup>
                  <SelectItem value="all">{t("All Categories")}</SelectItem>
                  <SelectSeparator />
                  <SelectLabel>{t("Inflow")}</SelectLabel>
                  {getCategoriesByType("inflow").map((category) => (
                    <SelectItem key={category.key} value={category.key}>
                      {category.label}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectLabel>{t("Outflow")}</SelectLabel>
                  {getCategoriesByType("outflow").map((category) => (
                    <SelectItem key={category.key} value={category.key}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={filterStatus}
              onValueChange={(value: "all" | "active" | "inactive") =>
                setFilterStatus(value)
              }
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
                  <SelectItem value="active">{t("Active")}</SelectItem>
                  <SelectItem value="inactive">{t("Inactive")}</SelectItem>
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

      <RecurringTransactionsTable filteredRecurring={filteredRecurring} />
    </>
  )
}
