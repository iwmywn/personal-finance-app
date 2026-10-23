"use client"

import type { Route } from "next"
import Link from "next/link"
import { MoreVerticalIcon, WalletIcon } from "lucide-react"
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
import { EmptyState } from "@/components/empty-state"
import { useTransactions } from "@/contexts/transactions-context"
import { useUser } from "@/contexts/user-context"
import { useCategory } from "@/hooks/use-category"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import type { Currency } from "@/lib/currency"
import { serializeLocalDate } from "@/lib/date"
import type { Transaction } from "@/lib/definitions"
import { calculateCategoriesStats } from "@/lib/statistics"
import { getFlowColorClass } from "@/lib/utils"

interface TransactionBreakdownTableProps {
  filteredTransactions: Transaction[]
  filterStates?: {
    selectedDate?: Date
    dateRange?: { from?: Date; to?: Date }
    filterMonth?: string
    filterYear?: string
  }
}

export function StatisticsTable({
  filteredTransactions,
  filterStates,
}: TransactionBreakdownTableProps) {
  const { transactions } = useTransactions()
  const { user } = useUser()
  const t = useExtracted()
  const { getCategoryLabel, getCategoryDescription } = useCategory()
  const formatCurrency = useFormatCurrency()

  const categoryStats = calculateCategoriesStats(
    filteredTransactions,
    user.currency as Currency
  )

  const getTransactionsHref = (stat: {
    type: string
    categoryKey: string
  }): Route => {
    const params = new URLSearchParams()
    if (filterStates?.selectedDate) {
      params.set("date", serializeLocalDate(filterStates.selectedDate))
    }
    if (filterStates?.dateRange?.from) {
      params.set("from", serializeLocalDate(filterStates.dateRange.from))
    }
    if (filterStates?.dateRange?.to) {
      params.set("to", serializeLocalDate(filterStates.dateRange.to))
    }
    if (filterStates?.filterMonth && filterStates.filterMonth !== "all") {
      params.set("month", filterStates.filterMonth)
    }
    if (filterStates?.filterYear && filterStates.filterYear !== "all") {
      params.set("year", filterStates.filterYear)
    }
    params.set("type", stat.type)
    params.set("category", stat.categoryKey)

    return `/transactions?${params.toString()}`
  }

  return (
    <Card>
      <CardContent>
        {filteredTransactions.length === 0 ? (
          <EmptyState
            icon={<WalletIcon />}
            title={t("No transactions found")}
            description={
              transactions.length === 0
                ? t("You haven't created any transactions yet.")
                : t("No transactions found matching your filters.")
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="[&>th]:text-center">
                <TableHead>{t("Category")}</TableHead>
                <TableHead>{t("Type")}</TableHead>
                <TableHead>{t("Transaction Count")}</TableHead>
                <TableHead>{t("Total Amount")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryStats.map((stat) => (
                <TableRow key={stat.categoryKey} className="[&>td]:text-center">
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline">
                          {getCategoryLabel(stat.categoryKey)}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {getCategoryDescription(stat.categoryKey)}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        stat.type === "inflow" ? "badge-green" : "badge-red"
                      }
                    >
                      {stat.type === "inflow" ? t("Inflow") : t("Outflow")}
                    </Badge>
                  </TableCell>
                  <TableCell>{stat.count}</TableCell>
                  <TableCell>
                    <span className={getFlowColorClass(stat.type)}>
                      {stat.type === "inflow" ? "+" : "-"}
                      {formatCurrency(stat.total)}
                    </span>
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
                        <DropdownMenuItem asChild>
                          <Link href={getTransactionsHref(stat)}>
                            {t("View")}
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
