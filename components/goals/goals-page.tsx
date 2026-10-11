"use client"

import { useState } from "react"
import { useExtracted } from "next-intl"

import { Button } from "@/components/ui/button"
import { GoalFilters } from "@/components/goals/goal-filters"
import { GoalForm } from "@/components/goals/goal-form"

export default function GoalsPage() {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const t = useExtracted()

  return (
    <>
      <div className="page-content">
        <div className="header">
          <div>
            <div className="title">{t("Goals")}</div>
            <div className="description">
              {t("Set and track your financial goals.")}
            </div>
          </div>
          <Button onClick={() => setIsOpen(true)}>{t("Add")}</Button>
        </div>

        <GoalFilters />
      </div>

      <GoalForm isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  )
}
