"use client"

import { useState } from "react"
import { useExtracted } from "next-intl"

import { Button } from "@/components/ui/button"
import { RecurringTransactionForm } from "@/components/recurring-transactions/recurring-transaction-form"
import { RecurringTransactionsFilters } from "@/components/recurring-transactions/recurring-transactions-filters"

export default function RecurringTransactionsPage() {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const t = useExtracted()

  return (
    <>
      <div className="page-content">
        <div className="header">
          <div>
            <div className="title">{t("Recurring")}</div>
            <div className="description">
              {t("Manage your recurring transactions.")}
            </div>
          </div>
          <Button onClick={() => setIsOpen(true)}>{t("Add")}</Button>
        </div>

        <RecurringTransactionsFilters />
      </div>

      <RecurringTransactionForm isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  )
}
