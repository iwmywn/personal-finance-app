"use client"

import {
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

interface TransactionSummaryProps {
  summary: PeriodSummaryValuation
}

export function TransactionSummary({ summary }: TransactionSummaryProps) {
  const t = useExtracted()
  const formatCurrency = useFormatCurrency()

  return (
    <div className="space-y-3">
      <UnconvertedTransactionsAlert
        hasUnconverted={summary.unconvertedCount > 0}
      />
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          title={t("Monthly Inflow")}
          icon={<ArrowUpIcon className="size-4 text-green" />}
          value={formatCurrency(summary.totalInflow.toString())}
          valueClassName="text-green"
          description={`${summary.inflowCount} ${t("transactions")}`}
        />

        <SummaryCard
          title={t("Monthly Outflow")}
          icon={<ArrowDownIcon className="size-4 text-red" />}
          value={formatCurrency(summary.totalOutflow.toString())}
          valueClassName="text-red"
          description={`${summary.outflowCount} ${t("transactions")}`}
        />

        <SummaryCard
          title={t("Monthly Balance")}
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
      </div>
    </div>
  )
}
