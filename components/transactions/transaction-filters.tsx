"use client"

import { useMemo, useState } from "react"
import { ChevronDownIcon, SearchIcon, XIcon } from "lucide-react"
import { useExtracted } from "next-intl"
import { parseAsString, useQueryState } from "nuqs"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { TransactionsTable } from "@/components/transactions/transactions-table"
import { useTransactions } from "@/contexts/transactions-context"
import { useCategory } from "@/hooks/use-category"
import { useFormatDate } from "@/hooks/use-format-date"
import { useMonths } from "@/hooks/use-months"
import { parseAsLocalDate } from "@/lib/date"
import { filterTransactions } from "@/lib/filters"
import { getUniqueYears } from "@/lib/utils"

export function TransactionFilters() {
  const { transactions } = useTransactions()
  const t = useExtracted()
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false)
  const [isDateRangeOpen, setIsDateRangeOpen] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({ throttleMs: 500 })
  )
  const [selectedDateIso, setSelectedDateIso] = useQueryState(
    "date",
    parseAsLocalDate
  )
  const selectedDate = selectedDateIso || undefined

  const [dateRangeFromIso, setDateRangeFromIso] = useQueryState(
    "from",
    parseAsLocalDate
  )
  const [dateRangeToIso, setDateRangeToIso] = useQueryState(
    "to",
    parseAsLocalDate
  )
  const dateRange = useMemo(
    () => ({
      from: dateRangeFromIso || undefined,
      to: dateRangeToIso || undefined,
    }),
    [dateRangeFromIso, dateRangeToIso]
  )
  const setDateRange = (range: {
    from: Date | undefined
    to: Date | undefined
  }) => {
    setDateRangeFromIso(range.from || null)
    setDateRangeToIso(range.to || null)
  }

  const [filterMonth, setFilterMonth] = useQueryState(
    "month",
    parseAsString.withDefault("all")
  )
  const [filterYear, setFilterYear] = useQueryState(
    "year",
    parseAsString.withDefault("all")
  )
  const [filterTypeRaw, setFilterType] = useQueryState(
    "type",
    parseAsString.withDefault("all")
  )
  const filterType = filterTypeRaw as "all" | "inflow" | "outflow"
  const [filterCategoryKey, setFilterCategoryKey] = useQueryState(
    "category",
    parseAsString.withDefault("all")
  )
  const formatDate = useFormatDate()
  const { getCategoriesByType } = useCategory()

  const allMonths = useMonths()
  const allYears = getUniqueYears(transactions)

  const hasActiveFilters =
    searchTerm !== "" ||
    selectedDate ||
    dateRange.from ||
    dateRange.to ||
    filterMonth !== "all" ||
    filterYear !== "all" ||
    filterType !== "all" ||
    filterCategoryKey !== "all"

  const handleResetFilters = () => {
    setSearchTerm(null)
    setSelectedDateIso(null)
    setDateRangeFromIso(null)
    setDateRangeToIso(null)
    setFilterMonth(null)
    setFilterYear(null)
    setFilterType(null)
    setFilterCategoryKey(null)
  }

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDateIso(date || null)
    setDateRangeFromIso(null)
    setDateRangeToIso(null)
    setFilterMonth(null)
    setFilterYear(null)
    setIsDatePickerOpen(false)
  }

  const handleDateRangeChange = (range: {
    from: Date | undefined
    to: Date | undefined
  }) => {
    setDateRangeFromIso(range.from || null)
    setDateRangeToIso(range.to || null)
    setSelectedDateIso(null)
    setFilterMonth(null)
    setFilterYear(null)
    setIsDateRangeOpen(false)
  }

  const handleMonthChange = (month: string) => {
    setFilterMonth(month)
    if (month !== "all") {
      setSelectedDateIso(null)
      setDateRangeFromIso(null)
      setDateRangeToIso(null)
    }
  }

  const handleYearChange = (year: string) => {
    setFilterYear(year)
    if (year !== "all") {
      setSelectedDateIso(null)
      setDateRangeFromIso(null)
      setDateRangeToIso(null)
    }
  }

  const handleTypeChange = (type: "all" | "inflow" | "outflow") => {
    setFilterType(type)
    if (type !== "all" && filterCategoryKey !== "all") {
      const allowedCategories = getCategoriesByType(type)
      if (!allowedCategories.some((c) => c.key === filterCategoryKey)) {
        setFilterCategoryKey("all")
      }
    }
  }

  const filteredTransactions = filterTransactions(transactions, {
    searchTerm,
    selectedDate,
    dateRange,
    filterMonth,
    filterYear,
    filterType,
    filterCategoryKey,
  })

  return (
    <>
      <Card>
        <CardContent>
          <div
            className={`grid md:grid-cols-[1fr_1fr] md:grid-rows-4 lg:grid-cols-[1fr_1fr_1fr] lg:grid-rows-3 2xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] 2xl:grid-rows-2 ${
              hasActiveFilters &&
              "md:grid-rows-5 lg:grid-rows-4 2xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto]"
            } gap-4`}
          >
            <InputGroup
              className={`col-span-full ${searchTerm !== "" && "border-primary"}`}
            >
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t("Search transactions...")}
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

            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-between font-normal md:row-start-2 ${selectedDate && "border-primary!"}`}
                >
                  {selectedDate ? formatDate(selectedDate) : t("Select Date")}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  autoFocus
                  mode="single"
                  selected={selectedDate}
                  captionLayout="dropdown"
                  onSelect={(date) => handleDateChange(date)}
                />
              </PopoverContent>
            </Popover>

            <Popover open={isDateRangeOpen} onOpenChange={setIsDateRangeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-between font-normal md:row-start-2 ${dateRange.from && "border-primary!"}`}
                >
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {formatDate(dateRange.from)} -{" "}
                        {formatDate(dateRange.to)}
                      </>
                    ) : (
                      formatDate(dateRange.from)
                    )
                  ) : (
                    t("Select Date Range")
                  )}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex flex-col pt-3 sm:flex-row">
                  <div>
                    <div className="text-center text-sm">{t("From")}</div>
                    <Calendar
                      autoFocus
                      mode="single"
                      selected={dateRange.from}
                      defaultMonth={dateRange.from}
                      captionLayout="dropdown"
                      onSelect={(date) => {
                        setDateRange({
                          from: date,
                          to:
                            dateRange.to && date && date > dateRange.to
                              ? undefined
                              : dateRange.to,
                        })
                      }}
                    />
                  </div>
                  <div>
                    <div className="text-center text-sm">{t("To")}</div>
                    <Calendar
                      autoFocus
                      mode="single"
                      selected={dateRange.to}
                      defaultMonth={dateRange.to}
                      captionLayout="dropdown"
                      onSelect={(date) => {
                        if (!date) return
                        if (!dateRange.from) {
                          setDateRange({
                            from: date,
                            to: undefined,
                          })
                          return
                        }
                        if (date < dateRange.from) {
                          handleDateRangeChange({
                            from: date,
                            to: dateRange.from,
                          })
                          return
                        }
                        handleDateRangeChange({
                          from: dateRange.from,
                          to: date,
                        })
                      }}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Select value={filterMonth} onValueChange={handleMonthChange}>
              <SelectTrigger
                className={`w-full md:row-start-3 lg:row-start-2 ${filterMonth !== "all" && "border-primary"}`}
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

            <Select value={filterYear} onValueChange={handleYearChange}>
              <SelectTrigger
                className={`w-full md:row-start-3 2xl:row-start-2 ${filterYear !== "all" && "border-primary"}`}
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

            <Select value={filterType} onValueChange={handleTypeChange}>
              <SelectTrigger
                className={`w-full md:row-start-4 lg:row-start-3 2xl:row-start-2 ${filterType !== "all" && "border-primary"}`}
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
                className={`w-full md:row-start-4 lg:row-start-3 2xl:row-start-2 ${filterCategoryKey !== "all" && "border-primary"}`}
              >
                <SelectValue placeholder={t("Category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{t("All Categories")}</SelectItem>
                  {filterType === "inflow" ? (
                    <>
                      <SelectSeparator />
                      {getCategoriesByType("inflow").map((category) => (
                        <SelectItem key={category.key} value={category.key}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </>
                  ) : filterType === "outflow" ? (
                    <>
                      <SelectSeparator />
                      {getCategoriesByType("outflow").map((category) => (
                        <SelectItem key={category.key} value={category.key}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="col-span-full 2xl:col-auto 2xl:row-start-2"
              >
                {t("Reset")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <TransactionsTable filteredTransactions={filteredTransactions} />
    </>
  )
}
