"use client"

import { useState } from "react"
import { useExtracted } from "next-intl"

import { Button } from "@/components/ui/button"
import { QuickStats } from "@/components/home/quick-stats"
import { RecentTransactions } from "@/components/home/recent-transactions"
import { TransactionSummary } from "@/components/home/transaction-summary"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { useUser } from "@/contexts/user-context"

export default function HomePage() {
  const { user } = useUser()
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const t = useExtracted()

  return (
    <>
      <div className="page-content grid grid-rows-[auto_auto_1fr]">
        <div className="header">
          <div>
            <div className="title">
              {t("Welcome back")}, {user.name}!
            </div>
            <div className="description">
              {t("Here's what's happening with your finances this month.")}
            </div>
          </div>
          <Button onClick={() => setIsOpen(true)}>{t("Add")}</Button>
        </div>

        <TransactionSummary />

        <div className="grid min-h-0 gap-4 md:grid-cols-2">
          <RecentTransactions />
          <QuickStats />
        </div>
      </div>

      <TransactionForm isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  )
}
