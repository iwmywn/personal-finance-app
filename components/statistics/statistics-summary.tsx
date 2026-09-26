"use client"

import {
  ActivityIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react"
import { useExtracted } from "next-intl"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useUser } from "@/contexts/user-context"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import type { Currency } from "@/lib/currency"
import type { Transaction } from "@/lib/definitions"
import { calculateSummaryStats } from "@/lib/statistics"
import { toDecimal } from "@/lib/utils"

interface StatisticsSummaryProps {
  filteredTransactions: Transaction[]
}

export function StatisticsSummary({
  filteredTransactions,
}: StatisticsSummaryProps) {
  const t = useExtracted()
  const { user } = useUser()
  const formatCurrency = useFormatCurrency()
  const {
    totalInflow,
    totalOutflow,
    balance,
    transactionCount,
    inflowCount,
    outflowCount,
  } = calculateSummaryStats(filteredTransactions, user.currency as Currency)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{t("Total Inflow")}</CardTitle>
          <ArrowUpIcon className="size-4 text-green-600" />
        </CardHeader>
        <CardContent suppressHydrationWarning>
          <div className="text-2xl wrap-anywhere text-green-600">
            {formatCurrency(totalInflow)}
          </div>
          <div className="text-muted-foreground text-sm">
            {inflowCount} {t("transactions")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{t("Total Outflow")}</CardTitle>
          <ArrowDownIcon className="size-4 text-red-600" />
        </CardHeader>
        <CardContent suppressHydrationWarning>
          <div className="text-2xl wrap-anywhere text-red-600">
            {formatCurrency(totalOutflow)}
          </div>
          <div className="text-muted-foreground text-sm">
            {outflowCount} {t("transactions")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{t("Balance")}</CardTitle>
          {toDecimal(balance).greaterThanOrEqualTo(0) ? (
            <TrendingUpIcon className="size-4 text-green-600" />
          ) : (
            <TrendingDownIcon className="size-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent suppressHydrationWarning>
          <div
            className={`text-2xl wrap-anywhere ${
              toDecimal(balance).greaterThan(0)
                ? "text-green-600"
                : toDecimal(balance).lessThan(0)
                  ? "text-red-600"
                  : ""
            }`}
          >
            {formatCurrency(balance)}
          </div>
          <div className="text-muted-foreground text-sm">
            {toDecimal(balance).greaterThan(0)
              ? t("Positive")
              : toDecimal(balance).lessThan(0)
                ? t("Negative")
                : t("Balanced")}{" "}
            {t("compared to inflow")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{t("Total Transactions")}</CardTitle>
          <ActivityIcon className="size-4 text-blue-600" />
        </CardHeader>
        <CardContent suppressHydrationWarning>
          <div className="text-2xl wrap-anywhere text-blue-600">
            {transactionCount}
          </div>
          <div className="text-muted-foreground text-sm">
            {t("Total number of transactions")}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
