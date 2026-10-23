"use client"

import { useState } from "react"
import { useExtracted } from "next-intl"

import { Button } from "@/components/ui/button"
import { CategoryFilters } from "@/components/categories/category-filters"
import { CategoryForm } from "@/components/categories/category-form"
import { PageLayout } from "@/components/layout/page-layout"

export default function CategoriesPage() {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const t = useExtracted()

  return (
    <>
      <PageLayout
        title={t("Categories")}
        description={t("Manage your custom categories.")}
        action={<Button onClick={() => setIsOpen(true)}>{t("Add")}</Button>}
      >
        <CategoryFilters />
      </PageLayout>

      <CategoryForm isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  )
}
