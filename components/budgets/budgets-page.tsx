"use client"

import { useState } from "react"
import { useExtracted } from "next-intl"

import { Button } from "@/components/ui/button"
import { BudgetFilters } from "@/components/budgets/budget-filters"
import { BudgetForm } from "@/components/budgets/budget-form"

export default function BudgetsPage() {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const t = useExtracted()

  return (
    <>
      <div className="page-content">
        <div className="header">
          <div>
            <div className="title">{t("Budgets")}</div>
            <div className="description">
              {t("Set and manage budgets for your outflow categories.")}
            </div>
          </div>
          <Button onClick={() => setIsOpen(true)}>{t("Add")}</Button>
        </div>

        <BudgetFilters />
      </div>

      <BudgetForm isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  )
}
