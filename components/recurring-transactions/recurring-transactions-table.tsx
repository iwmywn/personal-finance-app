"use client"

import { useState } from "react"
import { MoreVerticalIcon, RepeatIcon } from "lucide-react"
import { useExtracted } from "next-intl"

import { getNextDate } from "@/app/api/(cronjobs)/recurring-transactions/utils"
import { EmptyState } from "@/components/empty-state"
import { DeleteRecurringTransaction } from "@/components/recurring-transactions/delete-recurring-transaction"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRecurring } from "@/contexts/recurring-context"
import { useCategory } from "@/hooks/use-category"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { useFormatDate } from "@/hooks/use-format-date"
import { localDateToUTCMidnight } from "@/lib/date"
import type { RecurringTransaction } from "@/lib/definitions"

interface RecurringTableProps {
  filteredRecurring: RecurringTransaction[]
}

export function RecurringTransactionsTable({
  filteredRecurring,
}: RecurringTableProps) {
  const { recurringTransactions } = useRecurring()
  const [selectedRecurring, setSelectedRecurring] =
    useState<RecurringTransaction | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false)
  const t = useExtracted()
  const { getCategoryLabel, getCategoryDescription } = useCategory()
  const formatDate = useFormatDate()
  const formatCurrency = useFormatCurrency()
  const [todayUTC] = useState(() => localDateToUTCMidnight(new Date()))

  const getFrequencyLabel = (frequency: RecurringTransaction["frequency"]) => {
    switch (frequency) {
      case "daily":
        return t("Daily")
      case "weekly":
        return t("Weekly")
      case "bi-weekly":
        return t("Bi-Weekly")
      case "monthly":
        return t("Monthly")
      case "quarterly":
        return t("Quarterly")
      case "yearly":
        return t("Yearly")
      case "random":
        return t("Random")
      default:
        return frequency
    }
  }

  return (
    <>
      <Card>
        <CardContent>
          {filteredRecurring.length === 0 ? (
            <EmptyState
              icon={<RepeatIcon />}
              title={t("No recurring transactions found")}
              description={
                recurringTransactions.length === 0
                  ? t("You haven't created any recurring transactions yet.")
                  : t("No recurring transactions found matching your filters.")
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="[&>th]:text-center">
                  <TableHead>{t("Start Date")}</TableHead>
                  <TableHead>{t("End Date")}</TableHead>
                  <TableHead>{t("Description")}</TableHead>
                  <TableHead>{t("Type")}</TableHead>
                  <TableHead>{t("Category")}</TableHead>
                  <TableHead>{t("Amount")}</TableHead>
                  <TableHead>{t("Frequency")}</TableHead>
                  <TableHead>{t("Status")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecurring.map((recurring) => {
                  const isUpcoming = Boolean(
                    recurring.startDate &&
                    new Date(recurring.startDate) > todayUTC
                  )
                  const isEnded = Boolean(
                    recurring.endDate && todayUTC > new Date(recurring.endDate)
                  )

                  const nextDate = getNextDate(recurring, todayUTC)

                  return (
                    <TableRow
                      key={recurring._id}
                      className="[&>td]:text-center"
                    >
                      <TableCell>{formatDate(recurring.startDate)}</TableCell>
                      <TableCell>
                        {recurring.endDate
                          ? formatDate(recurring.endDate)
                          : t("No end date")}
                      </TableCell>
                      <TableCell>{recurring.description}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            recurring.type === "inflow"
                              ? "badge-green"
                              : "badge-red"
                          }
                        >
                          {recurring.type === "inflow"
                            ? t("Inflow")
                            : t("Outflow")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline">
                              {getCategoryLabel(recurring.categoryKey)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {getCategoryDescription(recurring.categoryKey)}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(recurring.amount, recurring.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span>{getFrequencyLabel(recurring.frequency)}</span>
                          {recurring.frequency === "random" ? (
                            <span className="text-xs text-secondary">
                              {t("Every {days} days", {
                                days:
                                  recurring.randomEveryXDays?.toString() ?? "—",
                              })}
                            </span>
                          ) : null}
                          {!isEnded && nextDate ? (
                            <span className="text-xs text-secondary">
                              {t("Next: {date}", {
                                date: formatDate(nextDate),
                              })}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            isEnded
                              ? "badge-gray"
                              : isUpcoming
                                ? "badge-yellow"
                                : "badge-green"
                          }
                        >
                          {isEnded
                            ? t("Inactive")
                            : isUpcoming
                              ? t("Upcoming")
                              : t("Active")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVerticalIcon />
                              <span className="sr-only">{t("Open menu")}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                setSelectedRecurring(recurring)
                                setIsDeleteOpen(true)
                              }}
                            >
                              {t("Delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedRecurring && (
        <DeleteRecurringTransaction
          key={selectedRecurring._id + "DeleteRecurringTransaction"}
          recurringId={selectedRecurring._id}
          isOpen={isDeleteOpen}
          setIsOpen={setIsDeleteOpen}
        />
      )}
    </>
  )
}
