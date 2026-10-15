"use client"

import { useExtracted } from "next-intl"

import { StatisticsFilters } from "@/components/statistics/statistics-filters"

export default function StatisticsPage() {
  const t = useExtracted()

  return (
    <div className="page-content md:h-auto lg:h-[calc(100vh-4.375rem)]">
      <div className="header">
        <div>
          <div className="title">{t("Statistics")}</div>
          <div className="description">
            {t("View your financial statistics.")}
          </div>
        </div>
      </div>

      <StatisticsFilters />
    </div>
  )
}
