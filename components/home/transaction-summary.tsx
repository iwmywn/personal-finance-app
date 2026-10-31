"use client"

import {
  ArrowDownIcon,
  ArrowUpIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react"
import { useExtracted, useTimeZone } from "next-intl"

import { SummaryCard } from "@/components/summary-card"
import { UnconvertedTransactionsAlert } from "@/components/transactions/unconverted-transactions-alert"
import { useTransactions } from "@/contexts/transactions-context"
import { useUser } from "@/contexts/user-context"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import type { Currency } from "@/lib/currency"
import {
  calculateSummaryStats,
  getCurrentMonthTransactions,
} from "@/lib/statistics"
import { getBalanceColorClass, toDecimal } from "@/lib/utils"

export function TransactionSummary() {
  const { transactions } = useTransactions()
  const { user } = useUser()
  const t = useExtracted()
  const formatCurrency = useFormatCurrency()
  const timeZone = useTimeZone()

  const currentMonthTransactions = getCurrentMonthTransactions(
    transactions,
    undefined,
    timeZone
  )

  const { totalInflow, totalOutflow, balance, inflowCount, outflowCount } =
    calculateSummaryStats(currentMonthTransactions, user.currency as Currency)

  return (
    <div className="space-y-3">
      <UnconvertedTransactionsAlert transactions={currentMonthTransactions} />
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          title={t("Monthly Inflow")}
          icon={<ArrowUpIcon className="size-4 text-green" />}
          value={formatCurrency(totalInflow)}
          valueClassName="text-green"
          description={`${inflowCount} ${t("transactions")}`}
        />

        <SummaryCard
          title={t("Monthly Outflow")}
          icon={<ArrowDownIcon className="size-4 text-red" />}
          value={formatCurrency(totalOutflow)}
          valueClassName="text-red"
          description={`${outflowCount} ${t("transactions")}`}
        />

        <SummaryCard
          title={t("Monthly Balance")}
          icon={
            toDecimal(balance).greaterThanOrEqualTo(0) ? (
              <TrendingUpIcon className="size-4 text-green" />
            ) : (
              <TrendingDownIcon className="size-4 text-red" />
            )
          }
          value={formatCurrency(balance)}
          valueClassName={getBalanceColorClass(balance)}
          description={`${
            toDecimal(balance).greaterThan(0)
              ? t("Positive")
              : toDecimal(balance).lessThan(0)
                ? t("Negative")
                : t("Balanced")
          } ${t("compared to inflow")}`}
        />
      </div>
    </div>
  )
}
