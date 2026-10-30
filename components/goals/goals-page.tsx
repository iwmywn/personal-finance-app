"use client"

import { useState } from "react"
import { useExtracted } from "next-intl"

import { GoalFilters } from "@/components/goals/goal-filters"
import { GoalForm } from "@/components/goals/goal-form"
import { PageLayout } from "@/components/layout/page-layout"
import { Button } from "@/components/ui/button"

export default function GoalsPage() {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const t = useExtracted()

  return (
    <>
      <PageLayout
        title={t("Goals")}
        description={t("Set and track your financial goals.")}
        action={<Button onClick={() => setIsOpen(true)}>{t("Add")}</Button>}
      >
        <GoalFilters />
      </PageLayout>

      <GoalForm isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  )
}
