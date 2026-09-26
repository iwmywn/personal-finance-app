"use client"

import { Fragment } from "react"
import { WalletIcon } from "lucide-react"
import { useExtracted } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { useTransactions } from "@/contexts/transactions-context"
import { useCategory } from "@/hooks/use-category"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { useFormatDate } from "@/hooks/use-format-date"

export function RecentTransactions() {
  const { transactions } = useTransactions()
  const recentTransactions = transactions.slice(0, 10)
  const t = useExtracted()
  const { getCategoryLabel } = useCategory()
  const formatDate = useFormatDate()
  const formatCurrency = useFormatCurrency()

  return (
    <Card className="overflow-hidden py-0 pb-6">
      <CardHeader className="bg-card sticky top-0 pt-6">
        <CardTitle>{t("Recent Transactions")}</CardTitle>
      </CardHeader>
      <CardContent className="h-full max-h-90 overflow-y-auto md:max-h-none">
        <div className="h-full space-y-4">
          {recentTransactions.length === 0 ? (
            <Empty className="h-full border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <WalletIcon />
                </EmptyMedia>
                <EmptyTitle>{t("No transactions found")}</EmptyTitle>
                <EmptyDescription>
                  {t("You haven't created any transactions yet.")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            recentTransactions.map((transaction, index) => (
              <Fragment key={transaction._id}>
                <div className="flex items-center justify-between">
                  <div className="flex max-w-2/4 items-center space-x-3">
                    <div className="flex flex-col gap-1">
                      <Badge
                        className={
                          transaction.type === "inflow"
                            ? "badge-green"
                            : "badge-red"
                        }
                      >
                        {getCategoryLabel(transaction.categoryKey)}
                      </Badge>
                      <div className="text-sm wrap-anywhere">
                        {transaction.description}
                      </div>
                      <div
                        className="text-muted-foreground text-xs"
                        suppressHydrationWarning
                      >
                        {formatDate(transaction.date)}
                      </div>
                    </div>
                  </div>
                  <div
                    className="max-w-2/4 text-right"
                    suppressHydrationWarning
                  >
                    <div
                      className={`text-sm wrap-anywhere ${
                        transaction.type === "inflow"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.type === "inflow" ? "+" : "-"}
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </div>
                  </div>
                </div>

                {index !== recentTransactions.length - 1 && <Separator />}
              </Fragment>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
