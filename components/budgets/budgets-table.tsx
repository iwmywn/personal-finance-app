"use client"

import { useState } from "react"
import Link from "next/link"
import { MoreVerticalIcon, PiggyBankIcon } from "lucide-react"
import { useExtracted } from "next-intl"

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
import { Progress } from "@/components/ui/progress"
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
import { BudgetForm } from "@/components/budgets/budget-form"
import { DeleteBudget } from "@/components/budgets/delete-budget"
import { useBudgets } from "@/contexts/budgets-context"
import { useTransactions } from "@/contexts/transactions-context"
import { useCategory } from "@/hooks/use-category"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { useFormatDate } from "@/hooks/use-format-date"
import { serializeUTCDate } from "@/lib/date"
import type { Budget } from "@/lib/definitions"
import { calculateBudgetsStats } from "@/lib/statistics"
import { toDecimal } from "@/lib/utils"

interface BudgetsTableProps {
  filteredBudgets: Budget[]
}

export function BudgetsTable({ filteredBudgets }: BudgetsTableProps) {
  const { budgets } = useBudgets()
  const { transactions } = useTransactions()
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false)
  const t = useExtracted()
  const { getCategoryLabel, getCategoryDescription } = useCategory()
  const formatDate = useFormatDate()
  const formatCurrency = useFormatCurrency()

  const budgetsWithSpent = calculateBudgetsStats(filteredBudgets, transactions)

  return (
    <>
      <Card className="flex-1 overflow-auto">
        <CardContent className="h-full">
          {filteredBudgets.length === 0 ? (
            <Empty className="h-full border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PiggyBankIcon />
                </EmptyMedia>
                <EmptyTitle>{t("No budgets found")}</EmptyTitle>
                <EmptyDescription>
                  {budgets.length === 0
                    ? t("You haven't created any budgets yet.")
                    : t("No budgets found matching your filters.")}
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
                    <TableHead>{t("Category")}</TableHead>
                    <TableHead>{t("Amount")}</TableHead>
                    <TableHead>{t("Spent")}</TableHead>
                    <TableHead>{t("Balance")}</TableHead>
                    <TableHead>{t("Status")}</TableHead>
                    <TableHead>{t("Progress")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetsWithSpent.map((budget) => (
                    <TableRow key={budget._id} className="[&>td]:text-center">
                      <TableCell suppressHydrationWarning>
                        {formatDate(budget.startDate)}
                      </TableCell>
                      <TableCell suppressHydrationWarning>
                        {formatDate(budget.endDate)}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline">
                              {getCategoryLabel(budget.categoryKey)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {getCategoryDescription(budget.categoryKey)}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(
                          budget.allocatedAmount,
                          budget.currency
                        )}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(budget.spent, budget.currency)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(
                          toDecimal(budget.allocatedAmount)
                            .minus(toDecimal(budget.spent))
                            .toString(),
                          budget.currency
                        )}
                      </TableCell>
                      <TableCell suppressHydrationWarning>
                        <Badge
                          className={
                            budget.status === "expired"
                              ? "badge-red"
                              : budget.status === "active"
                                ? "badge-green"
                                : "badge-yellow"
                          }
                        >
                          {budget.status === "expired"
                            ? t("Expired")
                            : budget.status === "active"
                              ? t("Active")
                              : t("Upcoming")}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-32" suppressHydrationWarning>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Progress
                              value={Math.min(100, budget.percentage)}
                              className={`flex-1 ${budget.progressColorClass}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            {budget.percentage.toFixed(1)}%
                          </TooltipContent>
                        </Tooltip>
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
                              <span className="sr-only">{t("Open menu")}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/transactions?from=${serializeUTCDate(budget.startDate)}&to=${serializeUTCDate(budget.endDate)}&type=outflow&category=${budget.categoryKey}`}
                                className="cursor-pointer"
                              >
                                {t("View")}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setSelectedBudget(budget)
                                setIsEditOpen(true)
                              }}
                            >
                              {t("Edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              variant="destructive"
                              onClick={() => {
                                setSelectedBudget(budget)
                                setIsDeleteOpen(true)
                              }}
                            >
                              {t("Delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedBudget && (
        <>
          <BudgetForm
            key={selectedBudget._id + "BudgetForm"}
            budget={selectedBudget}
            isOpen={isEditOpen}
            setIsOpen={setIsEditOpen}
          />
          <DeleteBudget
            key={selectedBudget._id + "DeleteBudget"}
            budgetId={selectedBudget._id}
            isOpen={isDeleteOpen}
            setIsOpen={setIsDeleteOpen}
          />
        </>
      )}
    </>
  )
}
