"use client"

import * as React from "react"
import { cn } from "cn"
import { useExtracted, useTimeZone } from "next-intl"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTransactions } from "@/contexts/transactions-context"
import { useUser } from "@/contexts/user-context"
import { useCategory } from "@/hooks/use-category"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import type { Currency } from "@/lib/currency"
import { calculateQuickStats } from "@/lib/statistics"
import { getBalanceColorClass, getFlowColorClass } from "@/lib/utils"

export function QuickStats() {
  const { transactions } = useTransactions()
  const { user } = useUser()
  const t = useExtracted()
  const { getCategoryLabel } = useCategory()
  const formatCurrency = useFormatCurrency()
  const timeZone = useTimeZone()

  const {
    currentMonthCount,
    unconvertedCount,
    highestTransaction,
    lowestTransaction,
    avgOutflow,
    savingsRate,
    popularCategory,
  } = calculateQuickStats(
    transactions,
    undefined,
    user.currency as Currency,
    timeZone
  )

  return (
    <Card>
      <CardHeader className="sticky top-0 z-10 border-b">
        <CardTitle className="text-sm tracking-wider uppercase">
          {t("Quick Stats")}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-y-auto">
        <div className="space-y-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <QuickStatsRow
                title={<>{t("Total Transactions")}:</>}
                value={
                  <>
                    {currentMonthCount}
                    {unconvertedCount > 0 && (
                      <span className="text-secondary text-xs">
                        {" "}
                        (+{unconvertedCount})
                      </span>
                    )}
                  </>
                }
              />
            </TooltipTrigger>
            <TooltipContent>
              {t("Total number of inflow and outflow transactions.")}
            </TooltipContent>
          </Tooltip>

          <Separator />

          <Tooltip>
            <TooltipTrigger asChild>
              <QuickStatsRow
                title={<>{t("Highest Transaction")}:</>}
                value={
                  highestTransaction !== null
                    ? `${highestTransaction.type === "inflow" ? "+" : "-"}${formatCurrency(highestTransaction.amount, highestTransaction.currency)}`
                    : t("No data")
                }
                valueClassName={
                  highestTransaction
                    ? getFlowColorClass(highestTransaction.type)
                    : undefined
                }
              />
            </TooltipTrigger>
            <TooltipContent>
              {t(
                "Transaction with the highest value in the month (can be inflow or outflow)."
              )}
            </TooltipContent>
          </Tooltip>

          <Separator />

          <Tooltip>
            <TooltipTrigger asChild>
              <QuickStatsRow
                title={<>{t("Lowest Transaction")}:</>}
                value={
                  lowestTransaction !== null
                    ? `${lowestTransaction.type === "inflow" ? "+" : "-"}${formatCurrency(lowestTransaction.amount, lowestTransaction.currency)}`
                    : t("No data")
                }
                valueClassName={
                  lowestTransaction
                    ? getFlowColorClass(lowestTransaction.type)
                    : undefined
                }
              />
            </TooltipTrigger>
            <TooltipContent>
              {t(
                "Transaction with the lowest value in the month (can be inflow or outflow)."
              )}
            </TooltipContent>
          </Tooltip>

          <Separator />

          <Tooltip>
            <TooltipTrigger asChild>
              <QuickStatsRow
                title={<>{t("Average Outflow")}:</>}
                value={
                  avgOutflow !== null
                    ? formatCurrency(avgOutflow)
                    : t("No data")
                }
              />
            </TooltipTrigger>
            <TooltipContent>
              {t(
                "Average amount per outflow (Total Outflow / Number of outflow transactions)."
              )}
            </TooltipContent>
          </Tooltip>

          <Separator />

          <Tooltip>
            <TooltipTrigger asChild>
              <QuickStatsRow
                title={<>{t("Savings Rate")}:</>}
                value={savingsRate !== null ? `${savingsRate}%` : t("No data")}
                valueClassName={
                  savingsRate !== null
                    ? getBalanceColorClass(savingsRate)
                    : undefined
                }
              />
            </TooltipTrigger>
            <TooltipContent>
              {t(
                "The percentage of money you save compared to inflow ((Inflow - Outflow) / Inflow × 100%)."
              )}
            </TooltipContent>
          </Tooltip>

          <Separator />

          <Tooltip>
            <TooltipTrigger asChild>
              <QuickStatsRow
                title={<>{t("Popular Expense Category")}:</>}
                value={
                  popularCategory.length > 0
                    ? popularCategory
                        .map((key) => getCategoryLabel(key))
                        .join(", ")
                    : t("No data")
                }
              />
            </TooltipTrigger>
            <TooltipContent>
              {t(
                "Outflow category with the highest total amount in the month."
              )}
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  )
}

interface QuickStatsRowProps {
  title: React.ReactNode
  value: React.ReactNode
  valueClassName?: string
}

export function QuickStatsRow({
  title,
  value,
  valueClassName,
}: QuickStatsRowProps) {
  return (
    <div className="grid grid-cols-2 items-center py-1 text-sm">
      <div className="text-secondary text-xs tracking-wider uppercase">
        {title}
      </div>
      <div
        className={cn(
          "justify-self-end text-right text-sm wrap-anywhere",
          valueClassName
        )}
      >
        {value}
      </div>
    </div>
  )
}
