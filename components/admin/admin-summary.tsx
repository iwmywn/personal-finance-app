"use client"

import {
  ShieldAlertIcon,
  UserCheckIcon,
  UsersIcon,
  UserXIcon,
} from "lucide-react"
import { useExtracted } from "next-intl"

import type { AdminStats } from "@/actions/admin.actions"
import { SummaryCard } from "@/components/summary-card"

interface AdminSummaryProps {
  stats: AdminStats
}

export function AdminSummary({ stats }: AdminSummaryProps) {
  const t = useExtracted()

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        title={t("Total Users")}
        icon={<UsersIcon className="text-secondary size-4" />}
        value={stats.totalUsers.toLocaleString()}
        valueClassName="text-primary"
        description={t("Registered accounts")}
      />

      <SummaryCard
        title={t("Active Users")}
        icon={<UserCheckIcon className="text-green size-4" />}
        value={stats.activeUsers.toLocaleString()}
        valueClassName="text-green"
        description={t("Unrestricted access")}
      />

      <SummaryCard
        title={t("Banned Users")}
        icon={<UserXIcon className="text-red size-4" />}
        value={stats.bannedUsers.toLocaleString()}
        valueClassName="text-red"
        description={t("Suspended accounts")}
      />

      <SummaryCard
        title={t("Administrators")}
        icon={<ShieldAlertIcon className="text-primary size-4" />}
        value={stats.adminUsers.toLocaleString()}
        valueClassName="text-primary"
        description={t("Full system privileges")}
      />
    </div>
  )
}
