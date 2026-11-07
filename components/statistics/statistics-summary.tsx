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
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { getBalanceColorClass } from "@/lib/utils"
import type { PeriodSummaryValuation } from "@/lib/valuation-engine"

interface StatisticsSummaryProps {
  summary: PeriodSummaryValuation
}

export function StatisticsSummary({ summary }: StatisticsSummaryProps) {
  const t = useExtracted()
  const formatCurrency = useFormatCurrency()

  return (
    <div className="space-y-3">
      <UnconvertedTransactionsAlert
        hasUnconverted={summary.unconvertedCount > 0}
      />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title={t("Total Inflow")}
          icon={<ArrowUpIcon className="size-4 text-green" />}
          value={formatCurrency(summary.totalInflow.toString())}
          valueClassName="text-green"
          description={`${summary.inflowCount} ${t("transactions")}`}
        />

        <SummaryCard
          title={t("Total Outflow")}
          icon={<ArrowDownIcon className="size-4 text-red" />}
          value={formatCurrency(summary.totalOutflow.toString())}
          valueClassName="text-red"
          description={`${summary.outflowCount} ${t("transactions")}`}
        />

        <SummaryCard
          title={t("Balance")}
          icon={
            summary.balance.greaterThanOrEqualTo(0) ? (
              <TrendingUpIcon className="size-4 text-green" />
            ) : (
              <TrendingDownIcon className="size-4 text-red" />
            )
          }
          value={formatCurrency(summary.balance.toString())}
          valueClassName={getBalanceColorClass(summary.balance)}
          description={`${
            summary.balance.greaterThan(0)
              ? t("Positive")
              : summary.balance.lessThan(0)
                ? t("Negative")
                : t("Balanced")
          } ${t("compared to inflow")}`}
        />

        <SummaryCard
          title={t("Total Transactions")}
          icon={<ActivityIcon className="size-4 text-blue" />}
          value={
            <>
              {summary.transactionCount}
              {summary.unconvertedCount > 0 && (
                <span className="text-xs font-normal text-secondary">
                  {" "}
                  (+{summary.unconvertedCount})
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
