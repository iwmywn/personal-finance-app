"use client"

import { useState } from "react"
import { ChevronDownIcon } from "lucide-react"
import { useExtracted } from "next-intl"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatisticsSummary } from "@/components/statistics/statistics-summary"
import { StatisticsTable } from "@/components/statistics/statistics-table"
import { useTransactions } from "@/contexts/transactions-context"
import { useFormatDate } from "@/hooks/use-format-date"
import { useMonths } from "@/hooks/use-months"
import { getUniqueYears } from "@/lib/date"
import { filterTransactions } from "@/lib/filters"

export function StatisticsFilters() {
  const { transactions } = useTransactions()
  const t = useExtracted()
  const formatDate = useFormatDate()
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false)
  const [isDateRangeOpen, setIsDateRangeOpen] = useState<boolean>(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined,
  })
  const [filterMonth, setFilterMonth] = useState<string>("all")
  const [filterYear, setFilterYear] = useState<string>("all")

  const allMonths = useMonths()
  const allYears = getUniqueYears(transactions)

  const hasActiveFilters =
    selectedDate ||
    dateRange.from ||
    dateRange.to ||
    filterMonth !== "all" ||
    filterYear !== "all"

  const handleResetFilters = () => {
    setSelectedDate(undefined)
    setDateRange({ from: undefined, to: undefined })
    setFilterMonth("all")
    setFilterYear("all")
  }

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date)
    setDateRange({ from: undefined, to: undefined })
    setFilterMonth("all")
    setFilterYear("all")
    setIsDatePickerOpen(false)
  }

  const handleDateRangeChange = (range: {
    from: Date | undefined
    to: Date | undefined
  }) => {
    setDateRange(range)
    setSelectedDate(undefined)
    setFilterMonth("all")
    setFilterYear("all")
    setIsDateRangeOpen(false)
  }

  const handleMonthChange = (month: string) => {
    setFilterMonth(month)
    if (month !== "all") {
      setSelectedDate(undefined)
      setDateRange({ from: undefined, to: undefined })
    }
  }

  const handleYearChange = (year: string) => {
    setFilterYear(year)
    if (year !== "all") {
      setSelectedDate(undefined)
      setDateRange({ from: undefined, to: undefined })
    }
  }

  const filteredTransactions = filterTransactions(transactions, {
    selectedDate,
    dateRange,
    filterMonth,
    filterYear,
  })

  return (
    <>
      <Card>
        <CardContent>
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              hasActiveFilters
                ? "lg:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                : "lg:grid-cols-[1fr_1fr_1fr_1fr]"
            } gap-4`}
          >
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-between font-normal ${selectedDate && "border-primary!"}`}
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
                  className={`w-full justify-between font-normal ${dateRange.from && "border-primary!"}`}
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
                        setDateRange((prev) => ({
                          from: date,
                          to:
                            prev.to && date && date > prev.to
                              ? undefined
                              : prev.to,
                        }))
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

            <Select value={filterYear} onValueChange={handleYearChange}>
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

            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="sm:col-span-2 lg:col-span-1"
              >
                {t("Reset")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <StatisticsSummary filteredTransactions={filteredTransactions} />

      <StatisticsTable
        filteredTransactions={filteredTransactions}
        filterStates={{
          selectedDate,
          dateRange,
          filterMonth,
          filterYear,
        }}
      />
    </>
  )
}
