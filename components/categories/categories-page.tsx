"use client"

import { useState } from "react"
import { useExtracted } from "next-intl"

import { Button } from "@/components/ui/button"
import { CategoryFilters } from "@/components/categories/category-filters"
import { CategoryForm } from "@/components/categories/category-form"

export default function CategoriesPage() {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const t = useExtracted()

  return (
    <>
      <div className="page-content">
        <div className="header">
          <div>
            <div className="title">{t("Categories")}</div>
            <div className="description">
              {t("Manage your custom categories.")}
            </div>
          </div>
          <Button onClick={() => setIsOpen(true)}>{t("Add")}</Button>
        </div>

        <CategoryFilters />
      </div>

      <CategoryForm isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  )
}
