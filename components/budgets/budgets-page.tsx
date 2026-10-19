"use client"

import { useState } from "react"
import { useExtracted } from "next-intl"

import { Button } from "@/components/ui/button"
import { BudgetFilters } from "@/components/budgets/budget-filters"
import { BudgetForm } from "@/components/budgets/budget-form"
import { PageLayout } from "@/components/layout/page-layout"

export default function BudgetsPage() {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const t = useExtracted()

  return (
    <>
      <PageLayout
        title={t("Budgets")}
        description={t("Set and manage budgets for your outflow categories.")}
        action={<Button onClick={() => setIsOpen(true)}>{t("Add")}</Button>}
      >
        <BudgetFilters />
      </PageLayout>

      <BudgetForm isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  )
}
