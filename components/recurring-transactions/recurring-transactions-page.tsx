"use client"

import { useState } from "react"
import { useExtracted } from "next-intl"

import { PageLayout } from "@/components/layout/page-layout"
import { RecurringTransactionFilters } from "@/components/recurring-transactions/recurring-transaction-filters"
import { RecurringTransactionForm } from "@/components/recurring-transactions/recurring-transaction-form"
import { Button } from "@/components/ui/button"

export default function RecurringTransactionsPage() {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const t = useExtracted()

  return (
    <>
      <PageLayout
        title={t("Recurring")}
        description={t("Manage your recurring transactions.")}
        action={<Button onClick={() => setIsOpen(true)}>{t("Add")}</Button>}
      >
        <RecurringTransactionFilters />
      </PageLayout>

      <RecurringTransactionForm isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  )
}
