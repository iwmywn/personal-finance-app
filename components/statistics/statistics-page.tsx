"use client"

import { useExtracted } from "next-intl"

import { PageLayout } from "@/components/layout/page-layout"
import { StatisticsFilters } from "@/components/statistics/statistics-filters"

export default function StatisticsPage() {
  const t = useExtracted()

  return (
    <PageLayout
      title={t("Statistics")}
      description={t("View your financial statistics.")}
    >
      <StatisticsFilters />
    </PageLayout>
  )
}
