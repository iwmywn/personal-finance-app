"use client"

import { useExtracted } from "next-intl"

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

export function QuickStats() {
  const { transactions } = useTransactions()
  const { user } = useUser()
  const t = useExtracted()
  const { getCategoryLabel } = useCategory()
  const formatCurrency = useFormatCurrency()

  const {
    currentMonthCount,
    highestTransaction,
    lowestTransaction,
    avgOutflow,
    savingsRate,
    popularCategory,
  } = calculateQuickStats(transactions, undefined, user.currency as Currency)

  return (
    <Card className="overflow-hidden py-0 pb-6">
      <CardHeader className="bg-card sticky top-0 pt-6">
        <CardTitle>{t("Quick Stats")}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-y-auto" suppressHydrationWarning>
        <div className="quick-stats-content space-y-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="row">
                <div className="left">{t("Total Transactions")}:</div>
                <div className="right">{currentMonthCount}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {t("Total number of inflow and outflow transactions.")}
            </TooltipContent>
          </Tooltip>

          <Separator />

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="row">
                <div className="left">{t("Highest Transaction")}:</div>
                <div
                  className={`right ${
                    highestTransaction !== null
                      ? highestTransaction.type === "inflow"
                        ? "text-green-600"
                        : "text-red-600"
                      : ""
                  }`}
                >
                  {highestTransaction !== null
                    ? `${highestTransaction.type === "inflow" ? "+" : "-"}${formatCurrency(highestTransaction.amount, highestTransaction.currency)}`
                    : t("No data")}
                </div>
              </div>
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
              <div className="row">
                <div className="left">{t("Lowest Transaction")}:</div>
                <div
                  className={`right ${
                    lowestTransaction !== null
                      ? lowestTransaction.type === "inflow"
                        ? "text-green-600"
                        : "text-red-600"
                      : ""
                  }`}
                >
                  {lowestTransaction !== null
                    ? `${lowestTransaction.type === "inflow" ? "+" : "-"}${formatCurrency(lowestTransaction.amount, lowestTransaction.currency)}`
                    : t("No data")}
                </div>
              </div>
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
              <div className="row">
                <div className="left">{t("Average Outflow")}:</div>
                <div className="right">
                  {avgOutflow !== null
                    ? formatCurrency(avgOutflow)
                    : t("No data")}
                </div>
              </div>
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
              <div className="row">
                <div className="left">{t("Savings Rate")}:</div>
                <div
                  className={`right ${
                    savingsRate !== null
                      ? parseFloat(savingsRate) > 0
                        ? "text-green-600"
                        : parseFloat(savingsRate) < 0
                          ? "text-red-600"
                          : ""
                      : ""
                  } `}
                >
                  {savingsRate !== null ? `${savingsRate}%` : t("No data")}
                </div>
              </div>
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
              <div className="row">
                <div className="left">{t("Popular Expense Category")}:</div>
                <div className="right">
                  {popularCategory.length > 0
                    ? popularCategory
                        .map((key) => getCategoryLabel(key))
                        .join(", ")
                    : t("No data")}
                </div>
              </div>
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
