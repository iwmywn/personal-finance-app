"use client"

import { useState } from "react"
import { useExtracted } from "next-intl"

import { Button } from "@/components/ui/button"
import { TransactionFilters } from "@/components/transactions/transaction-filters"
import { TransactionForm } from "@/components/transactions/transaction-form"

export default function TransactionsPage() {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const t = useExtracted()

  return (
    <>
      <div className="page-content">
        <div className="header">
          <div>
            <div className="title">{t("Transactions")}</div>
            <div className="description">
              {t(
                "Manage cash inflows and outflows to track your personal finances."
              )}
            </div>
          </div>
          <Button onClick={() => setIsOpen(true)}>{t("Add")}</Button>
        </div>

        <TransactionFilters />
      </div>

      <TransactionForm isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  )
}
