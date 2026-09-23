"use client"

import { useMemo, useState } from "react"
import { MoreVerticalIcon, RepeatIcon } from "lucide-react"
import { useExtracted } from "next-intl"

import { getNextDate } from "@/app/api/(cronjobs)/recurring-transactions/utils"
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
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
import { DeleteRecurringTransaction } from "@/components/recurring-transactions/delete-recurring-transaction"
import { RecurringTransactionForm } from "@/components/recurring-transactions/recurring-transaction-form"
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
  const [isDuplicateOpen, setIsDuplicateOpen] = useState<boolean>(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false)
  const t = useExtracted()
  const { getCategoryLabel, getCategoryDescription } = useCategory()
  const formatDate = useFormatDate()
  const formatCurrency = useFormatCurrency()
  const todayUTC = useMemo(() => localDateToUTCMidnight(new Date()), [])

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
      <Card className="flex-1 overflow-auto">
        <CardContent className="h-full">
          {filteredRecurring.length === 0 ? (
            <Empty className="h-full border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RepeatIcon />
                </EmptyMedia>
                <EmptyTitle>{t("No recurring transactions found")}</EmptyTitle>
                <EmptyDescription>
                  {recurringTransactions.length === 0
                    ? t("You haven't created any recurring transactions yet.")
                    : t(
                        "No recurring transactions found matching your filters."
                      )}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="table-wrapper">
              <Table>
                <TableHeader className="bg-muted sticky top-0 z-1">
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
                    const isEnded = Boolean(
                      recurring.endDate &&
                      todayUTC > new Date(recurring.endDate)
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
                          {formatCurrency(recurring.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span>
                              {getFrequencyLabel(recurring.frequency)}
                            </span>
                            {recurring.frequency === "random" ? (
                              <span className="text-muted-foreground text-xs">
                                {t("Every {days} days", {
                                  days: recurring.randomEveryXDays!.toString(),
                                })}
                              </span>
                            ) : null}
                            {!isEnded && nextDate ? (
                              <span className="text-muted-foreground text-xs">
                                {t("Next: {date}", {
                                  date: formatDate(nextDate),
                                })}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={!isEnded ? "badge-green" : "badge-gray"}
                          >
                            {!isEnded ? t("Active") : t("Inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                className="dark:hover:bg-input/50"
                                variant="ghost"
                                size="icon"
                              >
                                <MoreVerticalIcon />
                                <span className="sr-only">
                                  {t("Open menu")}
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setSelectedRecurring(recurring)
                                  setIsDuplicateOpen(true)
                                }}
                              >
                                {t("Duplicate")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
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
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRecurring && (
        <>
          <RecurringTransactionForm
            key={selectedRecurring._id + "RecurringTransactionForm"}
            recurring={selectedRecurring}
            isOpen={isDuplicateOpen}
            setIsOpen={setIsDuplicateOpen}
          />
          <DeleteRecurringTransaction
            key={selectedRecurring._id + "DeleteRecurringTransaction"}
            recurringId={selectedRecurring._id}
            isOpen={isDeleteOpen}
            setIsOpen={setIsDeleteOpen}
          />
        </>
      )}
    </>
  )
}
