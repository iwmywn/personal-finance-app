"use client"

import {
  ActivityIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react"
import { useExtracted } from "next-intl"

import { SummaryCard } from "@/components/summary-card"
import { UnconvertedTransactionsAlert } from "@/components/transactions/unconverted-transactions-alert"
import { useUser } from "@/contexts/user-context"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import type { Currency } from "@/lib/currency"
import type { Transaction } from "@/lib/definitions"
import { calculateSummaryStats } from "@/lib/statistics"
import { getBalanceColorClass, toDecimal } from "@/lib/utils"

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
    unconvertedCount,
  } = calculateSummaryStats(filteredTransactions, user.currency as Currency)

  return (
    <div className="space-y-3">
      <UnconvertedTransactionsAlert transactions={filteredTransactions} />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title={t("Total Inflow")}
          icon={<ArrowUpIcon className="text-green size-4" />}
          value={formatCurrency(totalInflow)}
          valueClassName="text-green"
          description={`${inflowCount} ${t("transactions")}`}
        />

        <SummaryCard
          title={t("Total Outflow")}
          icon={<ArrowDownIcon className="text-red size-4" />}
          value={formatCurrency(totalOutflow)}
          valueClassName="text-red"
          description={`${outflowCount} ${t("transactions")}`}
        />

        <SummaryCard
          title={t("Balance")}
          icon={
            toDecimal(balance).greaterThanOrEqualTo(0) ? (
              <TrendingUpIcon className="text-green size-4" />
            ) : (
              <TrendingDownIcon className="text-red size-4" />
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

        <SummaryCard
          title={t("Total Transactions")}
          icon={<ActivityIcon className="text-blue size-4" />}
          value={
            <>
              {transactionCount}
              {unconvertedCount > 0 && (
                <span className="text-secondary text-xs font-normal">
                  {" "}
                  (+{unconvertedCount})
                </span>
              )}
            </>
          }
          valueClassName="text-blue"
          description={t("Total number of transactions")}
        />
      </div>
    </div>
  )
}
