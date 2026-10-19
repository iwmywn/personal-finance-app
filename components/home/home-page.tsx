"use client"

import { useState } from "react"
import { useExtracted } from "next-intl"

import { Button } from "@/components/ui/button"
import { QuickStats } from "@/components/home/quick-stats"
import { RecentTransactions } from "@/components/home/recent-transactions"
import { TransactionSummary } from "@/components/home/transaction-summary"
import { PageLayout } from "@/components/layout/page-layout"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { useUser } from "@/contexts/user-context"

export default function HomePage() {
  const { user } = useUser()
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const t = useExtracted()

  return (
    <>
      <PageLayout
        title={
          <>
            {t("Welcome back")}, {user.name}!
          </>
        }
        description={t(
          "Here's what's happening with your finances this month."
        )}
        action={<Button onClick={() => setIsOpen(true)}>{t("Add")}</Button>}
      >
        <TransactionSummary />

        <div className="grid gap-3 md:grid-cols-2">
          <RecentTransactions />
          <QuickStats />
        </div>
      </PageLayout>

      <TransactionForm isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  )
}
