"use client"

import { useState } from "react"
import { useExtracted } from "next-intl"

import { Button } from "@/components/ui/button"
import { PageLayout } from "@/components/layout/page-layout"
import { TransactionFilters } from "@/components/transactions/transaction-filters"
import { TransactionForm } from "@/components/transactions/transaction-form"

export default function TransactionsPage() {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const t = useExtracted()

  return (
    <>
      <PageLayout
        title={t("Transactions")}
        description={t(
          "Manage cash inflows and outflows to track your personal finances."
        )}
        action={<Button onClick={() => setIsOpen(true)}>{t("Add")}</Button>}
      >
        <TransactionFilters />
      </PageLayout>

      <TransactionForm isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  )
}
